<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'
import type { MediaItem } from '~/composables/useMedia'

const props = defineProps<{
  data: {
    heading?: string
    doc: RichTextDoc
    imageMediaId: string | null
    imagePosition: 'left' | 'right'
  }
  media: MediaItem[]
}>()

const image = computed(() =>
  props.data.imageMediaId ? props.media.find((m) => m.id === props.data.imageMediaId) : undefined,
)
</script>

<template>
  <section class="mx-auto max-w-5xl px-6 py-12">
    <div class="grid items-center gap-8 md:grid-cols-2">
      <div v-if="image" :class="data.imagePosition === 'right' ? 'md:order-2' : ''">
        <img
          :src="image.srcset.find((s) => s.width >= 800)?.url ?? image.url"
          :srcset="srcsetFor(image)"
          sizes="(min-width: 768px) 32rem, 90vw"
          :alt="image.alt"
          :width="image.width ?? undefined"
          :height="image.height ?? undefined"
          loading="lazy"
          class="w-full rounded-card object-cover"
        />
        <p v-if="image.caption" class="mt-2 text-xs text-ink-muted">{{ image.caption }}</p>
      </div>

      <div>
        <h2 v-if="data.heading" class="font-display text-2xl font-semibold text-maroon">
          {{ data.heading }}
        </h2>
        <div :class="data.heading ? 'mt-4' : ''">
          <RichTextRenderer :doc="data.doc" />
        </div>
      </div>
    </div>
  </section>
</template>
