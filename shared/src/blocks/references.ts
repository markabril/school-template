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

export const newsTeaserSchema = z
  .object({
    heading: z.string().max(120).optional(),
    limit: z.number().int().min(1).max(9).default(3),
    category: z.string().max(60).nullable().default(null),
    // `grid` is the default so blocks saved before this option existed keep
    // their appearance. New blocks are created as `featured` by the registry.
    layout: z.enum(['featured', 'grid']).default('grid'),
  })
  .refine((d) => d.layout !== 'featured' || d.limit >= 3, {
    message: 'The featured layout shows at least 3 articles',
    path: ['limit'],
  })

export const eventsTeaserSchema = z.object({
  heading: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(9).default(3),
  layout: z.enum(['featured', 'list']).default('list'),
})

export const staffGridSchema = z.object({
  heading: z.string().max(120).optional(),
  department: z.string().max(80).nullable().default(null),
})

export const downloadsListSchema = z.object({
  heading: z.string().max(120).optional(),
  category: z.string().max(80).nullable().default(null),
})

/**
 * Up to three columns, each listing recent articles from one news category —
 * the "Voices" row on the reference site.
 */
export const storiesColumnsSchema = z.object({
  heading: z.string().max(120).optional(),
  columns: z
    .array(
      z.object({
        title: z.string().min(1, 'Each column needs a title').max(60),
        category: z.string().min(1, 'Each column needs a category').max(60),
        limit: z.number().int().min(1).max(5).default(3),
      }),
    )
    .min(1)
    .max(3),
})

/** Block types whose content is resolved server-side rather than stored. */
export const REFERENCE_BLOCK_TYPES = [
  'newsTeaser',
  'eventsTeaser',
  'staffGrid',
  'downloadsList',
  'storiesColumns',
] as const

export type ReferenceBlockType = (typeof REFERENCE_BLOCK_TYPES)[number]

export function isReferenceBlock(type: string): type is ReferenceBlockType {
  return (REFERENCE_BLOCK_TYPES as readonly string[]).includes(type)
}
