<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'error' | 'success' | 'info' }>(), { tone: 'info' })

const tones: Record<string, string> = {
  error: 'bg-maroon-tint text-maroon border-maroon/25',
  success: 'bg-gold-tint text-gold-ink border-gold/30',
  info: 'bg-navy-tint text-navy border-navy/20',
}
</script>

<template>
  <!--
    role="alert" so the message is announced when it appears. Without it a
    failed login is silent for anyone not watching that part of the screen.
  -->
  <div
    role="alert"
    :class="[tones[tone], 'rounded-card border px-3.5 py-3 text-sm leading-relaxed']"
  >
    <slot />
  </div>
</template>
