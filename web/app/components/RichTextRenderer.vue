<script setup lang="ts">
import { h, type VNode } from 'vue'
import type { RichTextDoc, RichTextNode } from '@cms/shared'

/**
 * Renders TipTap JSON through a fixed component map.
 *
 * There is deliberately no `v-html` anywhere in this file. Stored content is
 * structured data, and this walks it into real VNodes — so an unrecognised node
 * type renders as nothing rather than as markup. That is what makes stored
 * content incapable of injecting script, regardless of what ends up in the
 * database or how it got there.
 */
const props = defineProps<{ doc: RichTextDoc | null | undefined }>()

const NODE_TAGS: Record<string, string> = {
  paragraph: 'p',
  bulletList: 'ul',
  orderedList: 'ol',
  listItem: 'li',
  blockquote: 'blockquote',
  horizontalRule: 'hr',
  hardBreak: 'br',
}

const MARK_TAGS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  code: 'code',
}

function renderText(node: RichTextNode): VNode | string {
  const text = node.text ?? ''
  if (!node.marks?.length) return text

  // Marks nest outward: the first mark ends up innermost.
  return node.marks.reduce<VNode | string>((child, mark) => {
    if (mark.type === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
      // Only http(s), same-site paths, mailto and tel. Blocks javascript: and
      // data: URLs, which are the one way a link mark could still be dangerous.
      const safe = /^(https?:\/\/|\/|mailto:|tel:)/i.test(href) ? href : undefined
      const external = safe?.startsWith('http')
      return h(
        'a',
        {
          href: safe,
          ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
        },
        [child],
      )
    }
    const tag = MARK_TAGS[mark.type]
    return tag ? h(tag, [child]) : child
  }, text)
}

function renderNode(node: RichTextNode): VNode | string | null {
  if (node.type === 'text') return renderText(node)

  const children = (node.content?.map(renderNode).filter((c) => c !== null) ?? []) as VNode[]

  if (node.type === 'heading') {
    // h1 belongs to the page title, so editor headings start at h2 and are
    // clamped — an editor cannot break the document outline from the toolbar.
    const level = Number(node.attrs?.level ?? 2)
    const tag = `h${Math.min(4, Math.max(2, level))}`
    return h(tag, children)
  }

  const tag = NODE_TAGS[node.type]
  if (!tag) return null
  if (tag === 'hr' || tag === 'br') return h(tag)
  return h(tag, children)
}

const Rendered = () =>
  h(
    'div',
    { class: 'prose-cms' },
    (props.doc?.content?.map(renderNode).filter((c) => c !== null) ?? []) as VNode[],
  )
</script>

<template>
  <Rendered />
</template>

<style>
/* Class-scoped rather than `scoped`: the nodes above are created with h() in a
   render function and carry no scope attribute. */
.prose-cms > * + * {
  margin-top: 1em;
}
.prose-cms p,
.prose-cms li {
  line-height: 1.7;
}
.prose-cms h2 {
  font-size: var(--text-2xl);
  margin-top: 1.6em;
}
.prose-cms h3 {
  font-size: var(--text-xl);
  margin-top: 1.4em;
}
.prose-cms h4 {
  font-size: var(--text-lg);
  margin-top: 1.2em;
}
.prose-cms ul,
.prose-cms ol {
  padding-left: 1.4em;
}
.prose-cms ul {
  list-style: disc;
}
.prose-cms ol {
  list-style: decimal;
}
.prose-cms a {
  color: var(--color-gold-ink);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.prose-cms blockquote {
  border-left: 3px solid var(--color-gold);
  padding-left: 1em;
  font-style: italic;
  color: var(--color-ink-muted);
}
.prose-cms code {
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
  background: var(--color-gold-tint);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}
.prose-cms hr {
  border: 0;
  border-top: 1px solid var(--color-hairline);
}
</style>
