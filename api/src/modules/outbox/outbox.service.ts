import { and, eq, lte, gte, sql, asc } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { outbox } from '../../db/schema/index.js'
import { templates, type TemplateName } from './templates.js'

/**
 * Daily send budget, split so a bulk run cannot starve transactional mail.
 *
 * Free Gmail caps at roughly 500 recipients/day. We stay well under it and
 * reserve headroom: a parent resetting their password at 4pm must not fail
 * because an invite batch drained the quota at noon.
 */
export const DAILY_TOTAL = 400
export const BULK_DAILY_MAX = 300 // leaves >=100 for transactional
export const MAX_ATTEMPTS = 5

export interface EnqueueArgs<T extends TemplateName = TemplateName> {
  to: string
  template: T
  payload: Parameters<(typeof templates)[T]>[0]
  priority?: 'transactional' | 'bulk'
  sendAfter?: Date
}

export function enqueue(args: EnqueueArgs): void {
  db.insert(outbox)
    .values({
      toEmail: args.to,
      template: args.template,
      payload: args.payload as unknown as object,
      priority: args.priority ?? 'transactional',
      sendAfter: args.sendAfter ?? new Date(),
    })
    .run()
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function sentToday(priority?: 'transactional' | 'bulk'): Promise<number> {
  // gte(), not a raw sql template: the column is `timestamp_ms`, and only the
  // typed operator knows to convert a Date to the integer the driver can bind.
  const conditions = [eq(outbox.status, 'sent'), gte(outbox.sentAt, startOfToday())]
  if (priority) conditions.push(eq(outbox.priority, priority))

  const row = await db
    .select({ n: sql<number>`count(*)` })
    .from(outbox)
    .where(and(...conditions))
    .then((r) => r[0])

  return row?.n ?? 0
}

/**
 * Next message to send, or undefined if nothing is due or the budget is spent.
 * Transactional always wins: ordering by priority before send time is the
 * mechanism that makes the reserved headroom actually work.
 */
export async function claimNext() {
  const total = await sentToday()
  if (total >= DAILY_TOTAL) return undefined

  const bulkUsed = await sentToday('bulk')
  const bulkAllowed = bulkUsed < BULK_DAILY_MAX

  const candidates = await db
    .select()
    .from(outbox)
    .where(and(eq(outbox.status, 'queued'), lte(outbox.sendAfter, new Date())))
    .orderBy(asc(outbox.priority), asc(outbox.sendAfter))
    .limit(10)

  // 'bulk' sorts before 'transactional' alphabetically, so filter explicitly
  // rather than relying on the ORDER BY to express the priority rule.
  const next =
    candidates.find((c) => c.priority === 'transactional') ??
    (bulkAllowed ? candidates.find((c) => c.priority === 'bulk') : undefined)

  return next
}

export async function markSent(id: string): Promise<void> {
  await db.update(outbox).set({ status: 'sent', sentAt: new Date() }).where(eq(outbox.id, id))
}

export async function markFailed(id: string, attempts: number, error: string): Promise<void> {
  const dead = attempts + 1 >= MAX_ATTEMPTS
  await db
    .update(outbox)
    .set({
      status: dead ? 'dead' : 'queued',
      attempts: attempts + 1,
      lastError: error.slice(0, 500),
      // Exponential backoff: 1m, 4m, 9m, 16m.
      sendAfter: new Date(Date.now() + Math.pow(attempts + 1, 2) * 60_000),
    })
    .where(eq(outbox.id, id))
}
