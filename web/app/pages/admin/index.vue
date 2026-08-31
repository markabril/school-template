<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { user } = useAuth()
useHead({ title: 'Dashboard — CMS' })

const phases = [
  { n: 2, label: 'Media library and the page block editor' },
  { n: 3, label: 'News, events, staff, downloads, navigation' },
  { n: 4, label: 'The public site itself' },
]
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">
      Welcome, {{ user?.displayName }}
    </h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      Signed in as <span class="font-medium text-ink">{{ user?.email }}</span>
      &middot; {{ user?.role.replace('_', ' ') }}
    </p>

    <div class="mt-8 rounded-card border border-hairline bg-white p-6">
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">Coming next</h2>
      <ul class="mt-4 space-y-3">
        <li v-for="p in phases" :key="p.n" class="flex gap-3 text-sm">
          <span
            class="grid size-6 shrink-0 place-items-center rounded-full bg-maroon-tint text-xs font-bold text-maroon"
          >
            {{ p.n }}
          </span>
          <span class="text-ink-muted">{{ p.label }}</span>
        </li>
      </ul>
      <p class="mt-5 border-t border-hairline pt-4 text-xs leading-relaxed text-ink-muted">
        Phase 1 is complete: accounts, sign-in, invitations, password resets, and the queued mail
        that carries them.
      </p>
    </div>
  </div>
</template>
