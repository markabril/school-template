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
  <section
    data-block="hero"
    class="relative isolate flex min-h-[28rem] items-center overflow-hidden md:min-h-[70vh]"
    :class="image ? 'bg-navy-deep' : 'bg-maroon'"
  >
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
        A flat scrim, not a gradient: text must clear WCAG AA against whatever
        photo is uploaded. A lighter top edge failed for the subtitle over a
        bright sky.
      -->
      <div class="absolute inset-0 -z-10 bg-navy-deep/70" />
    </template>

    <div class="mx-auto w-full max-w-4xl px-6 py-20 text-center">
      <h1 class="text-balance font-display text-4xl font-semibold leading-[1.08] text-cream sm:text-5xl lg:text-6xl">
        {{ data.title }}
      </h1>
      <div class="mx-auto mt-6 h-0.5 w-12 bg-gold" />
      <p v-if="data.subtitle" class="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-cream/90 sm:text-xl">
        {{ data.subtitle }}
      </p>

      <div v-if="data.ctas.length" class="mt-9 flex flex-wrap justify-center gap-3">
        <NuxtLink
          v-for="(cta, i) in data.ctas"
          :key="i"
          :to="cta.href"
          :class="i === 0 ? 'btn-gold' : 'btn-ghost-light'"
        >
          {{ cta.label }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
