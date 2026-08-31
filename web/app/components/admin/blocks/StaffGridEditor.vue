<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="department"
    :show-limit="false"
    note="Staff appear here automatically once they are published on the Staff screen."
  />
</template>
