import { desc, eq } from 'drizzle-orm'
import { ASSIGNABLE_ROLES, type Role } from '@cms/shared'
import { db } from '../../db/client.js'
import { users, sessions } from '../../db/schema/index.js'
import { badRequest, conflict, notFound, forbidden } from '../../lib/errors.js'
import { audit, scrub } from '../../lib/audit.js'
import { sendInvite } from '../auth/auth.service.js'

export async function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      displayName: users.displayName,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
}

/**
 * Create an account and queue its invite. This is the only way a user comes
 * into existence — there is no public signup anywhere in the system.
 */
export async function inviteUser(
  input: { email: string; displayName: string; role: Role },
  actor: { id: string; ip?: string | null },
) {
  if (!ASSIGNABLE_ROLES.includes(input.role)) {
    // Guards against a request assigning `registrar` or `parent` before
    // Release 2 exists to support them.
    throw badRequest('That role cannot be assigned yet')
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)
    .then((r) => r[0])

  if (existing) throw conflict('An account with that email already exists')

  const created = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      status: 'invited',
      passwordHash: null,
    })
    .returning()
    .then((r) => r[0]!)

  await sendInvite(created.id)

  audit({
    actorUserId: actor.id,
    action: 'user.invited',
    entity: 'user',
    entityId: created.id,
    after: scrub(created),
    ip: actor.ip,
  })

  return created
}

export async function resendInvite(userId: string, actor: { id: string; ip?: string | null }) {
  const user = await getUser(userId)
  if (user.status === 'active') throw badRequest('That account is already active')

  await sendInvite(userId)
  audit({ actorUserId: actor.id, action: 'user.invite_resent', entity: 'user', entityId: userId, ip: actor.ip })
}

async function getUser(id: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!user) throw notFound('No such user')
  return user
}

export async function setUserStatus(
  userId: string,
  status: 'active' | 'disabled',
  actor: { id: string; ip?: string | null },
) {
  // Locking yourself out of the only super_admin account is unrecoverable
  // without database access. Cheap to prevent, miserable to fix.
  if (userId === actor.id) throw forbidden('You cannot disable your own account')

  const before = await getUser(userId)

  const after = await db
    .update(users)
    .set({ status })
    .where(eq(users.id, userId))
    .returning()
    .then((r) => r[0]!)

  // Disabling must take effect now, not whenever their session happens to
  // expire. This is the point of server-side sessions.
  if (status === 'disabled') {
    await db.delete(sessions).where(eq(sessions.userId, userId))
  }

  audit({
    actorUserId: actor.id,
    action: status === 'disabled' ? 'user.disabled' : 'user.enabled',
    entity: 'user',
    entityId: userId,
    before: scrub(before),
    after: scrub(after),
    ip: actor.ip,
  })

  return after
}

export async function setUserRole(
  userId: string,
  role: Role,
  actor: { id: string; ip?: string | null },
) {
  if (!ASSIGNABLE_ROLES.includes(role)) throw badRequest('That role cannot be assigned yet')
  if (userId === actor.id) throw forbidden('You cannot change your own role')

  const before = await getUser(userId)
  const after = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'user.role_changed',
    entity: 'user',
    entityId: userId,
    before: scrub(before),
    after: scrub(after),
    ip: actor.ip,
  })

  return after
}
