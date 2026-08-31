import type { Response } from 'express'
import { isProd } from '../env.js'
import { SESSION_TTL_MS } from './tokens.js'

export const SESSION_COOKIE = 'cms_session'

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript can never read it, so XSS cannot exfiltrate it
    sameSite: 'lax', // blocks the cookie on cross-site POSTs; see middleware/csrf.ts
    secure: isProd, // HTTPS only in production
    path: '/',
    maxAge: SESSION_TTL_MS,
  })
}

export function clearSessionCookie(res: Response): void {
  // Options must match those used to set it or the browser keeps the original.
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' })
}
