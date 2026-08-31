import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

/**
 * Opaque tokens for sessions, invites and password resets.
 *
 * The plaintext token goes to the user exactly once (in a cookie or an email
 * link). Only its SHA-256 is stored. A leaked database backup therefore does
 * not hand over live sessions or usable invite links.
 *
 * SHA-256 is correct here and argon2 is not: these are 256-bit random values,
 * so there is no dictionary to attack and nothing to slow down.
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time compare for anything derived from user input. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h — staff log in daily
export const SESSION_REFRESH_AFTER_MS = 60 * 60 * 1000 // slide if >1h old
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour
