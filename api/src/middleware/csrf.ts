import type { RequestHandler } from 'express'
import { env, isProd } from '../env.js'
import { forbidden } from '../lib/errors.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Origin check on state-changing requests.
 *
 * `SameSite=Lax` already stops the session cookie riding along on a cross-site
 * POST, which covers the classic CSRF shape. This is the second layer, because
 * SameSite is a browser-enforced policy and one misbehaving or outdated client
 * should not be the only thing standing between a forged request and a publish.
 *
 * A token-based scheme (double-submit or synchroniser) would add little here:
 * the API is same-origin only, and cookies are never sent cross-site anyway.
 * If the API ever needs to serve a different origin, replace this — do not
 * simply widen the allowlist.
 */
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next()

  const origin = req.get('origin')
  const referer = req.get('referer')

  // No Origin and no Referer means a non-browser client (curl, a script, a
  // health probe). Those carry no ambient cookie, so they are not the CSRF
  // threat — but in production we still refuse, because a browser omitting
  // both on a POST is anomalous enough to reject.
  if (!origin && !referer) {
    return isProd ? next(forbidden('Missing origin')) : next()
  }

  const candidate = origin ?? referer!
  let host: string
  try {
    host = new URL(candidate).origin
  } catch {
    return next(forbidden('Bad origin'))
  }

  if (host !== new URL(env.PUBLIC_ORIGIN).origin) {
    return next(forbidden('Cross-origin request refused'))
  }

  next()
}
