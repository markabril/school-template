<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'
import type { MediaItem } from '~/composables/useMedia'

interface PostDetail {
  post: {
    id: string
    slug: string
    title: string
    excerpt: string | null
    body: RichTextDoc | null
    category: string | null
    publishedAt: string
    seo: Record<string, string | boolean> | null
    cover: MediaItem | null
  }
  redirectTo?: string
}

const slug = useRoute().params.slug as string
const { data, error } = await useApi<PostDetail>(`/content/posts/${slug}`)

if (data.value?.redirectTo) {
  await navigateTo(data.value.redirectTo, { redirectCode: 301, replace: true })
}
if (error.value || !data.value?.post) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found', fatal: true })
}

const post = computed(() => data.value!.post)
const seo = computed(() => post.value.seo ?? {})

useSeoMeta({
  title: () => (seo.value.title as string) || post.value.title,
  description: () => (seo.value.description as string) || post.value.excerpt || undefined,
  ogType: 'article',
  ogTitle: () => post.value.title,
  ogImage: () => post.value.cover?.url,
  articlePublishedTime: () => post.value.publishedAt,
})

useArticleSchema({
  title: post.value.title,
  excerpt: post.value.excerpt,
  publishedAt: post.value.publishedAt,
  coverUrl: post.value.cover?.url,
  slug: post.value.slug,
})

const fmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <article class="mx-auto max-w-2xl px-6 py-12 sm:py-16">
    <NuxtLink
      to="/news"
      class="text-sm text-gold-ink underline underline-offset-2 hover:text-maroon"
    >
      ← All news
    </NuxtLink>

    <p class="mt-8 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink">
      <span v-if="post.category">{{ post.category }} &middot; </span>
      <time :datetime="post.publishedAt">{{ fmt(post.publishedAt) }}</time>
    </p>
    <h1 class="mt-2 text-balance font-display text-3xl font-semibold leading-tight text-maroon sm:text-4xl">
      {{ post.title }}
    </h1>
    <div class="mt-5 h-0.5 w-11 bg-gold" />
    <p v-if="post.excerpt" class="mt-5 text-pretty text-lg leading-relaxed text-ink-muted">
      {{ post.excerpt }}
    </p>

    <img
      v-if="post.cover"
      :src="post.cover.srcset.find((s) => s.width >= 800)?.url ?? post.cover.url"
      :srcset="srcsetFor(post.cover)"
      sizes="(min-width: 768px) 42rem, 90vw"
      :alt="post.cover.alt"
      :width="post.cover.width ?? undefined"
      :height="post.cover.height ?? undefined"
      class="mt-6 w-full rounded-card object-cover"
    />
    <p v-if="post.cover?.caption" class="mt-2 text-xs text-ink-muted">{{ post.cover.caption }}</p>

    <div class="mt-8">
      <RichTextRenderer :doc="post.body" />
    </div>
  </article>
</template>
