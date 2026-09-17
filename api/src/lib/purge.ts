import { and, eq, inArray } from 'drizzle-orm'
import type { BlockType } from '@cms/shared'
import { db } from '../db/client.js'
import { pageBlocks, pages } from '../db/schema/index.js'

/**
 * Paths of published pages containing any of the given block types.
 *
 * Reference blocks store a query rather than content, so when that content
 * changes every page showing it is stale. This is the lookup the index on
 * `page_blocks.type` exists for.
 */
export async function pathsForBlockTypes(types: BlockType[]): Promise<string[]> {
  if (types.length === 0) return []

  const rows = await db
    .selectDistinct({ slug: pages.slug })
    .from(pageBlocks)
    .innerJoin(pages, eq(pageBlocks.pageId, pages.id))
    .where(and(inArray(pageBlocks.type, types), eq(pages.status, 'published')))

  return rows.map((r) => (r.slug === 'home' ? '/' : `/${r.slug}`))
}
