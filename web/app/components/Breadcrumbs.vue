<script setup lang="ts">
defineProps<{ items: Array<{ label: string; to?: string }> }>()
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-cream/80">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-2">
        <span v-if="i > 0" aria-hidden="true" class="text-gold-light">›</span>
        <NuxtLink
          v-if="item.to && i < items.length - 1"
          :to="item.to"
          class="underline-offset-4 hover:text-cream hover:underline"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else aria-current="page" class="text-cream">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
