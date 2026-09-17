<script setup lang="ts">
import type { PostSummary } from '~/types/content'

// `refs` is resolved server-side by the page endpoint, so this renders during
// SSR with no client fetch — see api/src/modules/pages/references.ts.
const props = defineProps<{
  data: { heading?: string; category?: string | null; layout?: 'featured' | 'grid' }
  refs?: PostSummary[]
}>()

const posts = computed(() => props.refs ?? [])
// Blocks saved before layouts existed have no value and keep the grid.
const layout = computed(() => props.data.layout ?? 'grid')
const moreHref = computed(() =>
  props.data.category ? `/news?category=${encodeURIComponent(props.data.category)}` : '/news',
)
</script>

<template>
  <section v-if="posts.length" data-block="newsTeaser" :data-layout="layout" class="mx-auto max-w-6xl px-5 py-14 sm:py-16">
    <SectionHeading v-if="data.heading" :title="data.heading" />

    <!-- Featured: one large story beside two stacked; degrades for 1 or 2. -->
    <div v-if="layout === 'featured'" class="grid gap-8" :class="[data.heading ? 'mt-8' : '', posts.length >= 3 ? 'lg:grid-cols-3' : posts.length === 2 ? 'md:grid-cols-2' : '']">
      <NewsCard
        :post="posts[0]!"
        :variant="posts.length === 2 ? 'standard' : 'large'"
        :heading-level="data.heading ? 3 : 2"
        :class="posts.length >= 3 ? 'lg:col-span-2' : ''"
      />
      <div v-if="posts.length >= 3" class="grid content-start gap-8 sm:grid-cols-2 lg:grid-cols-1">
        <NewsCard v-for="p in posts.slice(1, 3)" :key="p.id" :post="p" :heading-level="data.heading ? 3 : 2" />
      </div>
      <NewsCard v-else-if="posts.length === 2" :post="posts[1]!" :heading-level="data.heading ? 3 : 2" />
    </div>

    <ul v-else class="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" :class="data.heading ? 'mt-8' : ''">
      <li v-for="p in posts" :key="p.id">
        <NewsCard :post="p" :heading-level="data.heading ? 3 : 2" />
      </li>
    </ul>

    <div class="mt-10 flex justify-end">
      <NuxtLink :to="moreHref" class="btn-maroon">See more news</NuxtLink>
    </div>
  </section>
</template>
