import { and, eq, isNull, lt, ne } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { users, sessions, authTokens } from '../../db/schema/index.js'
import { hashPassword, verifyPassword, fakeVerify } from '../../lib/hash.js'
import {
  generateToken,
  hashToken,
  SESSION_TTL_MS,
  INVITE_TTL_MS,
  RESET_TTL_MS,
} from '../../lib/tokens.js'
import { badRequest, unauthorized } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { env } from '../../env.js'
import { enqueue } from '../outbox/outbox.service.js'
import type { AuthUser } from '../../types/express.js'

interface Ctx {
  ip?: string | null
  userAgent?: string | null
}

/**
 * Verify credentials and open a session.
 *
 * Failure is always the same error regardless of cause — unknown address,
 * wrong password, disabled account, or an invited user who never set one.
 * Distinguishing them tells an attacker which addresses are real, which is
 * the first step of every credential-stuffing run against a school.
 */
export async function login(
  email: string,
  password: string,
  ctx: Ctx,
): Promise<{ token: string; user: AuthUser }> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((r) => r[0])

  if (!user || !user.passwordHash || user.status !== 'active') {
    // Equalise timing so "no such account" is not measurably faster.
    await fakeVerify()
    throw unauthorized('Email or password is incorrect')
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    throw unauthorized('Email or password is incorrect')
  }

  const token = generateToken()
  const now = new Date()

  await db.insert(sessions).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent?.slice(0, 300) ?? null,
  })

  await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id))

  audit({ actorUserId: user.id, action: 'auth.login', entity: 'user', entityId: user.id, ip: ctx.ip })

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
  }
}

export async function logout(sessionId: string, actorUserId: string, ip?: string | null) {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
  audit({ actorUserId, action: 'auth.logout', entity: 'user', entityId: actorUserId, ip })
}

/** Used when a password changes or an account is disabled. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

async function issueToken(userId: string, kind: 'invite' | 'password_reset', ttlMs: number) {
  // One live token per kind: issuing a new reset link must invalidate the old
  // one, otherwise every past email remains a working key to the account.
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.usedAt)))

  const token = generateToken()
  await db.insert(authTokens).values({
    userId,
    kind,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMs),
  })
  return token
}

async function consumeToken(token: string, kind: 'invite' | 'password_reset') {
  const row = await db
    .select({
      id: authTokens.id,
      userId: authTokens.userId,
      expiresAt: authTokens.expiresAt,
      usedAt: authTokens.usedAt,
    })
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hashToken(token)), eq(authTokens.kind, kind)))
    .limit(1)
    .then((r) => r[0])

  if (!row || row.usedAt || row.expiresAt <= new Date()) {
    throw badRequest('This link is invalid or has expired. Please request a new one.')
  }
  return row
}

/** Sends (queues) an invite. Called when an account is created or re-invited. */
export async function sendInvite(userId: string): Promise<void> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0])
  if (!user) throw badRequest('No such user')

  const token = await issueToken(user.id, 'invite', INVITE_TTL_MS)
  enqueue({
    to: user.email,
    template: 'invite',
    payload: {
      displayName: user.displayName,
      url: `${env.PUBLIC_ORIGIN}/invite/${token}`,
    },
    priority: 'transactional',
  })
}

export async function acceptInvite(token: string, password: string, ip?: string | null) {
  const row = await consumeToken(token, 'invite')
  const passwordHash = await hashPassword(password)

  await db
    .update(users)
    .set({ passwordHash, status: 'active' })
    .where(eq(users.id, row.userId))
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id))
  await revokeAllSessions(row.userId)

  audit({ actorUserId: row.userId, action: 'auth.invite_accepted', entity: 'user', entityId: row.userId, ip })
}

/**
 * Always resolves successfully, whether or not the address exists.
 *
 * A reset form that says "no account with that email" is an account
 * enumeration endpoint with a friendly label on it.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((r) => r[0])

  if (!user || user.status === 'disabled') return

  const token = await issueToken(user.id, 'password_reset', RESET_TTL_MS)
  enqueue({
    to: user.email,
    template: 'passwordReset',
    payload: {
      displayName: user.displayName,
      url: `${env.PUBLIC_ORIGIN}/reset-password/${token}`,
    },
    priority: 'transactional',
  })
}

export async function resetPassword(token: string, password: string, ip?: string | null) {
  const row = await consumeToken(token, 'password_reset')
  const passwordHash = await hashPassword(password)

  await db.update(users).set({ passwordHash, status: 'active' }).where(eq(users.id, row.userId))
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id))

  // Anyone already signed in as this user is logged out. If the reset happened
  // because the account was compromised, leaving the attacker's session alive
  // would defeat the entire exercise.
  await revokeAllSessions(row.userId)

  audit({ actorUserId: row.userId, action: 'auth.password_reset', entity: 'user', entityId: row.userId, ip })
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentSessionId: string,
  ip?: string | null,
) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0])

  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw badRequest('Current password is incorrect')
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, userId))

  // Drop every OTHER session but keep this one, so changing your password does
  // not log you out of the tab you are using. Note the `ne` — dropping all of
  // them would sign the user out mid-action and read as a broken form.
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)))

  audit({ actorUserId: userId, action: 'auth.password_changed', entity: 'user', entityId: userId, ip })
}

/** Housekeeping: expired sessions and tokens are dead weight and a liability. */
export async function purgeExpired(): Promise<void> {
  const now = new Date()
  await db.delete(sessions).where(lt(sessions.expiresAt, now))
  await db.delete(authTokens).where(lt(authTokens.expiresAt, now))
}
