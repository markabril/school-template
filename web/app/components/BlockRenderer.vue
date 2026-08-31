<script setup lang="ts">
import type { Component } from 'vue'
import type { MediaItem } from '~/composables/useMedia'
import BlockHero from '~/components/blocks/BlockHero.vue'
import BlockRichText from '~/components/blocks/BlockRichText.vue'
import BlockImageText from '~/components/blocks/BlockImageText.vue'
import BlockNewsTeaser from '~/components/blocks/BlockNewsTeaser.vue'
import BlockEventsTeaser from '~/components/blocks/BlockEventsTeaser.vue'
import BlockStaffGrid from '~/components/blocks/BlockStaffGrid.vue'
import BlockDownloadsList from '~/components/blocks/BlockDownloadsList.vue'

/**
 * Maps a stored block type to its public component — the counterpart to the
 * registry in `shared/src/blocks`.
 *
 * These are imported as component objects, NOT as name strings. `<component
 * :is="'SomeName'">` only resolves against globally registered components, and
 * Nuxt's auto-import is compile-time — a runtime string silently renders
 * nothing at all, with no error anywhere.
 *
 * An unknown type renders nothing rather than throwing: a page that
 * half-renders beats a whole site 500ing because one row holds a type this
 * deploy does not know about, which is exactly what a rollback looks like.
 */
defineProps<{
  blocks: Array<{ id: string; type: string; data: unknown }>
  media: MediaItem[]
  /** Server-resolved content for reference blocks, keyed by block id. */
  refs?: Record<string, unknown>
}>()

const COMPONENTS: Record<string, Component> = {
  hero: BlockHero,
  richText: BlockRichText,
  imageText: BlockImageText,
  newsTeaser: BlockNewsTeaser,
  eventsTeaser: BlockEventsTeaser,
  staffGrid: BlockStaffGrid,
  downloadsList: BlockDownloadsList,
}
</script>

<template>
  <template v-for="block in blocks" :key="block.id">
    <component
      :is="COMPONENTS[block.type]"
      v-if="COMPONENTS[block.type]"
      :data="block.data"
      :media="media"
      :refs="refs?.[block.id]"
    />
  </template>
</template>
