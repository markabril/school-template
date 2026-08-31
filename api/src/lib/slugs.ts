import { and, eq, ne } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { db } from '../db/client.js'
import { slugHistory } from '../db/schema/index.js'
import { conflict } from './errors.js'

export type SlugEntity = 'page' | 'post' | 'event'

/** Where a sluggable entity lives, so the helpers below can be generic. */
export interface SlugTable {
  entity: SlugEntity
  table: SQLiteTable
  id: SQLiteColumn
  slug: SQLiteColumn
}

/**
 * Slug handling shared by pages, posts and events.
 *
 * Extracted once there were three consumers rather than in anticipation of
 * them: the uniqueness check and the redirect bookkeeping have to behave
 * identically everywhere, and three hand-written copies is three chances for
 * one of them to forget the history row.
 */
export async function assertSlugFree(t: SlugTable, slug: string, exceptId?: string): Promise<void> {
  const clash = await db
    .select({ id: t.id })
    .from(t.table)
    .where(exceptId ? and(eq(t.slug, slug), ne(t.id, exceptId)) : eq(t.slug, slug))
    .limit(1)
    .then((r) => r[0])

  if (clash) throw conflict('Another item already uses that address')
}

/**
 * Remember an old address so it 301s instead of 404ing.
 *
 * School URLs end up in newsletters, on printed forms and in parents'
 * bookmarks. Someone tidying a slug months later must not silently break them.
 */
export async function recordSlugChange(
  entity: SlugEntity,
  entityId: string,
  oldSlug: string,
): Promise<void> {
  await db.insert(slugHistory).values({ entity, entityId, oldSlug }).onConflictDoNothing()
}

/** The current slug for a retired one, or null if it was never used. */
export async function resolveOldSlug(t: SlugTable, oldSlug: string): Promise<string | null> {
  const hit = await db
    .select({ entityId: slugHistory.entityId })
    .from(slugHistory)
    .where(and(eq(slugHistory.entity, t.entity), eq(slugHistory.oldSlug, oldSlug)))
    .limit(1)
    .then((r) => r[0])

  if (!hit) return null

  const current = await db
    .select({ slug: t.slug })
    .from(t.table)
    .where(eq(t.id, hit.entityId))
    .limit(1)
    .then((r) => r[0])

  return (current?.slug as string | undefined) ?? null
}
