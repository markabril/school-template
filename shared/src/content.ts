import { z } from 'zod'

export const PUBLISH_STATUSES = ['draft', 'published'] as const
export const publishStatusSchema = z.enum(PUBLISH_STATUSES)
export type PublishStatus = z.infer<typeof publishStatusSchema>

export const NAV_LOCATIONS = ['header', 'footer'] as const
export const navLocationSchema = z.enum(NAV_LOCATIONS)

/** Release 1 only ever writes 'public'. The other values exist so the portal
 *  can reuse this table without a migration — docs/release-1.md §2. */
export const ANNOUNCEMENT_AUDIENCES = ['public', 'portal', 'both'] as const
export const announcementAudienceSchema = z.enum(ANNOUNCEMENT_AUDIENCES)

/**
 * Slugs are lowercase, hyphen-separated, no leading/trailing hyphen.
 * Enforced here so admin and API agree — one schema, both sides.
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only')

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

export const seoSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(200).optional(),
  ogImageMediaId: z.string().optional(),
  noindex: z.boolean().default(false),
})
export type Seo = z.infer<typeof seoSchema>

/**
 * A published row is only actually live once `published_at` has passed.
 * Every public query must apply this — the scheduler flipping rows is a
 * convenience, not the gate (docs/release-1.md §6).
 */
export function isLive(row: { status: PublishStatus; publishedAt: Date | null }, now = new Date()): boolean {
  return row.status === 'published' && row.publishedAt !== null && row.publishedAt <= now
}
