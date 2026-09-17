<script setup lang="ts">
import type { StoriesColumn } from '~/types/content'

const props = defineProps<{ data: { heading?: string }; refs?: StoriesColumn[] }>()

const columns = computed(() => props.refs ?? [])
const anyPosts = computed(() => columns.value.some((c) => c.posts.length))
// Keep the outline unbroken: with a block heading the column titles drop a level.
const columnLevel = computed(() => (props.data.heading ? 3 : 2))
const cardLevel = computed(() => (props.data.heading ? 4 : 3))
const gridCols = computed(() =>
  columns.value.length === 3 ? 'lg:grid-cols-3' : columns.value.length === 2 ? 'md:grid-cols-2' : '',
)
</script>

<template>
  <section v-if="anyPosts" data-block="storiesColumns" class="mx-auto max-w-6xl px-5 py-14 sm:py-16">
    <SectionHeading v-if="data.heading" :title="data.heading" />

    <div class="grid gap-12" :class="[gridCols, data.heading ? 'mt-10' : '']">
      <div v-for="col in columns" :key="col.category" data-stories-column class="flex flex-col">
        <SectionHeading :title="col.title" :level="columnLevel" />

        <ul v-if="col.posts.length" class="mt-6 space-y-5">
          <li v-for="p in col.posts" :key="p.id">
            <NewsCard :post="p" variant="compact" :heading-level="cardLevel" />
          </li>
        </ul>
        <p v-else class="mt-6 text-sm text-ink-muted">Nothing here yet.</p>

        <div class="mt-auto pt-6">
          <NuxtLink :to="`/news?category=${encodeURIComponent(col.category)}`" class="btn-outline">
            See more<span class="sr-only"> from {{ col.title }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
