export function validateObjectKey(key) {
  if (
    typeof key !== 'string' ||
    !key ||
    !/^[a-zA-Z0-9._/-]+$/.test(key) ||
    key.split('/').some(segment => !segment || segment === '.' || segment.includes('..'))
  ) {
    throw new TypeError('Invalid media object key')
  }
  return key
}
