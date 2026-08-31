<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'

defineProps<{ data: { doc: RichTextDoc } }>()
</script>

<template>
  <section class="mx-auto max-w-2xl px-6 py-12">
    <RichTextRenderer :doc="data.doc" />
  </section>
</template>
