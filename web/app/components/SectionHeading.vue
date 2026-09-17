<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    level?: 2 | 3
    link?: { label: string; href: string }
  }>(),
  { level: 2 },
)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div>
      <component
        :is="`h${level}`"
        class="font-display font-semibold text-maroon"
        :class="level === 2 ? 'text-3xl' : 'text-2xl'"
      >
        {{ title }}
      </component>
      <div class="mt-3 h-0.5 w-11 bg-gold" />
    </div>
    <NuxtLink
      v-if="link"
      :to="link.href"
      class="text-sm font-semibold text-gold-ink underline underline-offset-4 hover:text-maroon"
    >
      {{ link.label }}
    </NuxtLink>
  </div>
</template>
