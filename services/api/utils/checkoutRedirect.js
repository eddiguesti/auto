/** Return a canonical absolute redirect on the configured app origin. */
export function checkoutRedirectUrl(candidate, appUrl, fallbackPath) {
  const app = new URL(appUrl)
  if (!['http:', 'https:'].includes(app.protocol) || app.username || app.password) {
    throw new TypeError('APP_URL must be an HTTP(S) origin without credentials')
  }
  const fallback = new URL(fallbackPath, app.origin).href
  if (typeof candidate !== 'string' || !candidate) return fallback
  try {
    const destination = new URL(candidate)
    if (
      !['http:', 'https:'].includes(destination.protocol) ||
      destination.username ||
      destination.password ||
      destination.origin !== app.origin
    )
      return fallback
    return destination.href
  } catch {
    return fallback
  }
}
