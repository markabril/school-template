/**
 * One error class, carrying an HTTP status and a machine-readable code.
 * Services throw these; the error middleware is the only place that formats
 * a response. Nothing in a service should ever touch `res`.
 */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  /** Whether the message is safe to show a user. Unexpected errors are not. */
  readonly expose: boolean

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
    this.expose = status < 500
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'bad_request', message, details)

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'unauthorized', message)

/** Deliberately vague to the client. Do not include what was being accessed. */
export const forbidden = (message = 'Not permitted') => new AppError(403, 'forbidden', message)

export const notFound = (message = 'Not found') => new AppError(404, 'not_found', message)

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'conflict', message, details)

export const tooManyRequests = (message = 'Too many requests') =>
  new AppError(429, 'too_many_requests', message)
