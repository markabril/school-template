import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import { PUBLISH_STATUSES, NAV_LOCATIONS, ANNOUNCEMENT_AUDIENCES } from '@cms/shared'
import { users } from './identity.js'
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

/**
 * Shared across CMS and, later, the portal and report cards. Deliberately not
 * scoped to CMS content — docs/release-1.md §10.
 */
export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    filename: text('filename').notNull(),
    storagePath: text('storage_path').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    // Stored so the frontend can reserve space. Without these, a photo-heavy
    // homepage on a slow connection shifts layout as each image lands.
    width: integer('width'),
    height: integer('height'),
    // Required at the API, not just the form. Upload is the only moment anyone
    // will actually write alt text.
    alt: text('alt').notNull(),
    caption: text('caption'),
    uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('media_created_idx').on(t.createdAt)],
)

export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    status: text('status', { enum: PUBLISH_STATUSES }).notNull().default('draft'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    seo: text('seo', { mode: 'json' }),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('pages_status_published_idx').on(t.status, t.publishedAt)],
)

/**
 * `type` is indexed because cache purging asks "which pages contain a
 * staffGrid?" whenever referenced content changes (docs/release-1.md §6).
 * Without the index that becomes a full scan on every staff edit.
 */
export const pageBlocks = sqliteTable(
  'page_blocks',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    type: text('type').notNull(),
    data: text('data', { mode: 'json' }).notNull(),
    ...timestamps,
  },
  (t) => [
    index('page_blocks_page_seq_idx').on(t.pageId, t.seq),
    index('page_blocks_type_idx').on(t.type),
  ],
)

/** Old URLs 301 instead of 404 when an editor renames a slug. */
export const slugHistory = sqliteTable(
  'slug_history',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    entity: text('entity', { enum: ['page', 'post', 'event'] }).notNull(),
    entityId: text('entity_id').notNull(),
    oldSlug: text('old_slug').notNull(),
    ...timestamps,
  },
  (t) => [unique('slug_history_unique').on(t.entity, t.oldSlug)],
)

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    // TipTap JSON, never HTML. Rendered through a fixed component map so
    // there is no sanitisation surface at all — docs/release-1.md §4.
    body: text('body', { mode: 'json' }),
    coverMediaId: text('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    category: text('category'),
    status: text('status', { enum: PUBLISH_STATUSES }).notNull().default('draft'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
    seo: text('seo', { mode: 'json' }),
    ...timestamps,
  },
  (t) => [
    index('posts_status_published_idx').on(t.status, t.publishedAt),
    index('posts_category_idx').on(t.category),
  ],
)

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
    location: text('location'),
    description: text('description', { mode: 'json' }),
    coverMediaId: text('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    status: text('status', { enum: PUBLISH_STATUSES }).notNull().default('draft'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('events_starts_idx').on(t.startsAt), index('events_status_idx').on(t.status)],
)

/**
 * `pageId` alongside `url`: internal menu items reference the page, so
 * renaming a slug cannot silently 404 the main nav — the most common CMS
 * foot-gun there is. `url` stays for external links.
 */
export const navigation = sqliteTable(
  'navigation',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    location: text('location', { enum: NAV_LOCATIONS }).notNull(),
    parentId: text('parent_id'),
    label: text('label').notNull(),
    pageId: text('page_id').references(() => pages.id, { onDelete: 'cascade' }),
    url: text('url'),
    seq: integer('seq').notNull().default(0),
    opensNewTab: integer('opens_new_tab', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index('navigation_location_seq_idx').on(t.location, t.seq)],
)

export const staff = sqliteTable(
  'staff',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    name: text('name').notNull(),
    roleTitle: text('role_title'),
    department: text('department'),
    photoMediaId: text('photo_media_id').references(() => media.id, { onDelete: 'set null' }),
    bio: text('bio'),
    email: text('email'),
    seq: integer('seq').notNull().default(0),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index('staff_dept_seq_idx').on(t.department, t.seq)],
)

export const downloads = sqliteTable(
  'downloads',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    title: text('title').notNull(),
    description: text('description'),
    mediaId: text('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    category: text('category'),
    seq: integer('seq').notNull().default(0),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index('downloads_category_seq_idx').on(t.category, t.seq)],
)

/** `audience` is only ever 'public' in Release 1. The portal turns the other
 *  values on without touching this table. */
export const announcements = sqliteTable(
  'announcements',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    title: text('title').notNull(),
    body: text('body', { mode: 'json' }),
    audience: text('audience', { enum: ANNOUNCEMENT_AUDIENCES }).notNull().default('public'),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('announcements_window_idx').on(t.audience, t.startsAt, t.endsAt)],
)

/** Admissions and contact form submissions. `ip` is kept for spam triage —
 *  someone will eventually ask where a nasty message came from. */
export const inquiries = sqliteTable(
  'inquiries',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    subject: text('subject'),
    message: text('message').notNull(),
    source: text('source'),
    ip: text('ip'),
    handledBy: text('handled_by').references(() => users.id, { onDelete: 'set null' }),
    handledAt: integer('handled_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('inquiries_handled_idx').on(t.handledAt, t.createdAt)],
)

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
})
