<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface DownloadItem {
  id: string
  title: string
  description: string | null
  category: string | null
  file: MediaItem | null
}

const { data } = await useApi<{ downloads: DownloadItem[] }>('/content/downloads')

const groups = computed(() => {
  const out = new Map<string, DownloadItem[]>()
  for (const item of data.value?.downloads ?? []) {
    // A row whose file was deleted from Media would render as a dead link.
    if (!item.file) continue
    const key = item.category ?? 'Documents'
    if (!out.has(key)) out.set(key, [])
    out.get(key)!.push(item)
  }
  return [...out.entries()]
})

const kind = (mime: string) => (mime === 'application/pdf' ? 'PDF' : (mime.split('/')[1]?.toUpperCase() ?? 'FILE'))

useSeoMeta({
  title: 'Forms and downloads',
  description: 'Forms, policies and documents to download.',
})
</script>

<template>
  <div>
    <PageHeader
      title="Forms and downloads"
      eyebrow="For parents"
      intro="Forms, policies and documents to download."
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'Forms and downloads' }]"
    />

    <div class="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p v-if="!groups.length" class="text-ink-muted">There are no documents to download at the moment.</p>

      <section v-for="[category, items] in groups" :key="category" class="mb-12 last:mb-0">
        <SectionHeading :title="category" />

        <ul class="mt-6 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-white">
          <li v-for="d in items" :key="d.id">
            <a :href="d.file!.url" download class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gold-tint/40">
              <span class="shrink-0 rounded bg-maroon px-2 py-1 text-xs font-bold text-cream" aria-hidden="true">
                {{ kind(d.file!.mime) }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block font-medium text-ink">{{ d.title }}</span>
                <span v-if="d.description" class="mt-0.5 block text-sm text-ink-muted">{{ d.description }}</span>
              </span>
              <!-- Type and size in the link: parents on mobile data deserve to know before they tap. -->
              <span class="shrink-0 text-xs text-ink-muted">{{ kind(d.file!.mime) }}, {{ formatBytes(d.file!.size) }}</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
