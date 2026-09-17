import { isReferenceBlock } from '@cms/shared'
import { listPublic as listPosts } from '../posts/posts.service.js'
import { listPublic as listEvents } from '../events/events.service.js'
import { listStaff, listDownloads } from '../site/site.service.js'

/**
 * Resolve reference blocks server-side, in one pass, before the page is sent.
 *
 * The alternative — each teaser component fetching its own data on mount —
 * means a homepage with three teasers makes four round trips, none of which
 * render during SSR. On a parent's mobile connection that is the difference
 * between a page that appears and a page that appears empty and then jumps.
 *
 * Queries are deduplicated: two blocks asking for the same thing hit the
 * database once.
 */
export async function resolveReferences(
  blocks: Array<{ id: string; type: string; data: unknown }>,
): Promise<Record<string, unknown>> {
  const refs: Record<string, unknown> = {}
  const wanted = blocks.filter((b) => isReferenceBlock(b.type))
  if (wanted.length === 0) return refs

  // Cache by the query itself, not by block id, so duplicate queries collapse.
  const cache = new Map<string, Promise<unknown>>()
  const once = <T>(key: string, run: () => Promise<T>): Promise<T> => {
    if (!cache.has(key)) cache.set(key, run())
    return cache.get(key) as Promise<T>
  }

  await Promise.all(
    wanted.map(async (block) => {
      const data = (block.data ?? {}) as Record<string, unknown>

      switch (block.type) {
        case 'newsTeaser': {
          const limit = Number(data.limit ?? 3)
          const category = (data.category as string | null) ?? undefined
          const key = `posts:${limit}:${category ?? ''}`
          const result = await once(key, () => listPosts(limit, 0, category))
          refs[block.id] = result.posts
          break
        }
        case 'eventsTeaser': {
          const limit = Number(data.limit ?? 3)
          refs[block.id] = await once(`events:${limit}`, () => listEvents(limit, false))
          break
        }
        case 'staffGrid': {
          const department = (data.department as string | null) ?? null
          const all = await once('staff', () => listStaff(true))
          refs[block.id] = department
            ? (all as Array<{ department: string | null }>).filter((s) => s.department === department)
            : all
          break
        }
        case 'downloadsList': {
          const category = (data.category as string | null) ?? null
          const all = await once('downloads', () => listDownloads(true))
          refs[block.id] = category
            ? (all as Array<{ category: string | null }>).filter((d) => d.category === category)
            : all
          break
        }
        case 'storiesColumns': {
          const columns = (Array.isArray(data.columns) ? data.columns : []) as Array<{
            title: string
            category: string
            limit?: number
          }>

          refs[block.id] = await Promise.all(
            columns.map(async (column) => {
              const limit = Number(column.limit ?? 3)
              // Same cache key shape as newsTeaser, so a teaser and a column
              // asking for the same category share one query.
              const key = `posts:${limit}:${column.category}`
              const result = await once(key, () => listPosts(limit, 0, column.category))
              return { title: column.title, category: column.category, posts: result.posts }
            }),
          )
          break
        }
      }
    }),
  )

  return refs
}
