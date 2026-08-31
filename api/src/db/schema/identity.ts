import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { ROLES, USER_STATUSES } from '@cms/shared'
import { newId } from '../../lib/ids.js'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
}

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    // Full role set ships now; only super_admin/content_editor are assignable
    // in Release 1. See shared/src/roles.ts.
    role: text('role', { enum: ROLES }).notNull(),
    status: text('status', { enum: USER_STATUSES }).notNull().default('invited'),
    displayName: text('display_name').notNull(),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('users_role_status_idx').on(t.role, t.status)],
)

/** Server-side sessions, so disabling an account logs it out immediately.
 *  `id` stores a hash of the opaque cookie token, never the token itself. */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
)

/** Invites and password resets share a shape: hashed, single-use, short TTL. */
export const authTokens = sqliteTable(
  'auth_tokens',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['invite', 'password_reset'] }).notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('auth_tokens_user_kind_idx').on(t.userId, t.kind)],
)

/**
 * Written from Phase 1, starting with content publishes. Retrofitting audit
 * into an existing service layer is miserable; using it from the start makes
 * it habit before Release 2 makes it mandatory (grades and fees).
 */
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    before: text('before', { mode: 'json' }),
    after: text('after', { mode: 'json' }),
    ip: text('ip'),
    at: integer('at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index('audit_entity_idx').on(t.entity, t.entityId),
    index('audit_actor_idx').on(t.actorUserId),
    index('audit_at_idx').on(t.at),
  ],
)

/**
 * Mail is queued, never sent inline — free Gmail caps at ~500 recipients/day
 * and a bulk invite run will exceed it (docs/architecture.md §6).
 *
 * `priority` is what stops a bulk batch from starving password resets:
 * transactional mail draws from a reserved daily slice.
 */
export const outbox = sqliteTable(
  'outbox',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    toEmail: text('to_email').notNull(),
    template: text('template').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    priority: text('priority', { enum: ['transactional', 'bulk'] })
      .notNull()
      .default('transactional'),
    status: text('status', { enum: ['queued', 'sending', 'sent', 'failed', 'dead'] })
      .notNull()
      .default('queued'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    sendAfter: integer('send_after', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('outbox_drain_idx').on(t.status, t.priority, t.sendAfter)],
)
