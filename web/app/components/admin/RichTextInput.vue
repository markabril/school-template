<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import type { RichTextDoc } from '@cms/shared'

const model = defineModel<RichTextDoc>({ required: true })
defineProps<{ label?: string }>()

/**
 * Deliberately limited toolbar.
 *
 * No font size, no colour, no arbitrary alignment. Those are how a CMS site
 * slowly stops matching its own design — and every one of them is a decision
 * the design system already made. Headings start at h2 because h1 is the page
 * title.
 */
const editor = useEditor({
  content: model.value,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      codeBlock: false,
      strike: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      // Matches the renderer's allowlist. Both sides must agree, or the editor
      // lets someone save a link the public site then refuses to render.
      protocols: ['http', 'https', 'mailto', 'tel'],
    }),
  ],
  editorProps: {
    attributes: { class: 'prose-cms focus:outline-none min-h-[9rem] px-3.5 py-3' },
  },
  onUpdate: ({ editor }) => {
    model.value = editor.getJSON() as RichTextDoc
  },
})

onBeforeUnmount(() => editor.value?.destroy())

function promptLink() {
  const previous = editor.value?.getAttributes('link').href ?? ''
  const url = window.prompt('Link address (https://…, /page, mailto:…)', previous)
  if (url === null) return
  if (url === '') {
    editor.value?.chain().focus().unsetLink().run()
    return
  }
  if (!/^(https?:\/\/|\/|mailto:|tel:)/i.test(url)) {
    alert('Use a full https:// address, a path starting with /, or mailto:/tel:.')
    return
  }
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const tools = computed(() => [
  { label: 'B', title: 'Bold', act: () => editor.value?.chain().focus().toggleBold().run(), on: editor.value?.isActive('bold'), cls: 'font-bold' },
  { label: 'I', title: 'Italic', act: () => editor.value?.chain().focus().toggleItalic().run(), on: editor.value?.isActive('italic'), cls: 'italic' },
  { label: 'H2', title: 'Heading', act: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(), on: editor.value?.isActive('heading', { level: 2 }) },
  { label: 'H3', title: 'Subheading', act: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(), on: editor.value?.isActive('heading', { level: 3 }) },
  { label: '• List', title: 'Bulleted list', act: () => editor.value?.chain().focus().toggleBulletList().run(), on: editor.value?.isActive('bulletList') },
  { label: '1. List', title: 'Numbered list', act: () => editor.value?.chain().focus().toggleOrderedList().run(), on: editor.value?.isActive('orderedList') },
  { label: 'Quote', title: 'Quote', act: () => editor.value?.chain().focus().toggleBlockquote().run(), on: editor.value?.isActive('blockquote') },
  { label: 'Link', title: 'Add or edit a link', act: promptLink, on: editor.value?.isActive('link') },
])
</script>

<template>
  <div>
    <p v-if="label" class="mb-1.5 text-sm font-semibold text-ink">{{ label }}</p>

    <div class="overflow-hidden rounded-card border border-hairline bg-white">
      <div
        class="flex flex-wrap gap-1 border-b border-hairline bg-cream/60 px-2 py-1.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        <button
          v-for="t in tools"
          :key="t.label"
          type="button"
          :title="t.title"
          :aria-pressed="!!t.on"
          class="rounded px-2 py-1 text-xs transition-colors"
          :class="[t.cls, t.on ? 'bg-maroon text-cream' : 'text-ink-muted hover:bg-maroon-tint hover:text-maroon']"
          @click="t.act"
        >
          {{ t.label }}
        </button>
      </div>

      <EditorContent :editor="editor" />
    </div>
  </div>
</template>
