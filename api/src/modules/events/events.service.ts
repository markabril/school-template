import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { richTextDocSchema, slugSchema, type PublishStatus } from '@cms/shared'
import { db } from '../../db/client.js'
import { events } from '../../db/schema/index.js'
import { badRequest, notFound } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { assertSlugFree, recordSlugChange, type SlugTable } from '../../lib/slugs.js'
import { revalidate } from '../../lib/revalidate.js'
import { pathsForBlockTypes } from '../../lib/purge.js'

const TABLE: SlugTable = { entity: 'event', table: events, id: events.id, slug: events.slug }

interface Actor {
  id: string
  ip?: string | null
}

async function purgeEvents(): Promise<void> {
  revalidate(['/events', ...(await pathsForBlockTypes(['eventsTeaser']))])
}

export async function listAdmin() {
  return db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      allDay: events.allDay,
      location: events.location,
      status: events.status,
    })
    .from(events)
    .orderBy(desc(events.startsAt))
}

/**
 * Upcoming events, soonest first.
 *
 * An event stays listed until its END time, not its start — a three-day fair
 * disappearing from the calendar on the morning of day one is exactly the sort
 * of thing a parent notices and the school gets blamed for.
 */
export async function listPublic(limit = 20, includePast = false) {
  const now = new Date()
  const where = [eq(events.status, 'published'), lte(events.publishedAt, now)]

  const rows = await db
    .select()
    .from(events)
    .where(and(...where))
    .orderBy(includePast ? desc(events.startsAt) : asc(events.startsAt))
    .limit(200)

  const filtered = includePast
    ? rows
    : rows.filter((e) => (e.endsAt ?? e.startsAt) >= now)

  return filtered.slice(0, limit).map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    allDay: e.allDay,
    location: e.location,
    description: e.description,
  }))
}

export async function getAdmin(id: string) {
  const row = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!row) throw notFound('No such event')
  return row
}

export async function create(
  input: { title: string; slug: string; startsAt: Date },
  actor: Actor,
) {
  const slug = slugSchema.parse(input.slug)
  await assertSlugFree(TABLE, slug)

  const row = await db
    .insert(events)
    .values({ title: input.title, slug, startsAt: input.startsAt, status: 'draft' })
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'event.created',
    entity: 'event',
    entityId: row.id,
    after: { slug: row.slug, title: row.title },
    ip: actor.ip,
  })
  return row
}

export async function update(
  id: string,
  patch: {
    title?: string
    slug?: string
    startsAt?: Date
    endsAt?: Date | null
    allDay?: boolean
    location?: string | null
    description?: unknown
  },
  actor: Actor,
) {
  const before = await getAdmin(id)

  let slug = before.slug
  if (patch.slug !== undefined && patch.slug !== before.slug) {
    slug = slugSchema.parse(patch.slug)
    await assertSlugFree(TABLE, slug, id)
    await recordSlugChange('event', id, before.slug)
  }

  const startsAt = patch.startsAt ?? before.startsAt
  const endsAt = patch.endsAt !== undefined ? patch.endsAt : before.endsAt
  if (endsAt && endsAt < startsAt) {
    throw badRequest('The end time cannot be before the start time')
  }

  if (patch.description !== undefined) {
    const parsed = richTextDocSchema.safeParse(patch.description)
    if (!parsed.success) throw badRequest('That event description is not valid')
    patch.description = parsed.data
  }

  const after = await db
    .update(events)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      slug,
      startsAt,
      endsAt,
      ...(patch.allDay !== undefined ? { allDay: patch.allDay } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.description !== undefined ? { description: patch.description as object } : {}),
    })
    .where(eq(events.id, id))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'event.updated',
    entity: 'event',
    entityId: id,
    before: { title: before.title, startsAt: before.startsAt },
    after: { title: after.title, startsAt: after.startsAt },
    ip: actor.ip,
  })

  if (after.status === 'published') await purgeEvents()
  return after
}

export async function setStatus(id: string, status: PublishStatus, actor: Actor) {
  const before = await getAdmin(id)

  const after = await db
    .update(events)
    .set({ status, publishedAt: status === 'published' ? (before.publishedAt ?? new Date()) : null })
    .where(eq(events.id, id))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: status === 'published' ? 'event.published' : 'event.unpublished',
    entity: 'event',
    entityId: id,
    before: { status: before.status },
    after: { status: after.status },
    ip: actor.ip,
  })

  await purgeEvents()
  return after
}

export async function remove(id: string, actor: Actor) {
  const row = await getAdmin(id)
  await db.delete(events).where(eq(events.id, id))

  audit({
    actorUserId: actor.id,
    action: 'event.deleted',
    entity: 'event',
    entityId: id,
    before: { slug: row.slug, title: row.title },
    ip: actor.ip,
  })
  await purgeEvents()
}
