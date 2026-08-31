import { asc, desc, eq, inArray } from 'drizzle-orm'
import {
  parseBlockData,
  mediaIdsInBlock,
  slugSchema,
  type PublishStatus,
} from '@cms/shared'
import { db } from '../../db/client.js'
import { pages, pageBlocks, media } from '../../db/schema/index.js'
import { badRequest, notFound } from '../../lib/errors.js'
import {
  assertSlugFree as assertFree,
  recordSlugChange,
  resolveOldSlug as resolveOld,
  type SlugTable,
} from '../../lib/slugs.js'
import { audit } from '../../lib/audit.js'
import { newId } from '../../lib/ids.js'
import { revalidate, pathsForPage } from '../../lib/revalidate.js'
import { toPublic as mediaToPublic } from '../media/media.service.js'
import { resolveReferences } from './references.js'

export interface BlockInput {
  type: string
  data: unknown
}

interface Actor {
  id: string
  ip?: string | null
}

export async function list() {
  return db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      status: pages.status,
      publishedAt: pages.publishedAt,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .orderBy(desc(pages.updatedAt))
}

async function requirePage(id: string) {
  const row = await db
    .select()
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!row) throw notFound('No such page')
  return row
}

async function blocksFor(pageId: string) {
  return db
    .select()
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId))
    .orderBy(asc(pageBlocks.seq))
}

/**
 * A page plus its blocks, with every referenced media row resolved.
 *
 * Media is resolved here, once, in a single query — not by the client fetching
 * each image as it renders. Blocks store ids rather than URLs so that replacing
 * a file updates every page using it, but that only works if something joins
 * them back together on read.
 */
export async function getWithBlocks(id: string) {
  const page = await requirePage(id)
  const blocks = await blocksFor(id)
  const [media, refs] = await Promise.all([resolveMedia(blocks), resolveReferences(blocks)])
  return { page, blocks, media, refs }
}

export async function getBySlugWithBlocks(slug: string) {
  const page = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, slug))
    .limit(1)
    .then((r) => r[0])
  if (!page) throw notFound('No such page')

  const blocks = await blocksFor(page.id)
  const [media, refs] = await Promise.all([resolveMedia(blocks), resolveReferences(blocks)])
  return { page, blocks, media, refs }
}

async function resolveMedia(blocks: Array<{ type: string; data: unknown }>) {
  const ids = [...new Set(blocks.flatMap((b) => mediaIdsInBlock(b.type, b.data)))]
  if (ids.length === 0) return []

  const rows = await db.select().from(media).where(inArray(media.id, ids))
  return rows.map(mediaToPublic)
}

export async function create(
  input: { title: string; slug: string },
  actor: Actor,
) {
  const slug = slugSchema.parse(input.slug)
  await assertSlugFree(slug)

  const page = await db
    .insert(pages)
    .values({
      title: input.title,
      slug,
      status: 'draft',
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'page.created',
    entity: 'page',
    entityId: page.id,
    after: { slug: page.slug, title: page.title },
    ip: actor.ip,
  })

  return page
}

const TABLE: SlugTable = { entity: 'page', table: pages, id: pages.id, slug: pages.slug }

const assertSlugFree = (slug: string, exceptPageId?: string) =>
  assertFree(TABLE, slug, exceptPageId)

/**
 * Replace a page's blocks wholesale.
 *
 * The editor sends the complete ordered list, so a diff would be more code for
 * no benefit — and reordering via diff is where these implementations usually
 * go wrong. Done in one transaction so a failure mid-write cannot leave a page
 * with half its content.
 */
export async function saveBlocks(pageId: string, blocks: BlockInput[], actor: Actor) {
  await requirePage(pageId)

  // Validate everything BEFORE touching the database. Rejecting block 7 after
  // deleting blocks 1-6 would destroy a page the editor was mid-way through.
  const parsed = blocks.map((b, i) => {
    try {
      return { type: b.type, data: parseBlockData(b.type, b.data), seq: i }
    } catch (err) {
      throw badRequest(
        `Block ${i + 1} (${b.type}) is not valid: ${err instanceof Error ? err.message : 'unknown error'}`,
      )
    }
  })

  db.transaction((tx) => {
    tx.delete(pageBlocks).where(eq(pageBlocks.pageId, pageId)).run()
    for (const block of parsed) {
      tx.insert(pageBlocks)
        .values({ id: newId(), pageId, seq: block.seq, type: block.type, data: block.data as object })
        .run()
    }
    tx.update(pages).set({ updatedBy: actor.id, updatedAt: new Date() }).where(eq(pages.id, pageId)).run()
  })

  audit({
    actorUserId: actor.id,
    action: 'page.blocks_saved',
    entity: 'page',
    entityId: pageId,
    after: { blockCount: parsed.length, types: parsed.map((p) => p.type) },
    ip: actor.ip,
  })

  return blocksFor(pageId)
}

export async function updateMeta(
  pageId: string,
  patch: { title?: string; slug?: string; seo?: unknown },
  actor: Actor,
) {
  const before = await requirePage(pageId)

  let slug = before.slug
  if (patch.slug !== undefined && patch.slug !== before.slug) {
    slug = slugSchema.parse(patch.slug)
    await assertSlugFree(slug, pageId)

    // Keep the old address so it 301s instead of 404ing. A school page that has
    // been shared in a newsletter or printed on a form must not simply break
    // because someone tidied up its URL.
    await recordSlugChange('page', pageId, before.slug)
  }

  const after = await db
    .update(pages)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      slug,
      ...(patch.seo !== undefined ? { seo: patch.seo as object } : {}),
      updatedBy: actor.id,
    })
    .where(eq(pages.id, pageId))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'page.updated',
    entity: 'page',
    entityId: pageId,
    before: { slug: before.slug, title: before.title },
    after: { slug: after.slug, title: after.title },
    ip: actor.ip,
  })

  // Both addresses need purging: the new one to show the page, the old one to
  // stop serving a cached copy at a URL that should now redirect.
  if (after.slug !== before.slug) {
    revalidate([...pathsForPage(before.slug), ...pathsForPage(after.slug)])
  } else if (after.status === 'published') {
    revalidate(pathsForPage(after.slug))
  }

  return after
}

export async function setStatus(
  pageId: string,
  status: PublishStatus,
  publishedAt: Date | null,
  actor: Actor,
) {
  const before = await requirePage(pageId)

  if (status === 'published') {
    const blocks = await blocksFor(pageId)
    if (blocks.length === 0) {
      throw badRequest('Add some content before publishing this page')
    }
  }

  const after = await db
    .update(pages)
    .set({
      status,
      // Publishing with no explicit date means now. A future date schedules it:
      // the row says published but every public query also filters on the date.
      publishedAt: status === 'published' ? (publishedAt ?? before.publishedAt ?? new Date()) : null,
      updatedBy: actor.id,
    })
    .where(eq(pages.id, pageId))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: status === 'published' ? 'page.published' : 'page.unpublished',
    entity: 'page',
    entityId: pageId,
    before: { status: before.status, publishedAt: before.publishedAt },
    after: { status: after.status, publishedAt: after.publishedAt },
    ip: actor.ip,
  })

  revalidate(pathsForPage(after.slug))
  return after
}

export async function remove(pageId: string, actor: Actor) {
  const page = await requirePage(pageId)

  // page_blocks cascades on the foreign key.
  await db.delete(pages).where(eq(pages.id, pageId))

  audit({
    actorUserId: actor.id,
    action: 'page.deleted',
    entity: 'page',
    entityId: pageId,
    before: { slug: page.slug, title: page.title, status: page.status },
    ip: actor.ip,
  })

  revalidate(pathsForPage(page.slug))
}

/** Resolve an old slug to its current one, for 301s. */
export const resolveOldSlug = (slug: string) => resolveOld(TABLE, slug)
