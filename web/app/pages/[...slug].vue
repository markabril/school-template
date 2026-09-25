<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

/**
 * Catch-all for CMS pages. Every public URL resolves through here.
 *
 * Kept last in route priority by Nuxt's file conventions, so real pages like
 * /news win over a CMS page that happens to share the slug.
 */
interface PageResponse {
  page: { id: string; slug: string; title: string; seo: Record<string, unknown> | null }
  blocks: Array<{ id: string; type: string; data: unknown }>
  media: MediaItem[]
  refs: Record<string, unknown>
  redirectTo?: string
}

const route = useRoute()
const slugParam = computed(() => {
  const s = route.params.slug
  const parts = Array.isArray(s) ? s : [s].filter(Boolean)
  // An empty path is the homepage, which is stored under the 'home' slug.
  return parts.length ? parts.join('/') : 'home'
})

const { data, error } = await useApi<PageResponse>(`/content/pages/by-slug/${slugParam.value}`)

// A renamed slug returns 301 with the new address rather than 404ing — a page
// shared in a newsletter or printed on a form must keep working.
if (data.value?.redirectTo) {
  await navigateTo(data.value.redirectTo, { redirectCode: 301, replace: true })
}

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const seo = computed(() => (data.value?.page.seo ?? {}) as Record<string, string | boolean>)

useSeoMeta({
  title: () => (seo.value.title as string) || data.value?.page.title,
  description: () => (seo.value.description as string) || undefined,
  ogTitle: () => (seo.value.title as string) || data.value?.page.title,
  ogDescription: () => (seo.value.description as string) || undefined,
  robots: () => (seo.value.noindex ? 'noindex, nofollow' : undefined),
})
</script>

<template>
  <div v-if="data">
    <!-- Pages that do not open with a Hero get a title automatically, so an
         editor cannot publish a page with no heading. -->
    <PageHeader
      v-if="data.blocks[0]?.type !== 'hero'"
      :title="data.page.title"
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: data.page.title }]"
    />
    <BlockRenderer :blocks="data.blocks" :media="data.media" :refs="data.refs" />
  </div>
</template>
