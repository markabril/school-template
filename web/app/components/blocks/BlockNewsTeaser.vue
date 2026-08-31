<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface PostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string | null
  publishedAt: string
  cover: MediaItem | null
}

// `refs` is resolved server-side by the page endpoint, so this renders during
// SSR with no client fetch — see api/src/modules/pages/references.ts.
const props = defineProps<{ data: { heading?: string }; refs?: PostSummary[] }>()

const posts = computed(() => props.refs ?? [])
const fmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <section v-if="posts.length" class="mx-auto max-w-5xl px-6 py-12">
    <div class="flex items-baseline justify-between gap-4">
      <h2 v-if="data.heading" class="font-display text-2xl font-semibold text-maroon">
        {{ data.heading }}
      </h2>
      <NuxtLink to="/news" class="text-sm text-gold-ink underline underline-offset-2">
        All news
      </NuxtLink>
    </div>

    <ul class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="post in posts" :key="post.id">
        <NuxtLink :to="`/news/${post.slug}`" class="group block">
          <img
            v-if="post.cover"
            :src="post.cover.srcset.find((s) => s.width >= 400)?.url ?? post.cover.url"
            :srcset="srcsetFor(post.cover)"
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
            :alt="post.cover.alt"
            :width="post.cover.width ?? undefined"
            :height="post.cover.height ?? undefined"
            loading="lazy"
            class="aspect-[3/2] w-full rounded-card object-cover"
          />
          <div v-else class="aspect-[3/2] w-full rounded-card bg-maroon-tint" />

          <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-gold-ink">
            <time :datetime="post.publishedAt">{{ fmt(post.publishedAt) }}</time>
          </p>
          <h3 class="mt-1 font-display text-lg font-semibold text-maroon group-hover:underline">
            {{ post.title }}
          </h3>
          <p class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {{ post.excerpt }}
          </p>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
