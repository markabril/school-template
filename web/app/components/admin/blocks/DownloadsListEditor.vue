<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="category"
    :show-limit="false"
    note="Files appear here automatically once they are published on the Downloads screen."
  />
</template>
