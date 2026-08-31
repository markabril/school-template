import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { isProd } from '../env.js'

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } })
}

/**
 * The only place in the app that formats an error response. Services throw,
 * routes let it propagate, this decides what the client is told.
 *
 * The rule that matters: a 5xx never leaks its message. An unexpected error
 * can contain a file path, a SQL fragment, or a value from another user's row.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_failed',
        message: 'Some fields are invalid',
        fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    })
    return
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, path: req.path }, 'app error')
    else logger.warn({ code: err.code, path: req.path }, err.message)

    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.expose ? err.message : 'Something went wrong',
        ...(err.expose && err.details ? { details: err.details } : {}),
      },
    })
    return
  }

  logger.error({ err, path: req.path }, 'unhandled error')
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Something went wrong',
      ...(isProd ? {} : { debug: err instanceof Error ? err.message : String(err) }),
    },
  })
}
