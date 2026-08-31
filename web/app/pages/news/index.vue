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

const { data } = await useApi<{ posts: PostSummary[]; total: number }>('/content/posts?limit=24')

useSeoMeta({
  title: 'News',
  description: 'News and updates from Cherished Moments School.',
})

const fmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <div>
    <PageHeader
      title="News"
      eyebrow="From the school"
      intro="Announcements, achievements and stories from around the school."
    />

    <div class="mx-auto max-w-5xl px-6 py-12 sm:py-16">
    <p v-if="!data?.posts.length" class="text-ink-muted">
      There is nothing here yet. Please check back soon.
    </p>

    <ul v-else class="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="post in data.posts" :key="post.id">
        <article>
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

            <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink">
              <span v-if="post.category">{{ post.category }} &middot; </span>
              <time :datetime="post.publishedAt">{{ fmt(post.publishedAt) }}</time>
            </p>
            <h2
              class="mt-2 text-balance font-display text-xl font-semibold leading-snug text-maroon underline-offset-4 group-hover:underline"
            >
              {{ post.title }}
            </h2>
            <p class="mt-2 line-clamp-3 leading-relaxed text-ink-muted">
              {{ post.excerpt }}
            </p>
          </NuxtLink>
        </article>
      </li>
    </ul>
    </div>
  </div>
</template>
