<script setup lang="ts">
/**
 * The maroon title band every non-hero page opens with. One component, so the
 * band cannot drift between pages.
 */
defineProps<{
  title: string
  intro?: string
  eyebrow?: string
  breadcrumbs?: Array<{ label: string; to?: string }>
}>()
</script>

<template>
  <header data-page-header class="bg-maroon">
    <div class="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <Breadcrumbs v-if="breadcrumbs?.length" :items="breadcrumbs" />
      <p
        v-if="eyebrow"
        class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light"
        :class="breadcrumbs?.length ? 'mt-6' : ''"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="text-balance font-display text-4xl font-semibold leading-tight text-cream sm:text-5xl"
        :class="eyebrow ? 'mt-2' : breadcrumbs?.length ? 'mt-6' : ''"
      >
        {{ title }}
      </h1>
      <!-- The gold rule from the crest's tree: once per page, under the title. -->
      <div class="mt-5 h-0.5 w-11 bg-gold" />
      <p v-if="intro" class="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-cream/90">{{ intro }}</p>
      <slot />
    </div>
  </header>
</template>
