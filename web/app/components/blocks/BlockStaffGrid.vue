<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface StaffMember {
  id: string
  name: string
  roleTitle: string | null
  department: string | null
  bio: string | null
  photo: MediaItem | null
}

const props = defineProps<{ data: { heading?: string }; refs?: StaffMember[] }>()
const staff = computed(() => props.refs ?? [])
</script>

<template>
  <section v-if="staff.length" class="mx-auto max-w-5xl px-6 py-12">
    <h2 v-if="data.heading" class="font-display text-2xl font-semibold text-maroon">
      {{ data.heading }}
    </h2>

    <ul class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="person in staff" :key="person.id" class="text-center">
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
        <!-- Initials rather than a generic silhouette: a placeholder person
             icon repeated across a staff page looks like an error. -->
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
      </li>
    </ul>
  </section>
</template>
