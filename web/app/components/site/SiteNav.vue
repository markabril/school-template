<script setup lang="ts">
import type { NavItem } from '~/composables/useSite'

/**
 * Desktop header navigation with one level of dropdowns (disclosure pattern).
 *
 * Panels open on hover AND on click, Enter, Space or ArrowDown: hover-only menus
 * are unusable by keyboard and on touch screens. Links are always present in
 * the server-rendered HTML (v-show, not v-if), so crawlers and visitors without
 * JavaScript still reach every page.
 */
defineProps<{ items: NavItem[] }>()

const route = useRoute()
const root = ref<HTMLElement>()
const openId = ref<string | null>(null)
let openedByHover = false
let closeTimer: ReturnType<typeof setTimeout> | undefined

function open(id: string) {
  clearTimeout(closeTimer)
  openId.value = id
}

function close() {
  clearTimeout(closeTimer)
  openId.value = null
  openedByHover = false
}

// A short delay so moving the pointer from trigger to panel does not snap shut.
function closeSoon() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(close, 150)
}

function onPointerEnter(item: NavItem) {
  if (!item.children.length) return
  if (openId.value !== item.id) openedByHover = true
  open(item.id)
}

function onTriggerClick(id: string) {
  // A mouse user hovers (opening the panel) and then clicks: keep it open
  // rather than toggling it shut under their pointer.
  if (openId.value === id && openedByHover) {
    openedByHover = false
    return
  }
  if (openId.value === id) close()
  else open(id)
}

const panelLinks = (id: string) =>
  Array.from(root.value?.querySelectorAll<HTMLAnchorElement>(`#nav-panel-${id} a`) ?? [])

async function openAndFocus(id: string, which: 'first' | 'last') {
  open(id)
  await nextTick()
  const links = panelLinks(id)
  ;(which === 'first' ? links[0] : links[links.length - 1])?.focus()
}

function onTriggerKeydown(e: KeyboardEvent, id: string) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    void openAndFocus(id, 'first')
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    void openAndFocus(id, 'last')
  } else if (e.key === 'Escape') {
    close()
  }
}

function onPanelKeydown(e: KeyboardEvent, id: string) {
  const links = panelLinks(id)
  const i = links.indexOf(document.activeElement as HTMLAnchorElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    links[(i + 1) % links.length]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    links[(i - 1 + links.length) % links.length]?.focus()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
    root.value?.querySelector<HTMLButtonElement>(`#nav-trigger-${id}`)?.focus()
  }
}

// Close when focus leaves the open item (its trigger and panel), not just the
// whole nav: tabbing from the last link onto the next top-level link must shut
// the panel, or it stays open over the page.
function onFocusOut(e: FocusEvent) {
  if (!openId.value) return
  const item = root.value?.querySelector(`#nav-panel-${openId.value}`)?.closest('li.relative')
  if (!item?.contains(e.relatedTarget as Node | null)) close()
}

function onDocumentClick(e: MouseEvent) {
  if (!root.value?.contains(e.target as Node)) close()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  clearTimeout(closeTimer)
})
watch(() => route.fullPath, close)

const matches = (href: string) =>
  href === '/' ? route.path === '/' : route.path === href || route.path.startsWith(`${href}/`)
const isCurrent = (item: NavItem) =>
  item.href ? matches(item.href) : item.children.some((c) => matches(c.href))
</script>

<template>
  <nav ref="root" aria-label="Main" @focusout="onFocusOut">
    <ul class="flex items-center gap-1">
      <li
        v-for="item in items"
        :key="item.id"
        class="relative"
        @mouseenter="onPointerEnter(item)"
        @mouseleave="item.children.length && closeSoon()"
      >
        <template v-if="item.children.length">
          <button
            :id="`nav-trigger-${item.id}`"
            type="button"
            :aria-expanded="openId === item.id"
            :aria-controls="`nav-panel-${item.id}`"
            class="inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors"
            :class="isCurrent(item) ? 'border-gold text-cream' : 'border-transparent text-cream/85 hover:text-cream'"
            @click="onTriggerClick(item.id)"
            @keydown="onTriggerKeydown($event, item.id)"
          >
            {{ item.label }}
            <svg
              class="size-3 transition-transform"
              :class="openId === item.id ? 'rotate-180' : ''"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>

          <ul
            v-show="openId === item.id"
            :id="`nav-panel-${item.id}`"
            class="absolute left-0 top-full z-50 mt-2 min-w-56 rounded-card border-t-2 border-gold bg-white py-2 shadow-lg"
            @keydown="onPanelKeydown($event, item.id)"
          >
            <li v-for="child in item.children" :key="child.id">
              <NuxtLink
                :to="child.href"
                :target="child.opensNewTab ? '_blank' : undefined"
                :rel="child.opensNewTab ? 'noopener' : undefined"
                class="block px-4 py-2 text-sm text-maroon hover:bg-maroon-tint focus:bg-maroon-tint focus:outline-none"
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
          :rel="item.opensNewTab ? 'noopener' : undefined"
          class="inline-flex border-b-2 px-3 py-2 text-sm font-medium transition-colors"
          :class="isCurrent(item) ? 'border-gold text-cream' : 'border-transparent text-cream/85 hover:text-cream'"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
