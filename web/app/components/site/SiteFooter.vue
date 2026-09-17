<script setup lang="ts">
import type { SiteSettings } from '@cms/shared'
import type { NavItem, NavLink } from '~/composables/useSite'

const props = defineProps<{ settings: SiteSettings | undefined; items: NavItem[] }>()

/**
 * A footer item with children becomes a column; childless items are gathered
 * into a final "Links" column. The office builds these in the Navigation screen.
 */
const columns = computed(() => {
  const cols: Array<{ id: string; title: string; links: NavLink[] }> = props.items
    .filter((i) => i.children.length)
    .map((i) => ({ id: i.id, title: i.label, links: i.children }))

  const loose = props.items
    .filter((i) => !i.children.length && i.href)
    .map((i) => ({ id: i.id, label: i.label, href: i.href!, opensNewTab: i.opensNewTab }))
  if (loose.length) cols.push({ id: 'links', title: 'Links', links: loose })

  return cols
})

const year = new Date().getFullYear()
</script>

<template>
  <footer data-site-footer class="border-t-4 border-gold bg-maroon text-cream/85">
    <div class="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p class="font-display text-xl font-semibold text-cream">{{ settings?.['site.name'] }}</p>
        <p v-if="settings?.['site.tagline']" class="mt-2 text-sm text-gold-light">{{ settings['site.tagline'] }}</p>
        <p v-if="settings?.['site.foundedYear']" class="mt-4 text-xs text-cream/70">
          Established {{ settings['site.foundedYear'] }}
        </p>
        <p v-if="settings?.['contact.address']" class="mt-4 whitespace-pre-line text-sm">
          {{ settings['contact.address'] }}
        </p>
      </div>

      <div v-for="col in columns" :key="col.id">
        <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">{{ col.title }}</h2>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="link in col.links" :key="link.id">
            <NuxtLink
              :to="link.href"
              :target="link.opensNewTab ? '_blank' : undefined"
              class="hover:text-cream hover:underline"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div v-if="settings?.['contact.phone'] || settings?.['contact.email'] || settings?.['social.facebook']">
        <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">Contact</h2>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-if="settings['contact.phone']">
            <a :href="`tel:${settings['contact.phone']}`" class="hover:text-cream">{{ settings['contact.phone'] }}</a>
          </li>
          <li v-if="settings['contact.email']">
            <a :href="`mailto:${settings['contact.email']}`" class="hover:text-cream">{{ settings['contact.email'] }}</a>
          </li>
          <li v-if="settings['social.facebook']">
            <a :href="settings['social.facebook']" target="_blank" rel="noopener" class="text-gold-light hover:text-cream">
              Facebook
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-cream/10 px-5 py-5">
      <p class="mx-auto max-w-6xl text-xs text-cream/70">&copy; {{ year }} {{ settings?.['site.name'] }}</p>
    </div>
  </footer>
</template>
