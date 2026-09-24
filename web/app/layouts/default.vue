<script setup lang="ts">
const { data: chrome } = await useChrome()

const settings = computed(() => chrome.value?.settings)
const logo = computed(() => chrome.value?.logo ?? null)
const headerNav = computed(() => chrome.value?.nav.header ?? [])
const footerNav = computed(() => chrome.value?.nav.footer ?? [])

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

    <!-- Announcements stay first: an urgent notice must be seen before anything else. -->
    <div
      v-for="a in chrome?.announcements ?? []"
      :key="a.id"
      class="bg-gold-ink px-4 py-2 text-center text-sm font-medium text-cream"
    >
      {{ a.title }}
    </div>

    <div data-utility-strip class="hidden bg-maroon-deep text-cream/85 md:block">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-2 text-xs">
        <p>
          Established {{ settings?.['site.foundedYear'] }}
          <template v-if="settings?.['site.tagline']"> · {{ settings['site.tagline'] }}</template>
        </p>
        <ul class="flex items-center gap-5">
          <li v-if="settings?.['contact.phone']">
            <a :href="`tel:${settings['contact.phone']}`" class="hover:text-cream">{{ settings['contact.phone'] }}</a>
          </li>
          <li v-if="settings?.['contact.email']">
            <a :href="`mailto:${settings['contact.email']}`" class="hover:text-cream">{{ settings['contact.email'] }}</a>
          </li>
          <li v-if="settings?.['social.facebook']">
            <a :href="settings['social.facebook']" target="_blank" rel="noopener" class="text-gold-light hover:text-cream">
              Facebook
            </a>
          </li>
        </ul>
      </div>
    </div>

    <header data-site-header class="sticky top-0 z-40 bg-maroon shadow-[0_1px_0_rgb(0_0_0/0.2)]">
      <div class="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
        <!--
          Wordmark for now. This is the slot for the simplified crest mark once
          the vector source arrives — docs/design-system.md §5.
        -->
        <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
          <!--
            Decorative: the school name sits beside it as real text, and a
            screen reader announcing both would read the school twice.
          -->
          <img
            v-if="logo"
            :src="logo.srcset.find((s) => s.width >= 160)?.url ?? logo.url"
            alt=""
            :width="logo.width ?? undefined"
            :height="logo.height ?? undefined"
            class="h-9 w-auto shrink-0 object-contain md:h-10"
          />

          <span class="flex min-w-0 flex-col leading-none">
            <!--
              With a logo the name is hidden on phones but stays in the markup:
              `sr-only` keeps it in the accessibility tree, so the link still
              has a name. `hidden` would leave a link with nothing to announce.
              The name wraps rather than truncating — a school's own name cut
              to "Cherished Moments S…" is worse than two lines.
            -->
            <span
              class="font-display text-lg font-semibold leading-tight text-cream sm:text-xl lg:text-2xl"
              :class="logo ? 'sr-only md:not-sr-only' : ''"
            >
              {{ settings?.['site.name'] ?? 'Cherished Moments School' }}
            </span>
            <span
              v-if="settings?.['site.tagline']"
              class="mt-1.5 hidden truncate text-[10px] font-bold uppercase tracking-[0.16em] text-gold-light lg:block"
            >
              {{ settings['site.tagline'] }}
            </span>
          </span>
        </NuxtLink>

        <SiteNav :items="headerNav" class="ml-auto hidden md:block" />
        <SiteMobileNav :items="headerNav" class="ml-auto md:hidden" />
      </div>
    </header>

    <main id="main" class="flex-1">
      <slot />
    </main>

    <SiteFooter :settings="settings" :items="footerNav" />
  </div>
</template>
