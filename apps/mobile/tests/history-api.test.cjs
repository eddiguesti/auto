const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

function loadApi({ baseUrl, token = 'owner-one', fetch = globalThis.fetch }) {
  const context = vm.createContext({
    __DEV__: false,
    process: { env: { EXPO_PUBLIC_API_URL: baseUrl } },
    fetch,
    URL,
    Response,
    FormData,
    console
  })
  const secure = {
    getItemAsync: async () => token,
    setItemAsync: async (_key, value) => {
      token = value
    },
    deleteItemAsync: async () => {
      token = null
    }
  }
  function load(relative) {
    const file = path.join(__dirname, '..', 'src', relative)
    const javascript = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText
    const module = { exports: {} }
    const requireMock = name => {
      if (name === 'expo-secure-store') return secure
      if (name === '@react-native-async-storage/async-storage')
        return { getItem: async () => null, removeItem: async () => {} }
      if (name === '../data/chapters') return load('data/chapters.ts')
      throw new Error(`Unexpected mobile transport dependency: ${name}`)
    }
    vm.runInContext(`(function(require,module,exports){${javascript}\n})`, context, {
      filename: file
    })(requireMock, module, module.exports)
    return module.exports
  }
  return load('services/api.ts').default
}
const plain = value => JSON.parse(JSON.stringify(value))
const story = (id, answer, created_at, extra = {}) => ({
  id,
  user_id: 1,
  chapter_id: 'earliest-memories',
  question_id: 'birth-details',
  answer,
  created_at,
  ...extra
})

test('history transport reads authenticated owner stories, maps labels and canonical answers, and applies a stable descending limit', async () => {
  const calls = []
  const rows = [
    story(8, 'An older memory', '2026-01-01T00:00:00Z', { updated_at: '2026-12-01T00:00:00Z' }),
    story(3, 'The lower tied ID', '2026-10-01T00:00:00Z'),
    story(9, 'The higher tied ID', '2026-10-01T00:00:00Z', { question_id: 'voice-session' }),
    story(11, '  Keep my original spacing.  ', '2026-11-03T00:00:00Z', {
      original_answer: 'Old version',
      compiled_content: 'Unrelated compilation',
      audio_url: '/api/voice/uploads/owned-recording'
    }),
    story(12, 'The latest tied ID', '2026-11-03T00:00:00Z'),
    story(99, '   ', '2027-01-01T00:00:00Z')
  ]
  const server = http.createServer((request, response) => {
    calls.push({ url: request.url, authorization: request.headers.authorization })
    if (request.url !== '/api/stories/all' || !request.headers.authorization) {
      response.writeHead(404).end()
      return
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(
      JSON.stringify(
        request.headers.authorization === 'Bearer owner-two'
          ? [
              story(20, 'Only the second account', '2026-11-03T00:00:00Z', {
                user_id: 2,
                chapter_id: 'custom-chapter',
                question_id: 'custom-question'
              })
            ]
          : rows
      )
    )
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const api = loadApi({ baseUrl: `http://127.0.0.1:${server.address().port}/api` })
    const result = plain(await api.getMemories(3))
    assert.equal(result.success, true)
    assert.deepEqual(
      result.data.map(row => row.id),
      [12, 11, 9]
    )
    assert.equal(result.data[0].promptText, 'Where were you born?')
    assert.equal(result.data[0].collection, 'Earliest Memories')
    assert.equal(result.data[1].answer, '  Keep my original spacing.  ')
    assert.equal(result.data[1].createdAt, '2026-11-03T00:00:00.000Z')
    assert.equal(result.data[1].audioUrl, '/api/voice/uploads/owned-recording')
    assert.equal(result.data[2].promptText, 'Earliest Memories')
    assert.equal('user_id' in result.data[0], false)
    assert.equal(JSON.stringify(result).includes('Unrelated compilation'), false)
    const all = plain(await api.getMemories())
    assert.deepEqual(
      all.data.map(row => row.id),
      [12, 11, 9, 3, 8]
    )
    await api.setToken('owner-two')
    const second = plain(await api.getMemories())
    assert.deepEqual(
      second.data.map(row => row.answer),
      ['Only the second account']
    )
    assert.equal(second.data[0].promptText, 'Your memory')
    assert.equal('collection' in second.data[0], false)
    assert.deepEqual(calls, [
      { url: '/api/stories/all', authorization: 'Bearer owner-one' },
      { url: '/api/stories/all', authorization: 'Bearer owner-one' },
      { url: '/api/stories/all', authorization: 'Bearer owner-two' }
    ])
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})

test('invalid limits and missing identity fail before a history transport request', async () => {
  let calls = 0
  const fetch = async () => {
    calls++
    throw new Error('Unexpected network request')
  }
  const api = loadApi({ baseUrl: 'https://local.invalid/api', fetch })
  for (const limit of [0, -1, 101, 1.5, NaN, Infinity, '50', null])
    await assert.rejects(api.getMemories(limit), /integer between 1 and 100/)
  const anonymous = loadApi({ baseUrl: 'https://local.invalid/api', token: null, fetch })
  await assert.rejects(anonymous.getMemories(), /sign in/)
  assert.equal(calls, 0)
})

test('malformed or failed story responses are not presented as an empty successful history', async () => {
  let body,
    status = 200
  const api = loadApi({
    baseUrl: 'https://local.invalid/api',
    fetch: async () => new Response(JSON.stringify(body), { status })
  })
  for (const invalid of [
    { success: true, data: [] },
    [null],
    [story('1', 'Text', '2026-11-03')],
    [story(1, 42, '2026-11-03')]
  ]) {
    body = invalid
    await assert.rejects(api.getMemories(), /Invalid memory history response/)
  }
  body = [story(1, 'Text', 'not a date')]
  await assert.rejects(api.getMemories(), /Invalid memory history date/)
  body = { error: 'Token revoked' }
  status = 401
  await assert.rejects(api.getMemories(), /Token revoked/)
})
