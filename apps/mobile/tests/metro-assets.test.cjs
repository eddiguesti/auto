const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const { patchSource, ORIGINAL, PATCHED } = require('../scripts/patch-metro-image-size.cjs')

// Real 1x1 PNG, exercising both Metro's buffer API and its file-backed asset path.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WkAAAAASUVORK5CYII=',
  'base64'
)

test('actual Metro reads dimensions from buffers and filesystem-backed image assets with image-size 2', async () => {
  const metroRoot = path.dirname(require.resolve('metro/package.json'))
  const Assets = require(path.join(metroRoot, 'src', 'Assets.js'))
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'memoir-metro-'))
  try {
    const file = path.join(directory, 'memory.png')
    await fs.writeFile(file, png)
    assert.deepEqual(Assets.getAssetSize('png', png, file), { width: 1, height: 1 })
    const data = await Assets.getAssetData(file, 'memory.png', [], 'android', '/assets')
    assert.equal(data.width, 1)
    assert.equal(data.height, 1)
    assert.deepEqual(data.files, [file])
    assert.equal(data.type, 'png')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test('compatibility patch is idempotent and refuses unsupported versions or unexpected source', () => {
  const original = `prefix\n${ORIGINAL}\nsuffix`
  const patched = patchSource(original, '0.83.3', '2.0.4')
  assert.equal(patched, `prefix\n${PATCHED}\nsuffix`)
  assert.equal(patchSource(patched, '0.83.3', '2.0.4'), patched)
  assert.throws(() => patchSource(original, '0.84.0', '2.0.4'), /before upgrading/)
  assert.throws(() => patchSource(original, '0.83.3', '2.1.0'), /before upgrading/)
  assert.throws(() => patchSource('different Metro source', '0.83.3', '2.0.4'), /Unexpected Metro/)
  assert.throws(() => patchSource(original + ORIGINAL, '0.83.3', '2.0.4'), /Unexpected Metro/)
})
