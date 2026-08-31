<script setup lang="ts">
const { data: chrome } = await useChrome()
const route = useRoute()

const menuOpen = ref(false)
// Close the mobile menu on navigation, or it stays open over the new page.
watch(() => route.fullPath, () => (menuOpen.value = false))

const settings = computed(() => chrome.value?.settings)
const year = new Date().getFullYear()

// Canonical on every public page, and the School schema once, from the layout —
// so a new page cannot be added without them.
useCanonical()
useSchoolSchema(settings)

useSeoMeta({
  titleTemplate: (title) =>
    title && title !== settings.value?.['site.name']
      ? `${title} — ${settings.value?.['site.name'] ?? 'Cherished Moments School'}`
      : (settings.value?.['site.name'] ?? 'Cherished Moments School'),
  ogSiteName: () => settings.value?.['site.name'],
  ogType: 'website',
  ogLocale: 'en',
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a class="skip-link" href="#main">Skip to main content</a>

    <div
      v-for="a in chrome?.announcements ?? []"
      :key="a.id"
      class="bg-gold-ink px-4 py-2 text-center text-sm font-medium text-cream"
    >
      {{ a.title }}
    </div>

    <header class="sticky top-0 z-40 border-b border-hairline bg-cream/95 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <!--
          Wordmark for now. The crest is too detailed to read at header size —
          it needs a simplified shield-and-tree mark, which needs the vector
          source. See docs/design-system.md §5.
        -->
        <NuxtLink to="/" class="flex min-w-0 flex-col leading-none">
          <span class="truncate font-display text-lg font-semibold text-maroon">
            {{ settings?.['site.name'] ?? 'Cherished Moments School' }}
          </span>
          <span
            v-if="settings?.['site.tagline']"
            class="mt-1 hidden truncate text-[10px] font-bold uppercase tracking-[0.14em] text-gold-ink sm:block"
          >
            {{ settings['site.tagline'] }}
          </span>
        </NuxtLink>

        <nav aria-label="Main" class="ml-auto hidden md:block">
          <ul class="flex items-center gap-1">
            <li v-for="item in chrome?.nav.header ?? []" :key="item.id">
              <NuxtLink
                :to="item.href"
                :target="item.opensNewTab ? '_blank' : undefined"
                :rel="item.opensNewTab ? 'noopener' : undefined"
                class="rounded-card px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-maroon-tint hover:text-maroon"
                active-class="text-maroon bg-maroon-tint"
              >
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          class="ml-auto rounded-card px-3 py-2 text-sm font-semibold text-maroon md:hidden"
          :aria-expanded="menuOpen"
          aria-controls="mobile-nav"
          @click="menuOpen = !menuOpen"
        >
          {{ menuOpen ? 'Close' : 'Menu' }}
        </button>
      </div>

      <nav
        v-if="menuOpen"
        id="mobile-nav"
        aria-label="Main"
        class="border-t border-hairline bg-cream md:hidden"
      >
        <ul class="mx-auto max-w-6xl px-5 py-2">
          <li v-for="item in chrome?.nav.header ?? []" :key="item.id">
            <NuxtLink
              :to="item.href"
              class="block rounded-card px-2 py-2.5 text-sm font-medium text-ink-muted"
              active-class="text-maroon"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </header>

    <main id="main" class="flex-1">
      <slot />
    </main>

    <footer class="border-t-4 border-gold bg-navy text-cream/80">
      <div class="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p class="font-display text-xl font-semibold text-cream">
            {{ settings?.['site.name'] }}
          </p>
          <p v-if="settings?.['site.tagline']" class="mt-2 text-sm text-gold-light">
            {{ settings['site.tagline'] }}
          </p>
          <p v-if="settings?.['site.foundedYear']" class="mt-4 text-xs text-cream/60">
            Established {{ settings['site.foundedYear'] }}
          </p>
          <p v-if="settings?.['social.facebook']" class="mt-4">
            <a
              :href="settings['social.facebook']"
              target="_blank"
              rel="noopener"
              class="text-sm text-gold-light underline underline-offset-2 hover:text-cream"
            >
              Find us on Facebook
            </a>
          </p>
        </div>

        <div v-if="settings?.['contact.address'] || settings?.['contact.email'] || settings?.['contact.phone']">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">Contact</h2>
          <address class="mt-3 space-y-1.5 text-sm not-italic">
            <p v-if="settings['contact.address']" class="whitespace-pre-line">
              {{ settings['contact.address'] }}
            </p>
            <p v-if="settings['contact.phone']">
              <a :href="`tel:${settings['contact.phone']}`" class="hover:text-cream">
                {{ settings['contact.phone'] }}
              </a>
            </p>
            <p v-if="settings['contact.email']">
              <a :href="`mailto:${settings['contact.email']}`" class="hover:text-cream">
                {{ settings['contact.email'] }}
              </a>
            </p>
          </address>
        </div>

        <div v-if="(chrome?.nav.footer ?? []).length">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">More</h2>
          <ul class="mt-3 space-y-1.5 text-sm">
            <li v-for="item in chrome!.nav.footer" :key="item.id">
              <NuxtLink :to="item.href" class="hover:text-cream">{{ item.label }}</NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-cream/10 px-5 py-4">
        <p class="mx-auto max-w-6xl text-xs text-cream/50">
          &copy; {{ year }} {{ settings?.['site.name'] }}
        </p>
      </div>
    </footer>
  </div>
</template>
