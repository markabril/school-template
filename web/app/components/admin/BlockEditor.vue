<script setup lang="ts">
import type { Component } from 'vue'
import { blockRegistry, BLOCK_TYPES, type BlockType } from '@cms/shared'
import HeroEditor from '~/components/admin/blocks/HeroEditor.vue'
import RichTextEditor from '~/components/admin/blocks/RichTextEditor.vue'
import ImageTextEditor from '~/components/admin/blocks/ImageTextEditor.vue'
import NewsTeaserEditor from '~/components/admin/blocks/NewsTeaserEditor.vue'
import EventsTeaserEditor from '~/components/admin/blocks/EventsTeaserEditor.vue'
import StaffGridEditor from '~/components/admin/blocks/StaffGridEditor.vue'
import DownloadsListEditor from '~/components/admin/blocks/DownloadsListEditor.vue'

export interface EditableBlock {
  key: string
  type: BlockType
  data: Record<string, unknown>
}

const blocks = defineModel<EditableBlock[]>({ required: true })

const adding = ref(false)

function add(type: BlockType) {
  blocks.value = [
    ...blocks.value,
    // A fresh key per block, because ids only exist after a save and Vue needs
    // something stable to track reorders against.
    { key: crypto.randomUUID(), type, data: blockRegistry[type].defaults() as Record<string, unknown> },
  ]
  adding.value = false
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= blocks.value.length) return
  const next = [...blocks.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  blocks.value = next
}

function duplicate(index: number) {
  const source = blocks.value[index]!
  const next = [...blocks.value]
  next.splice(index + 1, 0, {
    key: crypto.randomUUID(),
    type: source.type,
    data: structuredClone(toRaw(source.data)),
  })
  blocks.value = next
}

function remove(index: number) {
  const block = blocks.value[index]!
  if (!confirm(`Remove this ${blockRegistry[block.type].label.toLowerCase()} block?`)) return
  blocks.value = blocks.value.filter((_, i) => i !== index)
}

// Component objects, not name strings — see the note in BlockRenderer.vue.
const EDITORS: Record<BlockType, Component> = {
  hero: HeroEditor,
  richText: RichTextEditor,
  imageText: ImageTextEditor,
  newsTeaser: NewsTeaserEditor,
  eventsTeaser: EventsTeaserEditor,
  staffGrid: StaffGridEditor,
  downloadsList: DownloadsListEditor,
}
</script>

<template>
  <div>
    <ol class="space-y-4">
      <li
        v-for="(block, i) in blocks"
        :key="block.key"
        class="rounded-card border border-hairline bg-white"
      >
        <div class="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
          <span class="text-sm font-semibold text-maroon">
            {{ blockRegistry[block.type].label }}
          </span>
          <span class="text-xs text-ink-muted">#{{ i + 1 }}</span>

          <div class="ml-auto flex items-center gap-1">
            <!--
              Buttons rather than drag-only reordering: drag is unusable with a
              keyboard and fiddly on a phone, and the office will edit on both.
            -->
            <UiButton variant="ghost" :disabled="i === 0" title="Move up" @click="move(i, -1)">
              ↑
            </UiButton>
            <UiButton
              variant="ghost"
              :disabled="i === blocks.length - 1"
              title="Move down"
              @click="move(i, 1)"
            >
              ↓
            </UiButton>
            <UiButton variant="ghost" title="Duplicate" @click="duplicate(i)">Copy</UiButton>
            <UiButton variant="ghost" title="Remove" @click="remove(i)">Remove</UiButton>
          </div>
        </div>

        <div class="p-4">
          <component :is="EDITORS[block.type]" v-model="block.data" />
        </div>
      </li>
    </ol>

    <p
      v-if="!blocks.length"
      class="rounded-card border border-dashed border-hairline p-8 text-center text-sm text-ink-muted"
    >
      This page has no content yet. Add a block to begin.
    </p>

    <div class="mt-4">
      <UiButton v-if="!adding" variant="secondary" @click="adding = true">Add a block</UiButton>

      <div v-else class="rounded-card border border-hairline bg-white p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-ink">Choose a block</p>
          <UiButton variant="ghost" @click="adding = false">Cancel</UiButton>
        </div>
        <ul class="mt-3 grid gap-2 sm:grid-cols-3">
          <li v-for="type in BLOCK_TYPES" :key="type">
            <button
              type="button"
              class="h-full w-full rounded-card border border-hairline p-3 text-left transition-colors hover:border-gold hover:bg-gold-tint/40"
              @click="add(type)"
            >
              <span class="block text-sm font-semibold text-maroon">
                {{ blockRegistry[type].label }}
              </span>
              <span class="mt-1 block text-xs leading-relaxed text-ink-muted">
                {{ blockRegistry[type].description }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
