import { z } from 'zod'

/**
 * Reference blocks store a QUERY, not a copy of the content.
 *
 * Add a staff member and every page showing the staff grid updates. Without
 * this, editors end up maintaining the same list in four places and the four
 * drift — which is how a school website ends up with a teacher who left two
 * years ago still on the About page.
 *
 * The cost is that the page endpoint has to resolve these on read, and cache
 * purging has to know which pages contain which reference block. That is what
 * the index on `page_blocks.type` is for.
 */

export const newsTeaserSchema = z.object({
  heading: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(9).default(3),
  category: z.string().max(60).nullable().default(null),
})

export const eventsTeaserSchema = z.object({
  heading: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(9).default(3),
})

export const staffGridSchema = z.object({
  heading: z.string().max(120).optional(),
  department: z.string().max(80).nullable().default(null),
})

export const downloadsListSchema = z.object({
  heading: z.string().max(120).optional(),
  category: z.string().max(80).nullable().default(null),
})

/** Block types whose content is resolved server-side rather than stored. */
export const REFERENCE_BLOCK_TYPES = [
  'newsTeaser',
  'eventsTeaser',
  'staffGrid',
  'downloadsList',
] as const

export type ReferenceBlockType = (typeof REFERENCE_BLOCK_TYPES)[number]

export function isReferenceBlock(type: string): type is ReferenceBlockType {
  return (REFERENCE_BLOCK_TYPES as readonly string[]).includes(type)
}
