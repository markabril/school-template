import { and, asc, eq, isNull, lte, gte, or, desc } from 'drizzle-orm'
import {
  settingsSchema,
  DEFAULT_SETTINGS,
  type SiteSettings,
  type SettingKey,
} from '@cms/shared'
import { db } from '../../db/client.js'
import {
  siteSettings,
  navigation,
  staff,
  downloads,
  announcements,
  pages,
  media,
  inquiries,
} from '../../db/schema/index.js'
import { notFound } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { revalidate, PURGE_EVERYTHING } from '../../lib/revalidate.js'
import { toPublic as mediaToPublic } from '../media/media.service.js'

interface Actor {
  id: string
  ip?: string | null
}

/* ---------------------------------------------------------------- settings */

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(siteSettings)
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  // Defaults fill any gap, so a missing row can never render the site blank.
  return { ...DEFAULT_SETTINGS, ...stored } as SiteSettings
}

export async function saveSettings(patch: Partial<SiteSettings>, actor: Actor) {
  const merged = settingsSchema.parse({ ...(await getSettings()), ...patch })

  for (const [key, value] of Object.entries(merged)) {
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value } })
  }

  audit({
    actorUserId: actor.id,
    action: 'settings.updated',
    entity: 'site_settings',
    after: patch,
    ip: actor.ip,
  })

  // Site name, contact details and the like sit in the header and footer of
  // every page — nothing cached is still correct.
  revalidate(PURGE_EVERYTHING)
  return merged
}

/* -------------------------------------------------------------- navigation */

export async function listNavigation() {
  const rows = await db
    .select({
      id: navigation.id,
      location: navigation.location,
      parentId: navigation.parentId,
      label: navigation.label,
      pageId: navigation.pageId,
      url: navigation.url,
      seq: navigation.seq,
      opensNewTab: navigation.opensNewTab,
      pageSlug: pages.slug,
      pageStatus: pages.status,
    })
    .from(navigation)
    .leftJoin(pages, eq(navigation.pageId, pages.id))
    .orderBy(asc(navigation.location), asc(navigation.seq))

  return rows.map((r) => ({
    ...r,
    // A menu item pointing at a page resolves through the page, so renaming a
    // slug cannot silently 404 the main navigation.
    href: r.pageId ? (r.pageSlug === 'home' ? '/' : `/${r.pageSlug}`) : (r.url ?? '#'),
  }))
}

/** Header and footer trees for the public site. Unpublished targets are hidden. */
export async function publicNavigation() {
  const all = await listNavigation()
  const visible = all.filter((n) => !n.pageId || n.pageStatus === 'published')

  const build = (location: 'header' | 'footer') => {
    const items = visible.filter((n) => n.location === location)
    const roots = items.filter((n) => !n.parentId)
    return roots.map((r) => ({
      id: r.id,
      label: r.label,
      href: r.href,
      opensNewTab: r.opensNewTab,
      children: items
        .filter((c) => c.parentId === r.id)
        .map((c) => ({ id: c.id, label: c.label, href: c.href, opensNewTab: c.opensNewTab })),
    }))
  }

  return { header: build('header'), footer: build('footer') }
}

export async function saveNavigation(
  items: Array<{
    location: 'header' | 'footer'
    label: string
    pageId?: string | null
    url?: string | null
    parentId?: string | null
    opensNewTab?: boolean
  }>,
  actor: Actor,
) {
  // Replace wholesale: the editor sends the complete ordered list, so a diff
  // would be more code and more ways to corrupt the ordering.
  db.transaction((tx) => {
    tx.delete(navigation).run()
    items.forEach((item, i) => {
      tx.insert(navigation)
        .values({
          location: item.location,
          label: item.label,
          pageId: item.pageId ?? null,
          url: item.url ?? null,
          parentId: item.parentId ?? null,
          seq: i,
          opensNewTab: item.opensNewTab ?? false,
        })
        .run()
    })
  })

  audit({
    actorUserId: actor.id,
    action: 'navigation.saved',
    entity: 'navigation',
    after: { count: items.length },
    ip: actor.ip,
  })

  revalidate(PURGE_EVERYTHING)
  return listNavigation()
}

/* ------------------------------------------------------------------- staff */

export async function listStaff(publishedOnly = false) {
  const rows = await db
    .select()
    .from(staff)
    .where(publishedOnly ? eq(staff.isPublished, true) : undefined)
    .orderBy(asc(staff.department), asc(staff.seq))

  const photoIds = [...new Set(rows.map((r) => r.photoMediaId).filter((v): v is string => !!v))]
  const photos = photoIds.length
    ? await db.select().from(media).then((r) => r.filter((m) => photoIds.includes(m.id)).map(mediaToPublic))
    : []

  return rows.map((r) => ({
    ...r,
    photo: photos.find((p) => p.id === r.photoMediaId) ?? null,
  }))
}

export async function upsertStaff(
  input: {
    id?: string
    name: string
    roleTitle?: string | null
    department?: string | null
    photoMediaId?: string | null
    bio?: string | null
    email?: string | null
    seq?: number
    isPublished?: boolean
  },
  actor: Actor,
) {
  const values = {
    name: input.name,
    roleTitle: input.roleTitle ?? null,
    department: input.department ?? null,
    photoMediaId: input.photoMediaId ?? null,
    bio: input.bio ?? null,
    email: input.email ?? null,
    seq: input.seq ?? 0,
    isPublished: input.isPublished ?? false,
  }

  const row = input.id
    ? await db.update(staff).set(values).where(eq(staff.id, input.id)).returning().then((r) => r[0])
    : await db.insert(staff).values(values).returning().then((r) => r[0])

  if (!row) throw notFound('No such staff member')

  audit({
    actorUserId: actor.id,
    action: input.id ? 'staff.updated' : 'staff.created',
    entity: 'staff',
    entityId: row.id,
    after: { name: row.name, isPublished: row.isPublished },
    ip: actor.ip,
  })

  revalidate(PURGE_EVERYTHING)
  return row
}

export async function removeStaff(id: string, actor: Actor) {
  await db.delete(staff).where(eq(staff.id, id))
  audit({ actorUserId: actor.id, action: 'staff.deleted', entity: 'staff', entityId: id, ip: actor.ip })
  revalidate(PURGE_EVERYTHING)
}

/* --------------------------------------------------------------- downloads */

export async function listDownloads(publishedOnly = false) {
  const rows = await db
    .select()
    .from(downloads)
    .where(publishedOnly ? eq(downloads.isPublished, true) : undefined)
    .orderBy(asc(downloads.category), asc(downloads.seq))

  const fileIds = rows.map((r) => r.mediaId)
  const files = fileIds.length
    ? await db.select().from(media).then((r) => r.filter((m) => fileIds.includes(m.id)).map(mediaToPublic))
    : []

  return rows.map((r) => ({ ...r, file: files.find((f) => f.id === r.mediaId) ?? null }))
}

export async function upsertDownload(
  input: {
    id?: string
    title: string
    description?: string | null
    mediaId: string
    category?: string | null
    seq?: number
    isPublished?: boolean
  },
  actor: Actor,
) {
  const values = {
    title: input.title,
    description: input.description ?? null,
    mediaId: input.mediaId,
    category: input.category ?? null,
    seq: input.seq ?? 0,
    isPublished: input.isPublished ?? false,
  }

  const row = input.id
    ? await db.update(downloads).set(values).where(eq(downloads.id, input.id)).returning().then((r) => r[0])
    : await db.insert(downloads).values(values).returning().then((r) => r[0])

  if (!row) throw notFound('No such download')

  audit({
    actorUserId: actor.id,
    action: input.id ? 'download.updated' : 'download.created',
    entity: 'download',
    entityId: row.id,
    after: { title: row.title },
    ip: actor.ip,
  })

  revalidate(PURGE_EVERYTHING)
  return row
}

export async function removeDownload(id: string, actor: Actor) {
  await db.delete(downloads).where(eq(downloads.id, id))
  audit({ actorUserId: actor.id, action: 'download.deleted', entity: 'download', entityId: id, ip: actor.ip })
  revalidate(PURGE_EVERYTHING)
}

/* ----------------------------------------------------------- announcements */

export async function listAnnouncements() {
  return db.select().from(announcements).orderBy(desc(announcements.createdAt))
}

/**
 * Announcements currently within their display window.
 * Null start or end means "no bound on that side", which is how an editor
 * expresses "show it until I say otherwise".
 */
export async function activeAnnouncements() {
  const now = new Date()
  return db
    .select()
    .from(announcements)
    .where(
      and(
        or(eq(announcements.audience, 'public'), eq(announcements.audience, 'both')),
        or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
        or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(3)
}

export async function upsertAnnouncement(
  input: {
    id?: string
    title: string
    body?: unknown
    startsAt?: Date | null
    endsAt?: Date | null
  },
  actor: Actor,
) {
  // Release 1 only ever writes 'public'; the column exists so the portal can
  // reuse this table without a migration.
  const values = {
    title: input.title,
    body: (input.body ?? null) as object | null,
    audience: 'public' as const,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
  }

  const row = input.id
    ? await db.update(announcements).set(values).where(eq(announcements.id, input.id)).returning().then((r) => r[0])
    : await db.insert(announcements).values(values).returning().then((r) => r[0])

  if (!row) throw notFound('No such announcement')

  audit({
    actorUserId: actor.id,
    action: input.id ? 'announcement.updated' : 'announcement.created',
    entity: 'announcement',
    entityId: row.id,
    after: { title: row.title },
    ip: actor.ip,
  })

  revalidate(PURGE_EVERYTHING)
  return row
}

export async function removeAnnouncement(id: string, actor: Actor) {
  await db.delete(announcements).where(eq(announcements.id, id))
  audit({
    actorUserId: actor.id,
    action: 'announcement.deleted',
    entity: 'announcement',
    entityId: id,
    ip: actor.ip,
  })
  revalidate(PURGE_EVERYTHING)
}

/* --------------------------------------------------------------- inquiries */

export async function createInquiry(input: {
  name: string
  email: string
  phone?: string | null
  subject?: string | null
  message: string
  source?: string | null
  ip?: string | null
}) {
  const row = await db
    .insert(inquiries)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject ?? null,
      message: input.message,
      source: input.source ?? null,
      ip: input.ip ?? null,
    })
    .returning()
    .then((r) => r[0]!)

  // Deliberately NOT emailed anywhere. Free Gmail's daily cap is reserved for
  // account mail, and a contact form that emails on submit is a spam amplifier
  // pointed at the school's own inbox. The office reads these in the CMS.
  return row
}

export async function listInquiries(handled = false) {
  return db
    .select()
    .from(inquiries)
    .where(handled ? undefined : isNull(inquiries.handledAt))
    .orderBy(desc(inquiries.createdAt))
    .limit(200)
}

export async function markInquiryHandled(id: string, actor: Actor) {
  const row = await db
    .update(inquiries)
    .set({ handledBy: actor.id, handledAt: new Date() })
    .where(eq(inquiries.id, id))
    .returning()
    .then((r) => r[0])

  if (!row) throw notFound('No such enquiry')
  audit({
    actorUserId: actor.id,
    action: 'inquiry.handled',
    entity: 'inquiry',
    entityId: id,
    ip: actor.ip,
  })
  return row
}
