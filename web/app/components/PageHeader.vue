<script setup lang="ts">
/**
 * The masthead every non-CMS page opens with.
 *
 * Extracted because five pages had hand-written variants that had already
 * drifted in spacing. One component means the rule is enforced rather than
 * remembered.
 */
defineProps<{
  title: string
  intro?: string
  eyebrow?: string
}>()
</script>

<template>
  <header class="border-b border-hairline bg-white">
    <div class="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <p
        v-if="eyebrow"
        class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink"
      >
        {{ eyebrow }}
      </p>
      <h1 class="mt-2 text-balance font-display text-3xl font-semibold text-maroon sm:text-4xl">
        {{ title }}
      </h1>
      <!-- The gold rule is the one motif carried from the crest's tree. It
           appears once per page, under the title, and nowhere else. -->
      <div class="mt-5 h-0.5 w-11 bg-gold" />
      <p v-if="intro" class="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-ink-muted">
        {{ intro }}
      </p>
    </div>
  </header>
</template>
