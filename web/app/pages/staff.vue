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
 * Grouped by department, in the order the API returns them (department, then
 * the school's own ordering) — so the head teacher can be first rather than
 * whoever happens to be alphabetically lucky.
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
    />

    <div class="mx-auto max-w-5xl px-6 py-12 sm:py-16">
    <p v-if="!groups.length" class="text-ink-muted">
      Staff details will appear here shortly.
    </p>

    <section v-for="[department, people] in groups" :key="department" class="mb-14 last:mb-0">
      <h2 class="border-b border-hairline pb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">
        {{ department }}
      </h2>

      <ul class="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="person in people" :key="person.id" class="text-center">
          <img
            v-if="person.photo"
            :src="person.photo.srcset.find((s) => s.width >= 400)?.url ?? person.photo.url"
            :srcset="srcsetFor(person.photo)"
            sizes="(min-width: 1024px) 14rem, 40vw"
            :alt="person.photo.alt"
            :width="person.photo.width ?? undefined"
            :height="person.photo.height ?? undefined"
            loading="lazy"
            class="mx-auto aspect-square w-32 rounded-full object-cover"
          />
          <div
            v-else
            class="mx-auto grid aspect-square w-32 place-items-center rounded-full bg-maroon-tint font-display text-2xl font-semibold text-maroon"
            aria-hidden="true"
          >
            {{ person.name.split(' ').map((p) => p[0]).slice(0, 2).join('') }}
          </div>

          <h3 class="mt-3 font-display text-lg font-semibold text-maroon">{{ person.name }}</h3>
          <p v-if="person.roleTitle" class="text-sm text-ink-muted">{{ person.roleTitle }}</p>
          <p v-if="person.bio" class="mt-2 text-sm leading-relaxed text-ink-muted">
            {{ person.bio }}
          </p>
          <p v-if="person.email" class="mt-2 text-sm">
            <a :href="`mailto:${person.email}`" class="text-gold-ink underline underline-offset-2">
              {{ person.email }}
            </a>
          </p>
        </li>
      </ul>
    </section>
    </div>
  </div>
</template>
