<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'

const model = defineModel<Record<string, unknown>>({ required: true })

const doc = computed({
  get: () => model.value.doc as RichTextDoc,
  set: (v) => (model.value = { ...model.value, doc: v }),
})
</script>

<template>
  <AdminRichTextInput v-model="doc" />
</template>
