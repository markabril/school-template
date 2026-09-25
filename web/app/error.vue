<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const is404 = computed(() => props.error?.statusCode === 404)

useHead({
  title: () => (is404.value ? 'Page not found' : 'Something went wrong'),
  meta: [{ name: 'robots', content: 'noindex' }],
})

/**
 * Self-contained on purpose: the default layout fetches site chrome from the
 * API, and the likeliest cause of a 500 is the API being unreachable.
 */
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-maroon px-6 py-16">
    <div class="w-full max-w-md text-center">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">Cherished Moments School</p>
      <h1 class="mt-4 font-display text-4xl font-semibold text-cream">
        {{ is404 ? 'We cannot find that page' : 'Something went wrong' }}
      </h1>
      <div class="mx-auto mt-5 h-0.5 w-11 bg-gold" />
      <p class="mt-5 leading-relaxed text-cream/90">
        <template v-if="is404">The page may have been moved or removed. The links below should help.</template>
        <template v-else>Please try again in a moment. If it keeps happening, telephone the school office.</template>
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <NuxtLink to="/" class="btn-gold">Go to the homepage</NuxtLink>
        <NuxtLink to="/contact" class="btn-ghost-light">Contact the school</NuxtLink>
      </div>
      <p class="mt-10 text-xs text-cream/70">Error {{ error?.statusCode }}</p>
    </div>
  </div>
</template>
