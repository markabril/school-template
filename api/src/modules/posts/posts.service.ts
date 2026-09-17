import { and, desc, eq, inArray, isNotNull, lte, ne, sql } from 'drizzle-orm'
import { docToText, richTextDocSchema, slugSchema, type PublishStatus } from '@cms/shared'
import { db } from '../../db/client.js'
import { posts, media } from '../../db/schema/index.js'
import { badRequest, notFound } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { assertSlugFree, recordSlugChange, resolveOldSlug, type SlugTable } from '../../lib/slugs.js'
import { revalidate } from '../../lib/revalidate.js'
import { pathsForBlockTypes } from '../../lib/purge.js'
import { toPublic as mediaToPublic } from '../media/media.service.js'

const TABLE: SlugTable = { entity: 'post', table: posts, id: posts.id, slug: posts.slug }

interface Actor {
  id: string
  ip?: string | null
}

/** A post changes itself, the index, and every page showing news blocks. */
async function purgePost(...slugs: string[]): Promise<void> {
  revalidate([
    ...slugs.map((s) => `/news/${s}`),
    '/news',
    ...(await pathsForBlockTypes(['newsTeaser', 'storiesColumns'])),
  ])
}

export async function listAdmin() {
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      category: posts.category,
      status: posts.status,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .orderBy(desc(posts.updatedAt))
}

/**
 * Live posts, newest first.
 *
 * Both conditions matter: `status = published` AND the date has arrived. The
 * scheduler flipping rows is a convenience — this filter is the actual gate, so
 * a stopped worker delays a post rather than leaking it early.
 */
export async function listPublic(limit = 20, offset = 0, category?: string) {
  const where = [eq(posts.status, 'published'), lte(posts.publishedAt, new Date())]
  if (category) where.push(eq(posts.category, category))

  const rows = await db
    .select()
    .from(posts)
    .where(and(...where))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset)

  const total = await db
    .select({ n: sql<number>`count(*)` })
    .from(posts)
    .where(and(...where))
    .then((r) => r[0]?.n ?? 0)

  return { posts: await withCovers(rows), total }
}

async function withCovers(rows: Array<typeof posts.$inferSelect>) {
  const ids = [...new Set(rows.map((r) => r.coverMediaId).filter((v): v is string => !!v))]
  // inArray(), not a raw sql template — only the typed operator binds an array
  // correctly through better-sqlite3.
  const covers = ids.length
    ? await db
        .select()
        .from(media)
        .where(inArray(media.id, ids))
        .then((r) => r.map(mediaToPublic))
    : []

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt ?? docToText(r.body as never, 180),
    category: r.category,
    publishedAt: r.publishedAt,
    cover: covers.find((c) => c.id === r.coverMediaId) ?? null,
  }))
}

export async function getPublicBySlug(slug: string) {
  const row = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1)
    .then((r) => r[0])

  if (!row || row.status !== 'published' || !row.publishedAt || row.publishedAt > new Date()) {
    const current = await resolveOldSlug(TABLE, slug)
    if (current) return { redirectTo: `/news/${current}` as const }
    throw notFound('No such article')
  }

  const cover = row.coverMediaId
    ? await db
        .select()
        .from(media)
        .where(eq(media.id, row.coverMediaId))
        .limit(1)
        .then((r) => (r[0] ? mediaToPublic(r[0]) : null))
    : null

  return {
    post: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      category: row.category,
      publishedAt: row.publishedAt,
      seo: row.seo,
      cover,
    },
  }
}

export async function getAdmin(id: string) {
  const row = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!row) throw notFound('No such article')

  const cover = row.coverMediaId
    ? await db
        .select()
        .from(media)
        .where(eq(media.id, row.coverMediaId))
        .limit(1)
        .then((r) => (r[0] ? mediaToPublic(r[0]) : null))
    : null

  return { post: row, cover }
}

export async function create(input: { title: string; slug: string }, actor: Actor) {
  const slug = slugSchema.parse(input.slug)
  await assertSlugFree(TABLE, slug)

  const row = await db
    .insert(posts)
    .values({ title: input.title, slug, status: 'draft', authorId: actor.id })
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'post.created',
    entity: 'post',
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
    excerpt?: string | null
    body?: unknown
    coverMediaId?: string | null
    category?: string | null
    seo?: unknown
  },
  actor: Actor,
) {
  const before = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!before) throw notFound('No such article')

  let slug = before.slug
  if (patch.slug !== undefined && patch.slug !== before.slug) {
    slug = slugSchema.parse(patch.slug)
    await assertSlugFree(TABLE, slug, id)
    await recordSlugChange('post', id, before.slug)
  }

  if (patch.body !== undefined) {
    // Validated with the same schema the rich-text renderer trusts, so an
    // unknown node type is refused on write rather than dropped at render.
    const parsed = richTextDocSchema.safeParse(patch.body)
    if (!parsed.success) throw badRequest('That article content is not valid')
    patch.body = parsed.data
  }

  const after = await db
    .update(posts)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      slug,
      ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt } : {}),
      ...(patch.body !== undefined ? { body: patch.body as object } : {}),
      ...(patch.coverMediaId !== undefined ? { coverMediaId: patch.coverMediaId } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.seo !== undefined ? { seo: patch.seo as object } : {}),
    })
    .where(eq(posts.id, id))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'post.updated',
    entity: 'post',
    entityId: id,
    before: { slug: before.slug, title: before.title },
    after: { slug: after.slug, title: after.title },
    ip: actor.ip,
  })

  if (after.status === 'published') {
    await purgePost(...new Set([after.slug, before.slug]))
  }

  return after
}

export async function setStatus(
  id: string,
  status: PublishStatus,
  publishedAt: Date | null,
  actor: Actor,
) {
  const before = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!before) throw notFound('No such article')

  if (status === 'published' && !before.title.trim()) {
    throw badRequest('Give the article a title before publishing it')
  }

  const after = await db
    .update(posts)
    .set({
      status,
      publishedAt: status === 'published' ? (publishedAt ?? before.publishedAt ?? new Date()) : null,
    })
    .where(eq(posts.id, id))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: status === 'published' ? 'post.published' : 'post.unpublished',
    entity: 'post',
    entityId: id,
    before: { status: before.status },
    after: { status: after.status, publishedAt: after.publishedAt },
    ip: actor.ip,
  })

  await purgePost(after.slug)
  return after
}

export async function remove(id: string, actor: Actor) {
  const row = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!row) throw notFound('No such article')

  await db.delete(posts).where(eq(posts.id, id))

  audit({
    actorUserId: actor.id,
    action: 'post.deleted',
    entity: 'post',
    entityId: id,
    before: { slug: row.slug, title: row.title },
    ip: actor.ip,
  })
  await purgePost(row.slug)
}

/** Distinct categories in use, for the admin dropdown and public filters. */
export async function categories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: posts.category })
    .from(posts)
    .where(and(isNotNull(posts.category), ne(posts.category, '')))
  return rows.map((r) => r.category).filter((c): c is string => !!c)
}
