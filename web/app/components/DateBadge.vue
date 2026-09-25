<script setup lang="ts">
/** Month over day — the visual anchor parents scan a calendar for. */
withDefaults(defineProps<{ date: string; size?: 'md' | 'lg'; tone?: 'light' | 'dark' }>(), {
  size: 'md',
  tone: 'light',
})
</script>

<template>
  <time
    :datetime="date"
    data-date-badge
    class="flex shrink-0 flex-col items-center leading-none"
    :class="size === 'lg' ? 'w-24' : 'w-14'"
  >
    <span
      class="font-bold uppercase tracking-[0.14em]"
      :class="[size === 'lg' ? 'text-sm' : 'text-[11px]', tone === 'dark' ? 'text-gold-light' : 'text-gold-ink']"
    >
      {{ formatMonthShort(date) }}
    </span>
    <span
      class="mt-1 font-display font-semibold"
      :class="[size === 'lg' ? 'text-6xl' : 'text-3xl', tone === 'dark' ? 'text-cream' : 'text-maroon']"
    >
      {{ formatDay(date) }}
    </span>
  </time>
</template>
