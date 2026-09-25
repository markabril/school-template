<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'
import type { MediaItem } from '~/composables/useMedia'
import type { PostSummary } from '~/types/content'

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
  related: PostSummary[]
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
const related = computed(() => data.value?.related ?? [])
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
</script>

<template>
  <div>
    <PageHeader
      :title="post.title"
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'News', to: '/news' }, { label: post.title }]"
    >
      <p class="mt-5 flex flex-wrap items-center gap-3 text-sm text-cream/90">
        <NuxtLink
          v-if="post.category"
          :to="`/news?category=${encodeURIComponent(post.category)}`"
          class="rounded-full bg-cream/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-light hover:bg-cream/20"
        >
          {{ post.category }}
        </NuxtLink>
        <time :datetime="post.publishedAt">{{ formatLongDate(post.publishedAt) }}</time>
      </p>
    </PageHeader>

    <article class="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <img
        v-if="post.cover"
        :src="post.cover.srcset.find((s) => s.width >= 1200)?.url ?? post.cover.url"
        :srcset="srcsetFor(post.cover)"
        sizes="(min-width: 768px) 46rem, 92vw"
        :alt="post.cover.alt"
        :width="post.cover.width ?? undefined"
        :height="post.cover.height ?? undefined"
        class="w-full rounded-card object-cover"
      />
      <p v-if="post.excerpt" class="text-pretty text-xl leading-relaxed text-ink-muted" :class="post.cover ? 'mt-10' : ''">
        {{ post.excerpt }}
      </p>
      <div class="mt-8">
        <RichTextRenderer :doc="post.body" />
      </div>
    </article>

    <section v-if="related.length" class="border-t border-hairline bg-white">
      <div class="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading :title="`More from ${post.category}`" />
        <ul class="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="r in related" :key="r.id">
            <NewsCard :post="r" :heading-level="3" />
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
