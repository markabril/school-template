import type { RequestHandler } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { sessions, users } from '../db/schema/index.js'
import { hashToken, SESSION_TTL_MS, SESSION_REFRESH_AFTER_MS } from '../lib/tokens.js'
import { SESSION_COOKIE, setSessionCookie, clearSessionCookie } from '../lib/cookies.js'

/**
 * Resolves the session cookie into `req.auth`, or leaves it undefined.
 *
 * This middleware NEVER rejects — that is `requireAuth`'s job. Public routes
 * still benefit from knowing who is calling, and keeping "who are you" separate
 * from "are you allowed" is what stops authorization logic from drifting into
 * the parsing layer.
 */
export const loadSession: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE]
  if (typeof token !== 'string' || token.length === 0) return next()

  const sessionId = hashToken(token)

  const row = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
      userId: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      displayName: users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1)
    .then((r) => r[0])

  if (!row) return next()

  const now = new Date()

  if (row.expiresAt <= now) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    clearSessionCookie(res)
    return next()
  }

  // A disabled account must lose access on its next request, not when its
  // session happens to expire. This is the whole reason sessions are
  // server-side rather than a self-contained JWT.
  if (row.status !== 'active') {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    clearSessionCookie(res)
    return next()
  }

  // Sliding expiry: extend only once an hour has passed, so an active session
  // stays alive without writing to the database on every single request.
  if (row.expiresAt.getTime() - now.getTime() < SESSION_TTL_MS - SESSION_REFRESH_AFTER_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId))
    setSessionCookie(res, token)
  }

  req.auth = {
    sessionId,
    user: {
      id: row.userId,
      email: row.email,
      role: row.role,
      displayName: row.displayName,
    },
  }

  next()
}
