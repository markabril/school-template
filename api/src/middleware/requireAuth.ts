import type { RequestHandler } from 'express'
import type { Role } from '@cms/shared'
import { unauthorized, forbidden } from '../lib/errors.js'

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(unauthorized())
  next()
}

/**
 * Role gate for a route.
 *
 * This is only ever half of an authorization decision. It answers "may this
 * kind of user call this endpoint", never "may this user see this row" —
 * Release 2 adds a separate scope check for that, and conflating the two is
 * precisely how school portals end up showing someone else's child's grades.
 * Even in Release 1, treat this as the coarse gate and not the whole rule.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized())
    if (!allowed.includes(req.auth.user.role)) {
      // Deliberately does not say which role was required or what was being
      // accessed — that is free reconnaissance.
      return next(forbidden())
    }
    next()
  }
}
