import bcrypt from 'bcryptjs'
import { ApiError } from './errors.js'

// bcryptjs uses WebCrypto getRandomValues in its browser build; browser bundlers
// disable its optional Node crypto fallback. Keep source bcrypt cost/hash format.
export function hashPassword(password) {
  return bcrypt.hash(password, 12)
}
export async function comparePassword(password, hash) {
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash || ''))
    throw new ApiError(503, { error: 'Stored password hash is unsupported' })
  return bcrypt.compare(password, hash)
}
