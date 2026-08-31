<script setup lang="ts">
interface EventItem {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
}

const props = defineProps<{ data: { heading?: string }; refs?: EventItem[] }>()

const events = computed(() => props.refs ?? [])
const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric' })
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' })
</script>

<template>
  <section v-if="events.length" class="bg-navy-tint/40 py-12">
    <div class="mx-auto max-w-3xl px-6">
      <div class="flex items-baseline justify-between gap-4">
        <h2 v-if="data.heading" class="font-display text-2xl font-semibold text-maroon">
          {{ data.heading }}
        </h2>
        <NuxtLink to="/events" class="text-sm text-gold-ink underline underline-offset-2">
          Full calendar
        </NuxtLink>
      </div>

      <ul class="mt-6 space-y-3">
        <li
          v-for="e in events"
          :key="e.id"
          class="flex items-center gap-5 rounded-card bg-white p-4"
        >
          <div class="shrink-0 text-center">
            <div class="text-xl font-semibold leading-none text-maroon">
              {{ dayFmt.format(new Date(e.startsAt)) }}
            </div>
            <div class="mt-1 text-xs font-bold uppercase tracking-wide text-gold-ink">
              {{ monthFmt.format(new Date(e.startsAt)) }}
            </div>
          </div>
          <div class="min-w-0">
            <p class="font-medium text-ink">{{ e.title }}</p>
            <p v-if="e.location" class="mt-0.5 text-sm text-ink-muted">{{ e.location }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
