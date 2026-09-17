<script setup lang="ts">
import type { EventItem } from '~/types/content'

const props = defineProps<{
  data: { heading?: string; layout?: 'featured' | 'list' }
  refs?: EventItem[]
}>()

const events = computed(() => props.refs ?? [])
const layout = computed(() => props.data.layout ?? 'list')
const featured = computed(() => events.value[0])
const rest = computed(() => events.value.slice(1))
const titleTag = computed(() => (props.data.heading ? 'h3' : 'h2'))
</script>

<template>
  <section v-if="events.length" data-block="eventsTeaser" :data-layout="layout" class="border-y border-hairline bg-white py-14 sm:py-16">
    <div class="mx-auto max-w-6xl px-5">
      <SectionHeading v-if="data.heading" :title="data.heading" />

      <div v-if="layout === 'featured' && featured" class="grid gap-8 lg:grid-cols-5" :class="data.heading ? 'mt-8' : ''">
        <article class="overflow-hidden rounded-card border border-hairline bg-cream" :class="rest.length ? 'lg:col-span-3' : 'lg:col-span-5'">
          <div class="relative aspect-[16/9] bg-maroon">
            <img
              v-if="featured.cover"
              :src="featured.cover.srcset.find((s) => s.width >= 1200)?.url ?? featured.cover.url"
              :srcset="srcsetFor(featured.cover)"
              sizes="(min-width: 1024px) 40rem, 92vw"
              :alt="featured.cover.alt"
              :width="featured.cover.width ?? undefined"
              :height="featured.cover.height ?? undefined"
              loading="lazy"
              class="size-full object-cover"
            />
            <!-- No picture: the date itself becomes the image, never an empty box. -->
            <div v-else class="grid size-full place-items-center">
              <DateBadge :date="featured.startsAt" size="lg" tone="dark" />
            </div>
          </div>
          <div class="flex gap-5 p-6">
            <DateBadge v-if="featured.cover" :date="featured.startsAt" />
            <div class="min-w-0 self-center">
              <component :is="titleTag" class="font-display text-2xl font-semibold leading-snug text-maroon">
                {{ featured.title }}
              </component>
              <p class="mt-2 text-sm text-ink-muted">
                {{ eventWhen(featured) }}<template v-if="featured.location"> &middot; {{ featured.location }}</template>
              </p>
            </div>
          </div>
        </article>

        <ul v-if="rest.length" class="divide-y divide-hairline lg:col-span-2">
          <li v-for="e in rest" :key="e.id" class="flex gap-5 py-5 first:pt-0">
            <DateBadge :date="e.startsAt" />
            <div class="min-w-0 self-center">
              <component :is="titleTag" class="font-display text-lg font-semibold leading-snug text-maroon">
                {{ e.title }}
              </component>
              <p class="mt-1 text-sm text-ink-muted">
                {{ eventWhen(e) }}<template v-if="e.location"> &middot; {{ e.location }}</template>
              </p>
            </div>
          </li>
        </ul>
      </div>

      <ul v-else class="space-y-3" :class="data.heading ? 'mt-8' : ''">
        <li v-for="e in events" :key="e.id" class="flex items-center gap-5 rounded-card border border-hairline bg-cream p-4">
          <DateBadge :date="e.startsAt" />
          <div class="min-w-0">
            <component :is="titleTag" class="font-medium text-ink">{{ e.title }}</component>
            <p v-if="e.location" class="mt-0.5 text-sm text-ink-muted">{{ e.location }}</p>
          </div>
        </li>
      </ul>

      <div class="mt-10 flex justify-end">
        <NuxtLink to="/events" class="btn-maroon">Full calendar</NuxtLink>
      </div>
    </div>
  </section>
</template>
