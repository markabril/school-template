<script setup lang="ts">
import type { NavItem } from '~/composables/useSite'

/**
 * Phone navigation. Parents become expandable rows — there is no hover on a
 * touch screen. The panel positions against the sticky header, so it spans the
 * full width below it.
 */
defineProps<{ items: NavItem[] }>()

const route = useRoute()
const open = ref(false)
const expanded = ref<string | null>(null)

watch(
  () => route.fullPath,
  () => {
    open.value = false
    expanded.value = null
  },
)
</script>

<template>
  <div>
    <button
      type="button"
      class="rounded-card px-3 py-2 text-sm font-semibold text-cream hover:bg-maroon-deep"
      :aria-expanded="open"
      aria-controls="mobile-nav"
      @click="open = !open"
    >
      {{ open ? 'Close' : 'Menu' }}
    </button>

    <nav
      v-show="open"
      id="mobile-nav"
      aria-label="Main"
      class="absolute inset-x-0 top-full border-t border-cream/10 bg-maroon-deep shadow-lg"
    >
      <ul class="mx-auto max-w-6xl px-5 py-3">
        <li v-for="item in items" :key="item.id" class="border-b border-cream/10 last:border-0">
          <template v-if="item.children.length">
            <button
              type="button"
              class="flex w-full items-center justify-between py-3 text-left text-base font-medium text-cream"
              :aria-expanded="expanded === item.id"
              :aria-controls="`mobile-sub-${item.id}`"
              @click="expanded = expanded === item.id ? null : item.id"
            >
              {{ item.label }}
              <span aria-hidden="true" class="text-gold-light">{{ expanded === item.id ? '−' : '+' }}</span>
            </button>
            <ul v-show="expanded === item.id" :id="`mobile-sub-${item.id}`" class="mb-3 border-l-2 border-gold pl-4">
              <li v-for="child in item.children" :key="child.id">
                <NuxtLink
                  :to="child.href"
                  :target="child.opensNewTab ? '_blank' : undefined"
                  class="block py-2 text-sm text-cream/85 hover:text-cream"
                >
                  {{ child.label }}
                </NuxtLink>
              </li>
            </ul>
          </template>
          <NuxtLink
            v-else
            :to="item.href!"
            :target="item.opensNewTab ? '_blank' : undefined"
            class="block py-3 text-base font-medium text-cream"
          >
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
