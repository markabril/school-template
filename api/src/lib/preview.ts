import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../env.js'

const TTL_MS = 30 * 60 * 1000

/**
 * Signed, expiring, single-page preview tokens.
 *
 * Draft content is not public, so previewing it needs a credential — but not a
 * session, because the point is to send the link to someone (a head teacher
 * reviewing a page) who may not have a CMS account.
 *
 * Stateless HMAC rather than a database row: nothing to clean up, and a token
 * cannot outlive its expiry even if the row-purging job stops. Scoped to one
 * page id so a forwarded link does not become a general key to every draft.
 */
export function signPreviewToken(pageId: string): string {
  const expires = Date.now() + TTL_MS
  const payload = `${pageId}.${expires}`
  const sig = createHmac('sha256', env.SECRET_KEY).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyPreviewToken(token: string): { pageId: string } | null {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null

  const encoded = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  let payload: string
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const expected = createHmac('sha256', env.SECRET_KEY).update(payload).digest('base64url')

  // Constant-time: a fast-fail compare leaks how much of a forged signature
  // was correct, which is enough to forge one byte at a time.
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const sep = payload.lastIndexOf('.')
  const pageId = payload.slice(0, sep)
  const expires = Number(payload.slice(sep + 1))

  if (!Number.isFinite(expires) || expires < Date.now()) return null
  return { pageId }
}
