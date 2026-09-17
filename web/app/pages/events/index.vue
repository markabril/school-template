<script setup lang="ts">
import type { EventItem } from '~/types/content'

const { data } = await useApi<{ events: EventItem[] }>('/content/events?limit=40')

const months = computed(() => {
  const groups = new Map<string, EventItem[]>()
  for (const e of data.value?.events ?? []) {
    const key = formatMonthYear(e.startsAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }
  return [...groups.entries()]
})

useSeoMeta({
  title: 'Events',
  description: 'Upcoming events at Cherished Moments School.',
})

// Schools get real value from event rich results — a parent searching for the
// school often gets the next event surfaced directly.
useEventListSchema(data.value?.events ?? [])
</script>

<template>
  <div>
    <PageHeader
      title="Events"
      eyebrow="School calendar"
      intro="What is coming up. Events stay listed until they finish."
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'Events' }]"
    />

    <div class="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p v-if="!months.length" class="text-ink-muted">There are no upcoming events at the moment.</p>

      <section v-for="[month, items] in months" :key="month" class="mb-14 last:mb-0">
        <h2 class="border-b border-hairline pb-3 font-display text-2xl font-semibold text-maroon">{{ month }}</h2>

        <ul class="mt-2 divide-y divide-hairline">
          <li v-for="e in items" :key="e.id" class="flex gap-6 py-6">
            <DateBadge :date="e.startsAt" />
            <div class="min-w-0">
              <h3 class="font-display text-xl font-semibold leading-snug text-maroon">{{ e.title }}</h3>
              <p class="mt-1.5 text-sm text-ink-muted">
                {{ eventWhen(e) }}<template v-if="e.location"> &middot; {{ e.location }}</template>
              </p>
              <div v-if="e.description" class="mt-3 text-sm">
                <RichTextRenderer :doc="e.description" />
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
