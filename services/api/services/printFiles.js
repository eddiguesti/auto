import crypto from 'node:crypto'

export function printFileToken(id, type, expires, secret = process.env.PRINT_FILE_SIGNING_SECRET) {
  return crypto.createHmac('sha256', secret).update(`${id}:${type}:${expires}`).digest('hex')
}

export function verifyPrintFileToken(
  id,
  type,
  expires,
  token,
  secret = process.env.PRINT_FILE_SIGNING_SECRET
) {
  if (
    !secret ||
    !['text', 'cover'].includes(type) ||
    !/^\d+$/.test(String(expires)) ||
    Number(expires) < Date.now() ||
    Number(expires) > Date.now() + 8 * 86400000 ||
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    return false
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(printFileToken(id, type, expires, secret), 'hex')
  )
}

export function printFileUrls(id) {
  const expires = Date.now() + 7 * 86400000
  const base = process.env.PRINT_PUBLIC_API_URL.replace(/\/$/, '')
  return Object.fromEntries(
    ['text', 'cover'].map(type => [
      type,
      `${base}/api/print-files/${id}/${type}?expires=${expires}&token=${printFileToken(id, type, expires)}`
    ])
  )
}
