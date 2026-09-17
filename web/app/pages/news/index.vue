<script setup lang="ts">
import type { PostSummary } from '~/types/content'

// Re-create the page when the query changes, so category and page links fetch
// fresh data instead of reusing the previous result.
definePageMeta({ key: (route) => route.fullPath })

const PER_PAGE = 12
const route = useRoute()

const category = typeof route.query.category === 'string' && route.query.category ? route.query.category : null
const page = Math.max(1, Number.parseInt(String(route.query.page ?? '1'), 10) || 1)

const params = new URLSearchParams({ limit: String(PER_PAGE), offset: String((page - 1) * PER_PAGE) })
if (category) params.set('category', category)

const [{ data }, { data: cats }] = await Promise.all([
  useApi<{ posts: PostSummary[]; total: number }>(`/content/posts?${params}`),
  useApi<{ categories: string[] }>('/content/posts/categories'),
])

const posts = computed(() => data.value?.posts ?? [])
const showFeatured = computed(() => page === 1 && !category && posts.value.length > 0)
const gridPosts = computed(() => (showFeatured.value ? posts.value.slice(1) : posts.value))
const hasOlder = computed(() => page * PER_PAGE < (data.value?.total ?? 0))

function href(opts: { category?: string | null; page?: number }) {
  const q = new URLSearchParams()
  if (opts.category) q.set('category', opts.category)
  if (opts.page && opts.page > 1) q.set('page', String(opts.page))
  const s = q.toString()
  return s ? `/news?${s}` : '/news'
}

useSeoMeta({
  title: category ? `News — ${category}` : 'News',
  description: category
    ? `${category} articles from Cherished Moments School.`
    : 'News and updates from Cherished Moments School.',
})
</script>

<template>
  <div>
    <PageHeader
      :title="category ?? 'News'"
      eyebrow="From the school"
      :intro="category ? undefined : 'Announcements, achievements and stories from around the school.'"
      :breadcrumbs="category ? [{ label: 'Home', to: '/' }, { label: 'News', to: '/news' }, { label: category }] : [{ label: 'Home', to: '/' }, { label: 'News' }]"
    />

    <div class="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <nav aria-label="News categories">
        <ul class="flex flex-wrap gap-2">
          <li>
            <NuxtLink :to="href({})" :aria-current="!category ? 'page' : undefined" class="chip" :class="{ 'chip-active': !category }">
              All
            </NuxtLink>
          </li>
          <li v-for="c in cats?.categories ?? []" :key="c">
            <NuxtLink
              :to="href({ category: c })"
              :aria-current="category === c ? 'page' : undefined"
              class="chip"
              :class="{ 'chip-active': category === c }"
            >
              {{ c }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <p v-if="!posts.length" class="mt-10 text-ink-muted">There is nothing here yet. Please check back soon.</p>

      <template v-else>
        <NewsCard v-if="showFeatured" :post="posts[0]!" variant="large" :heading-level="2" class="mt-10" />

        <ul v-if="gridPosts.length" class="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" :class="showFeatured ? 'mt-14' : 'mt-10'">
          <li v-for="p in gridPosts" :key="p.id">
            <NewsCard :post="p" :heading-level="2" />
          </li>
        </ul>
      </template>

      <!-- Real links, not "Load more": server-rendered, crawlable, shareable. -->
      <nav v-if="page > 1 || hasOlder" aria-label="Pagination" class="mt-14 flex justify-between gap-4">
        <NuxtLink v-if="page > 1" :to="href({ category, page: page - 1 })" class="btn-outline">← Newer articles</NuxtLink>
        <span v-else />
        <NuxtLink v-if="hasOlder" :to="href({ category, page: page + 1 })" class="btn-outline">Older articles →</NuxtLink>
      </nav>
    </div>
  </div>
</template>
