<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface StaffMember {
  id: string
  name: string
  roleTitle: string | null
  department: string | null
  bio: string | null
  email: string | null
  photo: MediaItem | null
}

const { data } = await useApi<{ staff: StaffMember[] }>('/content/staff')

/**
 * Grouped by department in the order the API returns them (department, then
 * the school's own ordering), so the principal can come first rather than
 * whoever is alphabetically lucky.
 */
const groups = computed(() => {
  const out = new Map<string, StaffMember[]>()
  for (const person of data.value?.staff ?? []) {
    const key = person.department ?? 'Staff'
    if (!out.has(key)) out.set(key, [])
    out.get(key)!.push(person)
  }
  return [...out.entries()]
})

const initials = (name: string) =>
  name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, '')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

useSeoMeta({
  title: 'Faculty and staff',
  description: 'The teachers and staff of Cherished Moments School.',
})
</script>

<template>
  <div>
    <PageHeader
      title="Faculty and staff"
      eyebrow="Who we are"
      intro="The teachers and staff who know every child by name."
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'Faculty and staff' }]"
    />

    <div class="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <p v-if="!groups.length" class="text-ink-muted">Staff details will appear here shortly.</p>

      <section v-for="[department, people] in groups" :key="department" class="mb-16 last:mb-0">
        <h2 class="border-b border-hairline pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          {{ department }}
        </h2>

        <ul class="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="person in people" :key="person.id" data-staff-card>
            <img
              v-if="person.photo"
              :src="person.photo.srcset.find((s) => s.width >= 400)?.url ?? person.photo.url"
              :srcset="srcsetFor(person.photo)"
              sizes="(min-width: 1024px) 16rem, (min-width: 640px) 45vw, 92vw"
              :alt="person.photo.alt"
              :width="person.photo.width ?? undefined"
              :height="person.photo.height ?? undefined"
              loading="lazy"
              class="aspect-[4/5] w-full rounded-card object-cover"
            />
            <div
              v-else
              class="grid aspect-[4/5] w-full place-items-center rounded-card bg-maroon-tint font-display text-4xl font-semibold text-maroon"
              aria-hidden="true"
            >
              {{ initials(person.name) }}
            </div>

            <h3 class="mt-4 font-display text-lg font-semibold leading-snug text-maroon">{{ person.name }}</h3>
            <p v-if="person.roleTitle" class="mt-0.5 text-sm text-ink-muted">{{ person.roleTitle }}</p>
            <p v-if="person.bio" class="mt-2 text-sm leading-relaxed text-ink-muted">{{ person.bio }}</p>
            <p v-if="person.email" class="mt-2 text-sm">
              <a :href="`mailto:${person.email}`" class="text-gold-ink underline underline-offset-2">{{ person.email }}</a>
            </p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
