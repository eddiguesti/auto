import { ApiError } from './errors.js'

const encoder = new TextEncoder()
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/
async function key(secret) {
  if (typeof secret !== 'string' || secret.length < 32)
    throw new ApiError(503, { error: 'Print download signing is not configured' })
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}
export async function nativePrintFileUrls(env, id, now = Date.now()) {
  const expires = now + 7 * 86400000
  const signingKey = await key(env.PRINT_FILE_SIGNING_SECRET)
  const base = new URL(env.PRINT_PUBLIC_API_URL)
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.pathname !== '/' ||
    base.search ||
    base.hash ||
    !UUID.test(id)
  )
    throw new ApiError(503, { error: 'Invalid print file configuration' })
  const urls = {}
  for (const type of ['text', 'cover']) {
    const signature = new Uint8Array(
      await crypto.subtle.sign('HMAC', signingKey, encoder.encode(`${id}:${type}:${expires}`))
    )
    const token = Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('')
    urls[type] = `${base.origin}/api/print-files/${id}/${type}?expires=${expires}&token=${token}`
  }
  return urls
}

export async function printPdfResponse(env, objectKey) {
  if (!env.MEDIA) throw new ApiError(503, { error: 'Print file storage unavailable' })
  const object = await env.MEDIA.get(objectKey)
  if (!object) throw new ApiError(404, { error: 'Print file not found' })
  if (object.httpMetadata?.contentType !== 'application/pdf')
    throw new ApiError(503, { error: 'Invalid print file metadata' })
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline; filename="memoir-proof.pdf"'
    }
  })
}

// Called before account authentication: only a narrowly scoped, expiring
// printer capability can authorize this route, never an account JWT in a URL.
export async function serveNativePrintFile({ request, env, db, path, now = Date.now() }) {
  const match = /^\/print-files\/([^/]+)\/(text|cover)$/.exec(path)
  if (!match || request.method !== 'GET') return null
  const [, id, type] = match,
    params = new URL(request.url).searchParams
  const expires = params.get('expires'),
    token = params.get('token')
  let valid = false
  if (
    UUID.test(id) &&
    /^\d{13}$/.test(expires || '') &&
    Number(expires) >= now &&
    Number(expires) <= now + 8 * 86400000 &&
    /^[a-f0-9]{64}$/.test(token || '')
  ) {
    const bytes = Uint8Array.from(token.match(/../g), value => parseInt(value, 16))
    valid = await crypto.subtle.verify(
      'HMAC',
      await key(env.PRINT_FILE_SIGNING_SECRET),
      bytes,
      encoder.encode(`${id}:${type}:${expires}`)
    )
  }
  if (!valid) throw new ApiError(403, { error: 'Print file link expired or invalid' })
  const row = await db
    .prepare(
      `SELECT o.text_key,o.cover_key FROM print_orders o JOIN users u ON u.id=o.user_id
    JOIN print_entitlements e ON e.id=o.entitlement_id AND e.user_id=o.user_id
    JOIN payments p ON p.stripe_session_id=e.stripe_session_id AND p.user_id=o.user_id AND p.status='completed'
    WHERE o.id=? AND o.approved_at IS NOT NULL AND u.deleted_at IS NULL`
    )
    .bind(id)
    .first()
  if (!row) throw new ApiError(404, { error: 'Print file not found' })
  return printPdfResponse(env, row[`${type}_key`])
}
