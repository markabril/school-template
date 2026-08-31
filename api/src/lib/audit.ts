import { db } from '../db/client.js'
import { auditLog } from '../db/schema/index.js'

export interface AuditEntry {
  actorUserId?: string | null
  action: string
  entity: string
  entityId?: string | null
  before?: unknown
  after?: unknown
  ip?: string | null
}

/**
 * Write an audit row. Used from Phase 1 for auth and content events so it is
 * habit before Release 2 makes it mandatory for grades and fees.
 *
 * Deliberately synchronous against the DB and callable inside a transaction:
 * an audit row that can be lost when the process dies is not an audit row.
 * Where a write must be audited, both go in one transaction so you cannot end
 * up with the change but not the record of it.
 */
export function audit(entry: AuditEntry): void {
  db.insert(auditLog)
    .values({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip: entry.ip ?? null,
    })
    .run()
}

/** Strip secret-bearing fields before they reach an audit payload. */
export function scrub<T extends Record<string, unknown>>(row: T): Partial<T> {
  const { passwordHash, tokenHash, ...rest } = row as Record<string, unknown>
  return rest as Partial<T>
}
