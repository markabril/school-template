<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface PreviewResponse {
  page: { id: string; slug: string; title: string; status: string }
  blocks: Array<{ id: string; type: string; data: unknown }>
  media: MediaItem[]
  refs: Record<string, unknown>
}

// No site chrome: preview shows the page content itself, so a reviewer is not
// distracted by navigation that is not part of what they are reviewing.
definePageMeta({ layout: false })

const token = useRoute().params.token as string
const { data, error } = await useApi<PreviewResponse>(`/content/pages/preview/${token}`)

useHead({
  title: () => `Preview — ${data.value?.page.title ?? 'Page'}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<template>
  <div>
    <!--
      A persistent banner, not a subtle badge. Someone reviewing a draft must
      never mistake it for the live site and report a problem that does not
      exist — or worse, assume unpublished content is public.
    -->
    <div class="sticky top-0 z-50 bg-gold-ink px-4 py-2 text-center text-sm font-semibold text-cream">
      Preview — this is a draft and is not visible on the website.
      <span v-if="data" class="font-normal opacity-80">({{ data.page.status }})</span>
    </div>

    <UiAlert v-if="error" tone="error" class="m-6">
      This preview link is invalid or has expired. Preview links last 30 minutes — ask for a new one.
    </UiAlert>

    <main v-else-if="data" id="main">
      <BlockRenderer :blocks="data.blocks" :media="data.media" :refs="data.refs" />
    </main>
  </div>
</template>
