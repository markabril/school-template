<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Navigation — CMS' })

type Location = 'header' | 'footer'

interface NavLinkInput {
  label: string
  pageId?: string | null
  url?: string | null
  opensNewTab?: boolean
}
interface NavInputItem extends NavLinkInput {
  location: Location
  children?: NavLinkInput[]
}
interface Row {
  key: string
  location: Location
  depth: 0 | 1
  label: string
  pageId: string | null
  url: string
  opensNewTab: boolean
}
interface PageOption {
  id: string
  title: string
  slug: string
  status: string
}

const rows = ref<Row[]>([])
const pages = ref<PageOption[]>([])
const error = ref('')
const notice = ref('')
const pending = ref(false)

const toRow = (item: NavLinkInput, location: Location, depth: 0 | 1): Row => ({
  key: crypto.randomUUID(),
  location,
  depth,
  label: item.label,
  pageId: item.pageId ?? null,
  url: item.url ?? '',
  opensNewTab: item.opensNewTab ?? false,
})

function fromTree(tree: NavInputItem[]): Row[] {
  const ordered = [...tree].sort((a, b) => (a.location === b.location ? 0 : a.location === 'header' ? -1 : 1))
  return ordered.flatMap((item) => [
    toRow(item, item.location, 0),
    ...(item.children ?? []).map((c) => toRow(c, item.location, 1)),
  ])
}

/** A child always belongs to the nearest top-level row above it in the same menu. */
function toTree(list: Row[]): NavInputItem[] {
  const out: NavInputItem[] = []
  let parent: NavInputItem | null = null
  for (const r of list) {
    // opensNewTab is carried through, or every save would silently reset it.
    const link: NavLinkInput = {
      label: r.label,
      pageId: r.pageId,
      url: r.pageId ? null : r.url || null,
      opensNewTab: r.opensNewTab,
    }
    if (r.depth === 1 && parent && parent.location === r.location) {
      parent.children!.push(link)
    } else {
      parent = { location: r.location, ...link, children: [] }
      out.push(parent)
    }
  }
  return out
}

onMounted(async () => {
  try {
    const [nav, pageList] = await Promise.all([
      $fetch<{ tree: NavInputItem[] }>('/api/site/navigation', { credentials: 'include' }),
      $fetch<{ pages: PageOption[] }>('/api/pages', { credentials: 'include' }),
    ])
    rows.value = fromTree(nav.tree)
    pages.value = pageList.pages
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load navigation.')
  }
})

const inMenu = (loc: Location) => rows.value.filter((r) => r.location === loc)
const neighbour = (row: Row, delta: -1 | 1) => {
  const list = inMenu(row.location)
  return list[list.indexOf(row) + delta]
}
const hasChildren = (row: Row) => row.depth === 0 && neighbour(row, 1)?.depth === 1
const canIndent = (row: Row) => row.depth === 0 && !!neighbour(row, -1) && !hasChildren(row)
const canOutdent = (row: Row) => row.depth === 1

/** The first row of a menu can never be a child. */
function normalise() {
  for (const loc of ['header', 'footer'] as const) {
    const first = inMenu(loc)[0]
    if (first) first.depth = 0
  }
}

function indent(row: Row) {
  if (canIndent(row)) row.depth = 1
}
function outdent(row: Row) {
  if (canOutdent(row)) row.depth = 0
}

function move(row: Row, delta: -1 | 1) {
  const i = rows.value.indexOf(row)
  const j = i + delta
  if (j < 0 || j >= rows.value.length || rows.value[j]!.location !== row.location) return
  const next = [...rows.value]
  next.splice(i, 1)
  next.splice(j, 0, row)
  rows.value = next
  normalise()
}

function add(location: Location) {
  const row: Row = { key: crypto.randomUUID(), location, depth: 0, label: '', pageId: null, url: '', opensNewTab: false }
  // Header rows stay above footer rows so each menu remains contiguous.
  const lastInMenu = rows.value.map((r) => r.location).lastIndexOf(location)
  const at = lastInMenu >= 0 ? lastInMenu + 1 : location === 'header' ? 0 : rows.value.length
  const next = [...rows.value]
  next.splice(at, 0, row)
  rows.value = next
}

function remove(row: Row) {
  rows.value = rows.value.filter((r) => r !== row)
  normalise()
}

async function save() {
  error.value = ''
  notice.value = ''
  if (rows.value.some((r) => !r.label.trim())) {
    error.value = 'Every menu item needs a label.'
    return
  }
  pending.value = true
  try {
    const res = await $fetch<{ tree: NavInputItem[] }>('/api/site/navigation', {
      method: 'PUT',
      body: { items: toTree(rows.value) },
      credentials: 'include',
    })
    rows.value = fromTree(res.tree)
    notice.value = 'Saved. The whole site has been refreshed.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save navigation.')
  } finally {
    pending.value = false
  }
}

const isDraft = (pageId: string | null) => !!pageId && pages.value.find((p) => p.id === pageId)?.status === 'draft'
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">Navigation</h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      The menus in the header and footer. Indent an item to place it in a dropdown under the item above it.
    </p>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <section v-for="loc in (['header', 'footer'] as const)" :key="loc" class="mt-8">
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">{{ loc }}</h2>
      <p v-if="loc === 'footer'" class="mt-1 text-xs text-ink-muted">
        A footer item with items indented under it becomes a column heading.
      </p>

      <ul class="mt-3 space-y-2">
        <li
          v-for="row in inMenu(loc)"
          :key="row.key"
          class="rounded-card border bg-white p-3"
          :class="row.depth === 1 ? 'ml-8 border-hairline border-l-4 border-l-gold' : 'border-hairline'"
        >
          <div class="grid gap-2 lg:grid-cols-[1fr_1.4fr_auto]">
            <input
              v-model="row.label"
              placeholder="Label"
              aria-label="Menu label"
              class="rounded-card border border-hairline px-3 py-2 text-sm"
            />
            <div class="flex gap-2">
              <select
                v-model="row.pageId"
                aria-label="Link to a page"
                class="min-w-0 flex-1 rounded-card border border-hairline px-2 py-2 text-sm"
              >
                <option :value="null">— custom address —</option>
                <option v-for="p in pages" :key="p.id" :value="p.id">
                  {{ p.title }}{{ p.status === 'draft' ? ' (draft)' : '' }}
                </option>
              </select>
              <input
                v-if="!row.pageId"
                v-model="row.url"
                placeholder="/contact or https://…"
                aria-label="Custom address"
                class="min-w-0 flex-1 rounded-card border border-hairline px-3 py-2 text-sm"
              />
            </div>
            <div class="flex flex-wrap items-center gap-1">
              <label class="mr-2 flex items-center gap-1.5 text-xs text-ink-muted">
                <input v-model="row.opensNewTab" type="checkbox" class="accent-maroon" />
                New tab
              </label>
              <UiButton variant="ghost" title="Move up" @click="move(row, -1)">↑</UiButton>
              <UiButton variant="ghost" title="Move down" @click="move(row, 1)">↓</UiButton>
              <UiButton variant="ghost" :disabled="!canIndent(row)" @click="indent(row)">Indent ›</UiButton>
              <UiButton variant="ghost" :disabled="!canOutdent(row)" @click="outdent(row)">‹ Outdent</UiButton>
              <UiButton variant="ghost" @click="remove(row)">Remove</UiButton>
            </div>
          </div>

          <p v-if="hasChildren(row) && (row.pageId || row.url)" class="mt-2 text-xs text-ink-muted">
            This link appears as the first item in the dropdown.
          </p>
          <p v-if="isDraft(row.pageId)" class="mt-2 text-xs text-gold-ink">
            That page is a draft, so this item stays hidden until it is published.
          </p>
        </li>
      </ul>

      <UiButton variant="secondary" class="mt-3" @click="add(loc)">Add to {{ loc }}</UiButton>
    </section>

    <div class="mt-8 border-t border-hairline pt-5">
      <UiButton :loading="pending" @click="save">Save navigation</UiButton>
    </div>
  </div>
</template>
