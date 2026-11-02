/** Source inventory only. Parsing code never imports the application or starts providers. */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { parse } from 'espree'

export const root = fileURLToPath(new URL('../../', import.meta.url))
const slash = value => value.replaceAll('\\', '/')
const hash = text => createHash('sha256').update(text).digest('hex')
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all'])

export function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (node.type) visit(node)
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'range', 'tokens', 'comments'].includes(key)) continue
    if (Array.isArray(value)) value.forEach(item => walk(item, visit))
    else if (value && typeof value === 'object') walk(value, visit)
  }
}

export function parseSource(text) {
  return parse(text, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    loc: true,
    ecmaFeatures: { jsx: true }
  })
}

async function files(directory) {
  const result = []
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (['__tests__', 'tests', 'test', 'node_modules', 'dist'].includes(entry.name)) continue
    const name = slash(path.join(directory, entry.name))
    if (entry.isDirectory()) result.push(...(await files(name)))
    else if (/\.(js|jsx|mjs)$/.test(name) && !/\.(test|spec)\./.test(name)) result.push(name)
  }
  return result.sort()
}

function literalPaths(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return [node.value]
  if (node?.type === 'ArrayExpression') return node.elements.flatMap(literalPaths)
  return []
}

function label(node) {
  if (node?.type === 'Identifier') return node.name
  if (node?.type === 'CallExpression') return `${label(node.callee)}()`
  if (node?.type === 'MemberExpression') return `${label(node.object)}.${node.property.name}`
  return node?.type || 'unknown'
}

function imports(ast, filename) {
  const result = new Map()
  for (const node of ast.body.filter(item => item.type === 'ImportDeclaration')) {
    if (!node.source.value.startsWith('.')) continue
    for (const specifier of node.specifiers) {
      result.set(
        specifier.local.name,
        slash(path.normalize(path.join(path.dirname(filename), node.source.value)))
      )
    }
  }
  return result
}

export async function buildInventory() {
  const nativeEntryFiles = (await readdir(path.join(root, 'cloudflare')))
    .filter(name => name.endsWith('.js') && !name.includes('.test.'))
    .map(name => `cloudflare/${name}`)
  const sourceNames = [
    ...(await files('services/api')),
    ...(await files('services/worker')),
    ...(await files('apps/web/src')),
    ...(await files('packages/shared')),
    ...(await files('cloudflare/api')),
    ...nativeEntryFiles
  ].sort()
  const sources = new Map()
  for (const name of sourceNames) {
    const text = await readFile(path.join(root, name), 'utf8')
    sources.set(name, { text, ast: parseSource(text) })
  }
  const routes = []
  function collect(filename, base = '', inherited = [], stack = []) {
    if (stack.includes(filename)) throw new Error('Cyclic route mounting requires manual review')
    const source = sources.get(filename)
    if (!source) throw new Error('Route source missing')
    const bindings = imports(source.ast, filename)
    const localGuards = []
    walk(source.ast, node => {
      if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return
      if (!['router', 'app'].includes(node.callee.object.name)) return
      const verb = node.callee.property.name
      if (verb === 'use') {
        const paths = literalPaths(node.arguments[0])
        const handlers = paths.length ? node.arguments.slice(1) : node.arguments
        const mounted = handlers.filter(
          item => bindings.has(item.name) && /routes\//.test(bindings.get(item.name))
        )
        if (!mounted.length && !paths.length) localGuards.push(...handlers.map(label))
        for (const handler of mounted) {
          const guards = handlers.filter(item => item !== handler).map(label)
          for (const prefix of paths.length ? paths : ['']) {
            collect(
              bindings.get(handler.name),
              `${base}${prefix}`,
              [...inherited, ...localGuards, ...guards],
              [...stack, filename]
            )
          }
        }
      } else if (methods.has(verb)) {
        const paths = literalPaths(node.arguments[0])
        if (!paths.length) throw new Error('Dynamic Express route requires manual review')
        for (const suffix of paths) {
          const route = `${base}${suffix === '/' ? '' : suffix}` || '/'
          routes.push({
            method: verb.toUpperCase(),
            path: route,
            source: filename,
            line: node.loc.start.line,
            middleware: [...inherited, ...localGuards],
            handlers: node.arguments.slice(1).map(label)
          })
        }
      }
    })
  }
  collect('services/api/routes/index.js')
  collect('services/api/routes/health.js')
  collect('services/api/utils/swagger.js')
  const grouped = new Map()
  for (const route of routes) {
    const canonical = route.path.replace(/^\/api\/v1(?=\/|$)/, '/api')
    const key = `${route.method} ${canonical}`
    if (!grouped.has(key))
      grouped.set(key, {
        method: route.method,
        path: canonical,
        aliases: [],
        sourceEvidence: [],
        nativeStatus: 'not-migrated',
        acceptance: 'not-verified'
      })
    const entry = grouped.get(key)
    if (!entry.aliases.includes(route.path)) entry.aliases.push(route.path)
    entry.sourceEvidence.push(route)
  }
  const native = JSON.parse(
    await readFile(path.join(root, 'cloudflare/readiness/native-evidence.json'), 'utf8')
  )
  const nativeEvidenceFiles = []
  for (const filename of [...new Set(native.routes.flatMap(entry => entry.evidence))].sort()) {
    nativeEvidenceFiles.push({
      name: filename,
      sha256: hash(await readFile(path.join(root, filename), 'utf8'))
    })
  }
  for (const entry of native.routes) {
    if (!['not-migrated', 'implemented-staging', 'partial-staging'].includes(entry.status))
      throw new Error('Unsupported native evidence status')
    const match = grouped.get(`${entry.method} ${entry.path}`)
    if (!match) throw new Error('Native evidence does not match a source route')
    match.nativeStatus = entry.status
    match.nativeEvidence = entry.evidence
    if (entry.limitations) match.nativeLimitations = entry.limitations
  }
  const frontendReferences = []
  const environmentReferences = new Map()
  const websocketPaths = []
  const scheduledTasks = []
  const queues = []
  for (const [filename, { ast }] of sources) {
    const requestMethods = new Map()
    if (filename.startsWith('apps/web/src/'))
      walk(ast, node => {
        if (!['CallExpression', 'NewExpression'].includes(node.type)) return
        const callee = label(node.callee)
        let method
        if (callee === 'WebSocket') method = 'WS'
        else if (/^(?:fetch|authFetch|fetchApiResponse)$/.test(callee)) {
          method =
            node.arguments[1]?.type === 'ObjectExpression'
              ? node.arguments[1].properties.find(
                  item => (item.key?.name || item.key?.value) === 'method'
                )?.value?.value || 'GET'
              : node.arguments.length < 2
                ? 'GET'
                : null
        } else if (
          node.callee.type === 'MemberExpression' &&
          methods.has(node.callee.property.name) &&
          node.callee.property.name !== 'all'
        ) {
          method = node.callee.property.name.toUpperCase()
        }
        if (node.arguments[0] && method)
          requestMethods.set(node.arguments[0].loc.start.line, method)
      })
    walk(ast, node => {
      if (
        node.type === 'MemberExpression' &&
        node.object.type === 'MemberExpression' &&
        node.object.object.name === 'process' &&
        node.object.property.name === 'env'
      ) {
        const name = node.computed ? node.property.value : node.property.name
        if (typeof name === 'string') {
          if (!environmentReferences.has(name)) environmentReferences.set(name, [])
          environmentReferences.get(name).push({ source: filename, line: node.loc.start.line })
        }
      }
      if (
        node.type === 'CallExpression' &&
        ['getRequired', 'getOptional', 'getInt', 'getBool'].includes(node.callee.name)
      ) {
        const name = node.arguments[0]?.value
        if (typeof name === 'string') {
          if (!environmentReferences.has(name)) environmentReferences.set(name, [])
          environmentReferences.get(name).push({ source: filename, line: node.loc.start.line })
        }
      }
      if (filename === 'services/api/cron/index.js' && node.type === 'ObjectExpression') {
        const value = Object.fromEntries(
          node.properties
            .filter(item => item.type === 'Property')
            .map(item => [item.key.name, item.value.value || item.value.name])
        )
        if (value.schedule)
          scheduledTasks.push({
            ...value,
            source: filename,
            line: node.loc.start.line,
            nativeStatus: 'not-migrated'
          })
      }
      if (
        filename === 'services/api/jobs/jobNames.js' &&
        node.type === 'Property' &&
        typeof node.value.value === 'string'
      ) {
        queues.push({
          name: node.value.value,
          source: filename,
          line: node.loc.start.line,
          nativeStatus: 'not-migrated'
        })
      }
      if (node.type !== 'Literal' && node.type !== 'TemplateLiteral') return
      const value =
        node.type === 'Literal'
          ? node.value
          : node.quasis.map(item => item.value.cooked).join('${dynamic}')
      if (typeof value !== 'string' || !value.includes('/api/')) return
      if (filename.startsWith('apps/web/src/')) {
        const pathname = value.slice(value.indexOf('/api/')).split('?')[0]
        const dynamic = pathname.includes('${dynamic}')
        const matching = dynamic
          ? []
          : [...grouped.values()].filter(entry =>
              entry.aliases.some(alias =>
                new RegExp(
                  `^${alias
                    .split('/')
                    .map(part =>
                      part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    )
                    .join('/')}$`
                ).test(pathname)
              )
            )
        frontendReferences.push({
          path: pathname,
          dynamic,
          source: filename,
          line: node.loc.start.line,
          method: requestMethods.get(node.loc.start.line) || null,
          matchingRoutes: matching.map(entry => `${entry.method} ${entry.path}`),
          review: dynamic
            ? 'resolve-dynamic-contract'
            : matching.length
              ? 'route-exists-check-method-and-shape'
              : 'unmatched-reference'
        })
      }
      if (filename === 'services/api/utils/serverSetup.js' && value.startsWith('/api/')) {
        websocketPaths.push({
          path: value,
          source: filename,
          line: node.loc.start.line,
          nativeStatus: 'not-migrated'
        })
      }
    })
  }
  for (const reference of frontendReferences.filter(item => !item.dynamic)) {
    if (websocketPaths.some(item => item.path === reference.path)) {
      reference.matchingRoutes = [`WS ${reference.path}`]
      reference.review = 'websocket-contract-required'
    } else if (reference.method) {
      reference.matchingRoutes = reference.matchingRoutes.filter(
        item => item.startsWith(`${reference.method} `) || item.startsWith('ALL ')
      )
      if (!reference.matchingRoutes.length) reference.review = 'unmatched-reference'
    }
  }
  const routeEntries = [...grouped.values()].sort((a, b) =>
    `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`)
  )
  return {
    formatVersion: 1,
    purpose: 'source inventory; implementation evidence is not deployed acceptance',
    coverage:
      'Explicit HTTP route registrations and mounted routers, Swagger prefix, source WebSocket upgrade paths, static frontend references, queue and schedule registries. Implicit Express HEAD, middleware-generated responses and unresolved dynamic callers need runtime acceptance.',
    productionReady: false,
    sourceFiles: [...sources].map(([name, source]) => ({ name, sha256: hash(source.text) })),
    summary: {
      routes: routeEntries.length,
      mountedHttpPaths: new Set(routes.map(item => `${item.method} ${item.path}`)).size,
      sourceRouteRegistrations: routes.length,
      nativeEvidenceRoutes: routeEntries.filter(entry => entry.nativeStatus !== 'not-migrated')
        .length,
      frontendReferences: frontendReferences.length,
      unmatchedStaticFrontendReferences: frontendReferences.filter(
        entry => entry.review === 'unmatched-reference'
      ).length
    },
    routes: routeEntries,
    nativeEvidenceFiles,
    frontendReferences,
    scheduledTasks,
    queues,
    websocketPaths,
    auxiliaryMounts: [
      {
        path: '/api/docs',
        source: 'services/api/utils/swagger.js',
        runtime: 'Swagger middleware; authenticateToken + requireAdmin in production',
        nativeStatus: 'not-migrated'
      }
    ],
    environmentReferences: [...environmentReferences]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, evidence]) => ({ name, evidence })),
    integrations: JSON.parse(
      await readFile(path.join(root, 'cloudflare/readiness/integrations.json'), 'utf8')
    )
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const inventory = await buildInventory()
    if (process.argv.includes('--write')) {
      await writeFile(
        path.join(root, 'cloudflare/readiness/route-parity.json'),
        JSON.stringify(inventory, null, 2) + '\n'
      )
    }
    console.log(JSON.stringify(inventory.summary, null, 2))
  } catch {
    console.error('Inventory failed: source grammar or reviewed evidence requires inspection.')
    process.exitCode = 1
  }
}
