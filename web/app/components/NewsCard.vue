<script setup lang="ts">
import type { PostSummary } from '~/types/content'

const props = withDefaults(
  defineProps<{
    post: PostSummary
    variant?: 'large' | 'standard' | 'compact'
    /** Chosen by the parent so the page's heading outline never skips a level. */
    headingLevel?: 2 | 3 | 4
  }>(),
  { variant: 'standard', headingLevel: 3 },
)

const href = computed(() => `/news/${props.post.slug}`)
const tag = computed(() => `h${props.headingLevel}`)
const src = (minWidth: number) =>
  props.post.cover
    ? (props.post.cover.srcset.find((s) => s.width >= minWidth)?.url ?? props.post.cover.url)
    : undefined
const ratio = computed(() => (props.variant === 'large' ? 'aspect-[16/9]' : 'aspect-[3/2]'))
</script>

<template>
  <article v-if="variant === 'compact'" data-news-card="compact" class="group">
    <NuxtLink :to="href" class="flex gap-4">
      <img
        v-if="post.cover"
        :src="src(400)"
        :alt="post.cover.alt"
        :width="post.cover.width ?? undefined"
        :height="post.cover.height ?? undefined"
        loading="lazy"
        class="size-20 shrink-0 rounded-card object-cover"
      />
      <div v-else class="size-20 shrink-0 rounded-card bg-maroon-tint" aria-hidden="true" />
      <div class="min-w-0">
        <component
          :is="tag"
          class="font-display text-base font-semibold leading-snug text-maroon underline-offset-4 group-hover:underline"
        >
          {{ post.title }}
        </component>
        <p class="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">{{ post.excerpt }}</p>
      </div>
    </NuxtLink>
  </article>

  <article v-else :data-news-card="variant" class="group">
    <NuxtLink :to="href" class="block">
      <img
        v-if="post.cover"
        :src="src(variant === 'large' ? 1200 : 800)"
        :srcset="srcsetFor(post.cover)"
        :sizes="variant === 'large' ? '(min-width: 1024px) 44rem, 92vw' : '(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw'"
        :alt="post.cover.alt"
        :width="post.cover.width ?? undefined"
        :height="post.cover.height ?? undefined"
        :loading="variant === 'large' ? 'eager' : 'lazy'"
        :class="ratio"
        class="w-full rounded-card object-cover"
      />
      <div v-else :class="ratio" class="w-full rounded-card bg-maroon-tint" aria-hidden="true" />

      <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink">
        <span v-if="post.category">{{ post.category }} &middot; </span>
        <time :datetime="post.publishedAt">{{ formatLongDate(post.publishedAt) }}</time>
      </p>
      <component
        :is="tag"
        class="mt-2 text-balance font-display font-semibold leading-snug text-maroon underline-offset-4 group-hover:underline"
        :class="variant === 'large' ? 'text-3xl' : 'text-xl'"
      >
        {{ post.title }}
      </component>
      <p class="mt-2 line-clamp-3 leading-relaxed text-ink-muted" :class="variant === 'large' ? 'text-lg' : ''">
        {{ post.excerpt }}
      </p>
    </NuxtLink>
  </article>
</template>
