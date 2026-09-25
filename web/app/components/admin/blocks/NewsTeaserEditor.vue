<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })

const layouts = [
  { value: 'featured', label: 'Featured', hint: 'One large story beside two smaller ones. Shows at least 3.' },
  { value: 'grid', label: 'Grid', hint: 'Equal cards in rows of three.' },
]
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="category"
    :show-limit="true"
    :layouts="layouts"
    note="Articles appear here automatically as you publish them. You do not need to edit this block again."
  />
</template>
