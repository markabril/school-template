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
/**
 * Origins this API accepts.
 *
 * In development the same server answers on `localhost` and `127.0.0.1`, which
 * are different origins to a browser. Someone who opens the spelling that
 * PUBLIC_ORIGIN does not name can read the site but cannot sign in, and the
 * only symptom is "Cross-origin request refused". Both loopback spellings are
 * accepted in development, on the configured port only.
 *
 * Production stays exactly as strict: one configured origin, nothing else.
 */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]']

function allowedOrigins(): Set<string> {
  const configured = new URL(env.PUBLIC_ORIGIN)
  const allowed = new Set([configured.origin])

  if (!isProd && LOOPBACK_HOSTS.includes(configured.hostname)) {
    for (const host of LOOPBACK_HOSTS) {
      allowed.add(`${configured.protocol}//${host}${configured.port ? `:${configured.port}` : ''}`)
    }
  }

  return allowed
}

const ALLOWED = allowedOrigins()

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

  if (!ALLOWED.has(host)) {
    return next(forbidden('Cross-origin request refused'))
  }

  next()
}
