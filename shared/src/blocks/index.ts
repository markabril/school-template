import { z } from 'zod'
import { richTextDocSchema, EMPTY_DOC } from './richtext.js'
import {
  newsTeaserSchema,
  eventsTeaserSchema,
  staffGridSchema,
  downloadsListSchema,
  storiesColumnsSchema,
} from './references.js'

export * from './richtext.js'
export * from './references.js'

/**
 * The block registry.
 *
 * One place maps a block type to its schema and its default value. The SAME
 * schema validates in the admin form before save and in the API before write —
 * that is the whole point of this living in `shared`. Adding a block type is an
 * entry here plus two components (one editor, one public renderer); nothing in
 * the page editor, the renderer, or the API needs to change.
 *
 * Phase 2 ships three types deliberately. They exercise every mechanism the
 * others need — plain content, a media reference, and a layout choice — so the
 * remaining eleven are repetitions of a proven pattern rather than eleven
 * chances to discover the editor's UX problems late.
 */

const ctaSchema = z.object({
  label: z.string().min(1).max(60),
  href: z.string().min(1).max(300),
})

export const heroSchema = z.object({
  title: z.string().min(1, 'A hero needs a title').max(140),
  subtitle: z.string().max(300).optional(),
  // Media is referenced by id, never by URL. A URL copied into block data goes
  // stale the moment the file is replaced, and nothing can then find out which
  // pages use a given image.
  imageMediaId: z.string().nullable().default(null),
  ctas: z.array(ctaSchema).max(2).default([]),
})

export const richTextBlockSchema = z.object({
  doc: richTextDocSchema,
})

export const imageTextSchema = z.object({
  heading: z.string().max(140).optional(),
  doc: richTextDocSchema,
  imageMediaId: z.string().nullable().default(null),
  imagePosition: z.enum(['left', 'right']).default('left'),
})

export const BLOCK_TYPES = [
  'hero',
  'richText',
  'imageText',
  'newsTeaser',
  'eventsTeaser',
  'staffGrid',
  'downloadsList',
  'storiesColumns',
] as const
export type BlockType = (typeof BLOCK_TYPES)[number]

export interface BlockDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  type: BlockType
  label: string
  description: string
  schema: S
  defaults: () => z.infer<S>
}

export const blockRegistry = {
  hero: {
    type: 'hero',
    label: 'Hero',
    description: 'Large heading with an optional background image and buttons.',
    schema: heroSchema,
    defaults: () => ({ title: '', subtitle: '', imageMediaId: null, ctas: [] }),
  },
  richText: {
    type: 'richText',
    label: 'Text',
    description: 'Headings, paragraphs, lists and links.',
    schema: richTextBlockSchema,
    defaults: () => ({ doc: structuredClone(EMPTY_DOC) }),
  },
  imageText: {
    type: 'imageText',
    label: 'Image and text',
    description: 'An image beside a block of text.',
    schema: imageTextSchema,
    defaults: () => ({
      heading: '',
      doc: structuredClone(EMPTY_DOC),
      imageMediaId: null,
      imagePosition: 'left' as const,
    }),
  },
  newsTeaser: {
    type: 'newsTeaser',
    label: 'Latest news',
    description: 'Shows the most recent articles. Updates itself as you publish.',
    schema: newsTeaserSchema,
    defaults: () => ({ heading: 'Latest news', limit: 3, category: null, layout: 'featured' as const }),
  },
  eventsTeaser: {
    type: 'eventsTeaser',
    label: 'Upcoming events',
    description: 'Shows the next events on the calendar. Updates itself.',
    schema: eventsTeaserSchema,
    defaults: () => ({ heading: 'Upcoming events', limit: 3, layout: 'featured' as const }),
  },
  staffGrid: {
    type: 'staffGrid',
    label: 'Staff',
    description: 'Shows published staff, optionally from one department.',
    schema: staffGridSchema,
    defaults: () => ({ heading: 'Our staff', department: null }),
  },
  downloadsList: {
    type: 'downloadsList',
    label: 'Downloads',
    description: 'Shows published files, optionally from one category.',
    schema: downloadsListSchema,
    defaults: () => ({ heading: 'Downloads', category: null }),
  },
  storiesColumns: {
    type: 'storiesColumns',
    label: 'Stories columns',
    description: 'Up to three columns, each listing recent articles from one news category.',
    schema: storiesColumnsSchema,
    defaults: () => ({ heading: '', columns: [{ title: '', category: '', limit: 3 }] }),
  },
} satisfies Record<BlockType, BlockDefinition>

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === 'string' && (BLOCK_TYPES as readonly string[]).includes(value)
}

/**
 * Validate one block's data against its type.
 * Returns the parsed value so callers store the normalised form, with defaults
 * applied, rather than whatever the client happened to send.
 */
export function parseBlockData(type: string, data: unknown) {
  if (!isBlockType(type)) {
    throw new Error(`Unknown block type: ${type}`)
  }
  return blockRegistry[type].schema.parse(data)
}

/** Media ids referenced by a block, so the API can resolve them in one query. */
export function mediaIdsInBlock(type: string, data: unknown): string[] {
  if (!isBlockType(type) || !data || typeof data !== 'object') return []
  const id = (data as { imageMediaId?: unknown }).imageMediaId
  return typeof id === 'string' && id.length > 0 ? [id] : []
}
