<script setup lang="ts">
const { user, logout, isSuperAdmin } = useAuth()
const route = useRoute()

interface NavItem {
  label: string
  to: string
  /** Shown greyed out with a "soon" tag — a section that exists in the plan
   *  but not yet in the build, so its absence does not read as a bug. */
  soon?: boolean
}

const nav = computed<NavItem[]>(() =>
  [
    { label: 'Dashboard', to: '/admin' },
    // Content lands in Phase 2; shown disabled so the shape of the CMS is
    // visible during Phase 1 review rather than appearing out of nowhere.
    { label: 'Pages', to: '/admin/pages' },
    { label: 'News', to: '/admin/posts' },
    { label: 'Events', to: '/admin/events' },
    { label: 'Staff', to: '/admin/staff' },
    { label: 'Downloads', to: '/admin/downloads' },
    { label: 'Media', to: '/admin/media' },
    { label: 'Announcements', to: '/admin/announcements' },
    { label: 'Navigation', to: '/admin/navigation' },
    { label: 'Enquiries', to: '/admin/inquiries' },
    { label: 'Settings', to: '/admin/settings' },
    ...(isSuperAdmin.value ? [{ label: 'Users', to: '/admin/users' }] : []),
  ].filter(Boolean),
)

const isActive = (to: string) => (to === '/admin' ? route.path === to : route.path.startsWith(to))
</script>

<template>
  <div class="min-h-dvh bg-cream">
    <a class="skip-link" href="#admin-main">Skip to main content</a>

    <header class="border-b border-hairline bg-white">
      <div class="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <NuxtLink to="/admin" class="flex items-baseline gap-2">
          <span class="font-display text-lg font-semibold text-maroon">Cherished Moments</span>
          <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-gold-ink">CMS</span>
        </NuxtLink>

        <div class="ml-auto flex items-center gap-3">
          <span class="hidden text-sm text-ink-muted sm:inline">{{ user?.displayName }}</span>
          <UiButton variant="ghost" @click="logout">Sign out</UiButton>
        </div>
      </div>
    </header>

    <div class="mx-auto flex max-w-6xl gap-8 px-5 py-8">
      <nav aria-label="Admin sections" class="hidden w-48 shrink-0 md:block">
        <ul class="space-y-0.5">
          <li v-for="item in nav" :key="item.to">
            <span
              v-if="item.soon"
              class="flex items-center justify-between rounded-card px-3 py-2 text-sm text-ink-muted/55"
            >
              {{ item.label }}
              <span class="text-[10px] uppercase tracking-wide">soon</span>
            </span>
            <NuxtLink
              v-else
              :to="item.to"
              :aria-current="isActive(item.to) ? 'page' : undefined"
              class="block rounded-card px-3 py-2 text-sm font-medium transition-colors"
              :class="
                isActive(item.to)
                  ? 'bg-maroon-tint text-maroon'
                  : 'text-ink-muted hover:bg-maroon-tint/60 hover:text-maroon'
              "
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <main id="admin-main" class="min-w-0 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
