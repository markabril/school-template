import { and, asc, eq, isNull, lte, gte, or, desc } from 'drizzle-orm'
import { z } from 'zod'
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
import { newId } from '../../lib/ids.js'
import { audit } from '../../lib/audit.js'
import { revalidate, PURGE_EVERYTHING } from '../../lib/revalidate.js'
import { pathsForBlockTypes } from '../../lib/purge.js'
import { toPublic as mediaToPublic } from '../media/media.service.js'

interface Actor {
  id: string
  ip?: string | null
}

/* ---------------------------------------------------------------- settings */

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(siteSettings)
  // Only declared keys. The table also holds internal bookkeeping such as the
  // demo manifest, and this object is served publicly.
  const known = new Set(Object.keys(DEFAULT_SETTINGS))
  const stored = Object.fromEntries(rows.filter((r) => known.has(r.key)).map((r) => [r.key, r.value]))
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

export interface NavLinkInput {
  label: string
  pageId?: string | null
  url?: string | null
  opensNewTab?: boolean
}

export interface NavInputItem extends NavLinkInput {
  location: 'header' | 'footer'
  children?: NavLinkInput[]
}

const navLinkInputSchema = z.object({
  label: z.string().min(1).max(80).trim(),
  pageId: z.string().nullish(),
  url: z.string().max(300).nullish(),
  opensNewTab: z.boolean().optional(),
})

/**
 * Exactly one level of nesting. Children are `strict`, so a child carrying its
 * own `children` is rejected rather than silently flattened.
 */
export const navigationInputSchema = z.object({
  items: z
    .array(
      navLinkInputSchema.extend({
        location: z.enum(['header', 'footer']),
        children: z.array(navLinkInputSchema.strict()).max(20).optional(),
      }),
    )
    .max(60),
})

export interface PublicNavLink {
  id: string
  label: string
  href: string
  opensNewTab: boolean
}

export interface PublicNavItem {
  id: string
  label: string
  /** Null when the item opens a dropdown rather than navigating. */
  href: string | null
  opensNewTab: boolean
  children: PublicNavLink[]
}

/**
 * Header and footer trees for the public site.
 *
 * A top-level item with visible children is not itself a link: clicking it
 * opens its panel. If the editor also gave it a page or URL, that link becomes
 * the first child, so nothing they set is silently dropped. Items pointing at
 * unpublished pages are hidden, and a parent left with nothing to show is
 * dropped.
 */
export async function publicNavigation(): Promise<{ header: PublicNavItem[]; footer: PublicNavItem[] }> {
  const rows = await listNavigation()
  type Row = (typeof rows)[number]

  const visible = (r: Row) => !r.pageId || r.pageStatus === 'published'
  const linkOf = (r: Row): PublicNavLink | null =>
    visible(r) && (r.pageId || r.url)
      ? { id: r.id, label: r.label, href: r.href, opensNewTab: r.opensNewTab }
      : null

  const build = (location: 'header' | 'footer'): PublicNavItem[] => {
    const own = rows.filter((r) => r.location === location)

    return own
      .filter((r) => !r.parentId)
      .sort((a, b) => a.seq - b.seq)
      .flatMap((parent): PublicNavItem[] => {
        const children = own
          .filter((c) => c.parentId === parent.id)
          .sort((a, b) => a.seq - b.seq)
          .map(linkOf)
          .filter((l): l is PublicNavLink => l !== null)
        const self = linkOf(parent)

        if (children.length === 0) return self ? [{ ...self, children: [] }] : []

        return [
          {
            id: parent.id,
            label: parent.label,
            href: null,
            opensNewTab: false,
            children: self ? [self, ...children] : children,
          },
        ]
      })
  }

  return { header: build('header'), footer: build('footer') }
}

/** The stored navigation in the same shape `saveNavigation` accepts. */
export async function exportNavigationTree(): Promise<NavInputItem[]> {
  const rows = await listNavigation()
  const strip = (r: (typeof rows)[number]): NavLinkInput => ({
    label: r.label,
    pageId: r.pageId,
    url: r.url,
    opensNewTab: r.opensNewTab,
  })

  return rows
    .filter((r) => !r.parentId)
    .sort((a, b) => (a.location === b.location ? a.seq - b.seq : a.location === 'header' ? -1 : 1))
    .map((p) => ({
      location: p.location,
      ...strip(p),
      children: rows
        .filter((c) => c.parentId === p.id)
        .sort((a, b) => a.seq - b.seq)
        .map(strip),
    }))
}

export async function saveNavigation(items: NavInputItem[], actor: Actor) {
  // Replaced wholesale. Each parent is inserted first with an id generated
  // here, so its children reference a row that exists — the previous flat
  // save regenerated ids and would have orphaned any parentId.
  db.transaction((tx) => {
    tx.delete(navigation).run()
    items.forEach((item, i) => {
      const parentId = newId()
      tx.insert(navigation)
        .values({
          id: parentId,
          location: item.location,
          label: item.label,
          pageId: item.pageId ?? null,
          // A page reference wins over a typed address: it survives renames.
          url: item.pageId ? null : (item.url ?? null),
          parentId: null,
          seq: i,
          opensNewTab: item.opensNewTab ?? false,
        })
        .run()

      ;(item.children ?? []).forEach((child, j) => {
        tx.insert(navigation)
          .values({
            id: newId(),
            location: item.location,
            label: child.label,
            pageId: child.pageId ?? null,
            url: child.pageId ? null : (child.url ?? null),
            parentId,
            seq: j,
            opensNewTab: child.opensNewTab ?? false,
          })
          .run()
      })
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

  revalidate(['/staff', ...(await pathsForBlockTypes(['staffGrid']))])
  return row
}

export async function removeStaff(id: string, actor: Actor) {
  await db.delete(staff).where(eq(staff.id, id))
  audit({ actorUserId: actor.id, action: 'staff.deleted', entity: 'staff', entityId: id, ip: actor.ip })
  revalidate(['/staff', ...(await pathsForBlockTypes(['staffGrid']))])
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

  revalidate(['/downloads', ...(await pathsForBlockTypes(['downloadsList']))])
  return row
}

export async function removeDownload(id: string, actor: Actor) {
  await db.delete(downloads).where(eq(downloads.id, id))
  audit({ actorUserId: actor.id, action: 'download.deleted', entity: 'download', entityId: id, ip: actor.ip })
  revalidate(['/downloads', ...(await pathsForBlockTypes(['downloadsList']))])
}

/* ------------------------------------------------------------------ chrome */

/**
 * Everything the site chrome needs, in one query set.
 *
 * The logo is stored as a media id and resolved here, so the header never has
 * to fetch it separately and a logo deleted from the library degrades to the
 * wordmark rather than a broken image on every page.
 */
export async function publicChrome() {
  const [settings, nav, announcementRows] = await Promise.all([
    getSettings(),
    publicNavigation(),
    activeAnnouncements(),
  ])

  const logoId = settings['site.logoMediaId']
  const logoRow = logoId
    ? await db
        .select()
        .from(media)
        .where(eq(media.id, logoId))
        .limit(1)
        .then((r) => r[0])
    : undefined

  return {
    settings,
    nav,
    announcements: announcementRows,
    logo: logoRow ? mediaToPublic(logoRow) : null,
  }
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
