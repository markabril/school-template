<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false, loading: false, block: false },
)

const styles: Record<string, string> = {
  primary: 'bg-maroon text-cream hover:bg-maroon-deep',
  secondary: 'bg-white text-maroon border border-hairline hover:bg-maroon-tint',
  ghost: 'text-ink-muted hover:bg-maroon-tint hover:text-maroon',
  danger: 'bg-white text-maroon border border-maroon hover:bg-maroon hover:text-cream',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
    :class="[
      styles[variant],
      block && 'w-full',
      'inline-flex items-center justify-center gap-2 rounded-card px-4 py-2.5 text-sm font-semibold',
      'transition-colors disabled:cursor-not-allowed disabled:opacity-55',
    ]"
  >
    <span
      v-if="loading"
      class="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
