<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface DownloadItem {
  id: string
  title: string
  description: string | null
  category: string | null
  file: MediaItem | null
}

const props = defineProps<{ data: { heading?: string }; refs?: DownloadItem[] }>()
const items = computed(() => props.refs?.filter((d) => d.file) ?? [])

const kind = (mime: string) => (mime === 'application/pdf' ? 'PDF' : mime.split('/')[1]?.toUpperCase() ?? 'FILE')
</script>

<template>
  <section v-if="items.length" class="mx-auto max-w-3xl px-6 py-12">
    <h2 v-if="data.heading" class="font-display text-2xl font-semibold text-maroon">
      {{ data.heading }}
    </h2>

    <ul class="mt-6 divide-y divide-hairline rounded-card border border-hairline bg-white">
      <li v-for="d in items" :key="d.id">
        <!--
          `download` plus the file type and size in the link text: parents on
          mobile data deserve to know they are about to pull a 4MB PDF before
          they tap, and a bare "Prospectus" link tells them nothing.
        -->
        <a
          :href="d.file!.url"
          download
          class="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gold-tint/40"
        >
          <span
            class="shrink-0 rounded bg-maroon-tint px-2 py-1 text-xs font-bold text-maroon"
            aria-hidden="true"
          >
            {{ kind(d.file!.mime) }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-medium text-ink">{{ d.title }}</span>
            <span v-if="d.description" class="mt-0.5 block text-sm text-ink-muted">
              {{ d.description }}
            </span>
          </span>
          <span class="shrink-0 text-xs text-ink-muted">
            {{ kind(d.file!.mime) }}, {{ formatBytes(d.file!.size) }}
          </span>
        </a>
      </li>
    </ul>
  </section>
</template>
