<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

const props = defineProps<{
  data: { title: string; subtitle?: string; imageMediaId: string | null; ctas: Array<{ label: string; href: string }> }
  media: MediaItem[]
}>()

const image = computed(() =>
  props.data.imageMediaId ? props.media.find((m) => m.id === props.data.imageMediaId) : undefined,
)
</script>

<template>
  <section class="relative isolate overflow-hidden" :class="image ? 'bg-navy-deep' : 'bg-maroon'">
    <template v-if="image">
      <img
        :src="image.srcset.at(-1)?.url ?? image.url"
        :srcset="srcsetFor(image)"
        sizes="100vw"
        :alt="image.alt"
        :width="image.width ?? undefined"
        :height="image.height ?? undefined"
        fetchpriority="high"
        class="absolute inset-0 -z-10 size-full object-cover"
      />
      <!--
        Scrim, not a lower opacity on the image: the text must clear WCAG AA
        against whatever photo the office uploads, and we cannot know in advance
        how light that photo is.
      -->
      <div class="absolute inset-0 -z-10 bg-navy-deep/72" />
    </template>

    <div class="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
      <h1
        class="text-balance font-display text-4xl font-semibold leading-[1.1] text-cream sm:text-5xl"
      >
        {{ data.title }}
      </h1>
      <div class="mx-auto mt-6 h-0.5 w-12 bg-gold" />
      <p
        v-if="data.subtitle"
        class="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-cream/85"
      >
        {{ data.subtitle }}
      </p>

      <div v-if="data.ctas.length" class="mt-8 flex flex-wrap justify-center gap-3">
        <NuxtLink
          v-for="(cta, i) in data.ctas"
          :key="i"
          :to="cta.href"
          class="rounded-card px-5 py-3 text-sm font-semibold transition-colors"
          :class="
            i === 0
              ? 'bg-cream text-maroon hover:bg-white'
              : 'border border-cream/40 text-cream hover:bg-cream/10'
          "
        >
          {{ cta.label }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
