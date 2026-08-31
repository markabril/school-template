<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'

interface EventItem {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  description: RichTextDoc | null
}

const { data } = await useApi<{ events: EventItem[] }>('/content/events?limit=40')

useSeoMeta({
  title: 'Events',
  description: 'Upcoming events at Cherished Moments School.',
})

// Schools get real value from event rich results — a parent searching for the
// school often gets the next event surfaced directly.
useEventListSchema(data.value?.events ?? [])

const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric' })
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' })

function when(e: EventItem): string {
  const start = new Date(e.startsAt)
  const end = e.endsAt ? new Date(e.endsAt) : null

  if (e.allDay) {
    if (!end || end.toDateString() === start.toDateString()) return 'All day'
    return `Until ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`
  }

  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return end ? `${t(start)} – ${t(end)}` : t(start)
}
</script>

<template>
  <div>
    <PageHeader
      title="Events"
      eyebrow="School calendar"
      intro="What is coming up. Events stay listed until they finish."
    />

    <div class="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <p v-if="!data?.events.length" class="text-ink-muted">
        There are no upcoming events at the moment.
      </p>

      <ul v-else class="space-y-3">
        <li
          v-for="e in data.events"
          :key="e.id"
          class="flex gap-5 rounded-card border border-hairline bg-white p-5 transition-colors hover:border-gold/50"
        >
          <!-- A date block rather than a formatted string: parents scanning a
               calendar are looking for the number first. The gold rule ties it
               to the masthead motif without repeating it wholesale. -->
          <div class="shrink-0 border-r border-hairline pr-5 text-center">
            <div class="font-display text-3xl font-semibold leading-none text-maroon">
              {{ dayFmt.format(new Date(e.startsAt)) }}
            </div>
            <div class="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink">
              {{ monthFmt.format(new Date(e.startsAt)) }}
            </div>
          </div>

          <div class="min-w-0 self-center">
            <h2 class="font-display text-xl font-semibold leading-snug text-maroon">
              {{ e.title }}
            </h2>
            <p class="mt-1.5 text-sm text-ink-muted">
              {{ when(e) }}
              <template v-if="e.location"> &middot; {{ e.location }}</template>
            </p>
            <div v-if="e.description" class="mt-2 text-sm">
              <RichTextRenderer :doc="e.description" />
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
