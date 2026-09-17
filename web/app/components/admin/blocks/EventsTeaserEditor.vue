<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })

const layouts = [
  { value: 'featured', label: 'Featured', hint: 'The next event large with its picture, the rest listed beside it.' },
  { value: 'list', label: 'List', hint: 'A simple dated list.' },
]
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="none"
    :show-limit="true"
    :layouts="layouts"
    note="Events appear here automatically and drop off once they finish."
  />
</template>
