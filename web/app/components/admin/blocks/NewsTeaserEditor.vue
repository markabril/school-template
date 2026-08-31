<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="category"
    :show-limit="true"
    note="Articles appear here automatically as you publish them. You do not need to edit this block again."
  />
</template>
