export const CONNECTION_ERROR = 'Could not connect to Easy Memoir. Please try again.'
export const INCOMPLETE_RESPONSE = 'Easy Memoir returned an incomplete response. Please try again.'

export class ApiError extends Error {
  constructor(status, body, fallback = CONNECTION_ERROR) {
    const candidates = [
      body?.error?.message,
      body?.message,
      body?.error,
      typeof body === 'string' ? body : undefined
    ]
    const message = candidates.find(value => typeof value === 'string' && value.trim()) || fallback
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** Parse API data only. Download callers continue to own their blob/arrayBuffer response bodies. */
export async function readApiResponse(response, { expectJson = false } = {}) {
  let text
  try {
    text = await response.text()
  } catch {
    throw new ApiError(response.status, null)
  }
  const jsonResponse = expectJson || (response.headers.get('content-type') || '').includes('json')
  let body
  try {
    body = JSON.parse(text)
  } catch {
    if (!response.ok) throw new ApiError(response.status, null)
    if (jsonResponse) throw new ApiError(response.status, null, INCOMPLETE_RESPONSE)
    return text
  }
  if (!response.ok) throw new ApiError(response.status, body)
  return jsonResponse ? body : text
}

export async function fetchApiResponse(fetcher, url, options, parsingOptions) {
  let response
  try {
    response = await fetcher(url, options)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError(0, null)
  }
  return readApiResponse(response, parsingOptions)
}

export function assertAuthResponse(data) {
  if (
    !data?.user ||
    typeof data.user !== 'object' ||
    Array.isArray(data.user) ||
    typeof data.token !== 'string' ||
    !data.token.trim()
  ) {
    throw new ApiError(200, null, INCOMPLETE_RESPONSE)
  }
  return data
}
