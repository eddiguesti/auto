export class ApiError extends Error {
  constructor(status, body) {
    super(body.error)
    this.status = status
    this.body = body
  }
}

export function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}
