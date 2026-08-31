import { z } from 'zod'

/**
 * TipTap document JSON.
 *
 * Stored as structured JSON, never as HTML. Storing HTML means every future
 * consumer has to sanitise correctly forever, and one missed spot is an XSS
 * hole on a site staff sign in to. JSON rendered through a fixed component map
 * has no such surface — see web/app/components/RichTextRenderer.vue.
 *
 * The allowlists below are the write-side half of that guarantee: unknown node
 * or mark types are rejected on save rather than silently dropped at render,
 * so what is stored is always something we know how to display.
 */
export const RICH_TEXT_NODES = [
  'doc',
  'paragraph',
  'heading',
  'text',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'horizontalRule',
  'hardBreak',
] as const

export const RICH_TEXT_MARKS = ['bold', 'italic', 'link', 'code'] as const

const markSchema = z.object({
  type: z.enum(RICH_TEXT_MARKS),
  attrs: z.record(z.string(), z.unknown()).optional(),
})

export interface RichTextNode {
  type: (typeof RICH_TEXT_NODES)[number]
  attrs?: Record<string, unknown>
  content?: RichTextNode[]
  marks?: Array<{ type: (typeof RICH_TEXT_MARKS)[number]; attrs?: Record<string, unknown> }>
  text?: string
}

export const richTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.enum(RICH_TEXT_NODES),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(richTextNodeSchema).optional(),
    marks: z.array(markSchema).optional(),
    text: z.string().optional(),
  }),
)

export const richTextDocSchema = z.object({
  type: z.literal('doc'),
  content: z.array(richTextNodeSchema).default([]),
})

export type RichTextDoc = z.infer<typeof richTextDocSchema>

export const EMPTY_DOC: RichTextDoc = { type: 'doc', content: [] }

/**
 * Plain text from a document, for excerpts and SEO descriptions.
 * Walks the tree rather than regex-stripping tags — there are no tags to strip.
 */
export function docToText(doc: RichTextDoc | null | undefined, limit = 300): string {
  if (!doc?.content) return ''
  const parts: string[] = []

  const walk = (nodes: RichTextNode[]) => {
    for (const node of nodes) {
      if (node.text) parts.push(node.text)
      if (node.content) walk(node.content)
      // Paragraph-level nodes get a space so words do not run together.
      if (node.type === 'paragraph' || node.type === 'heading') parts.push(' ')
    }
  }

  walk(doc.content)
  return parts.join('').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function isDocEmpty(doc: RichTextDoc | null | undefined): boolean {
  return docToText(doc, 1).length === 0
}
