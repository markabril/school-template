<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="none"
    :show-limit="true"
    note="Events appear here automatically and drop off once they finish."
  />
</template>
