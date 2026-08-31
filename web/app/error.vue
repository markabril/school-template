<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error?.statusCode === 404)

useHead({
  title: () => (is404.value ? 'Page not found' : 'Something went wrong'),
  meta: [{ name: 'robots', content: 'noindex' }],
})

/**
 * The error page cannot use the default layout: that layout fetches site chrome
 * from the API, and the most likely reason for a 500 is that the API is exactly
 * what is unreachable. A self-contained page still renders when everything else
 * is down.
 */
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-cream px-6 py-16">
    <div class="w-full max-w-md text-center">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
        Cherished Moments School
      </p>

      <h1 class="mt-4 font-display text-3xl font-semibold text-maroon sm:text-4xl">
        {{ is404 ? 'We cannot find that page' : 'Something went wrong' }}
      </h1>
      <div class="mx-auto mt-5 h-0.5 w-11 bg-gold" />

      <p class="mt-5 leading-relaxed text-ink-muted">
        <template v-if="is404">
          The page may have been moved or removed. The links below should help.
        </template>
        <template v-else>
          Please try again in a moment. If it keeps happening, telephone the school office.
        </template>
      </p>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <NuxtLink to="/">
          <UiButton>Go to the homepage</UiButton>
        </NuxtLink>
        <NuxtLink to="/contact">
          <UiButton variant="secondary">Contact the school</UiButton>
        </NuxtLink>
      </div>

      <!-- The status code is shown small rather than as a giant "404": it is
           useful to anyone reporting the problem and meaningless to everyone
           else, so it should not be the loudest thing on the page. -->
      <p class="mt-10 text-xs text-ink-muted/70">Error {{ error?.statusCode }}</p>
    </div>
  </div>
</template>
