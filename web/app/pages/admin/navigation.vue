<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Navigation — CMS' })

interface NavRow {
  key: string
  location: 'header' | 'footer'
  label: string
  pageId: string | null
  url: string | null
}

interface PageOption {
  id: string
  title: string
  slug: string
  status: string
}

const rows = ref<NavRow[]>([])
const pages = ref<PageOption[]>([])
const error = ref('')
const notice = ref('')
const pending = ref(false)

onMounted(async () => {
  try {
    const [nav, pageList] = await Promise.all([
      $fetch<{ navigation: Array<NavRow & { id: string }> }>('/api/site/navigation', {
        credentials: 'include',
      }),
      $fetch<{ pages: PageOption[] }>('/api/pages', { credentials: 'include' }),
    ])
    rows.value = nav.navigation.map((n) => ({
      key: n.id,
      location: n.location,
      label: n.label,
      pageId: n.pageId,
      url: n.url,
    }))
    pages.value = pageList.pages
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load navigation.')
  }
})

function add(location: 'header' | 'footer') {
  rows.value = [...rows.value, { key: crypto.randomUUID(), location, label: '', pageId: null, url: '' }]
}

function move(key: string, delta: number) {
  const list = rows.value
  const i = list.findIndex((r) => r.key === key)
  const j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return
  if (list[j]!.location !== list[i]!.location) return
  const next = [...list]
  const [item] = next.splice(i, 1)
  next.splice(j, 0, item!)
  rows.value = next
}

const remove = (key: string) => (rows.value = rows.value.filter((r) => r.key !== key))

async function save() {
  error.value = ''
  notice.value = ''

  const blank = rows.value.find((r) => !r.label.trim())
  if (blank) {
    error.value = 'Every menu item needs a label.'
    return
  }

  pending.value = true
  try {
    await $fetch('/api/site/navigation', {
      method: 'PUT',
      body: {
        items: rows.value.map((r) => ({
          location: r.location,
          label: r.label,
          // A page reference wins over a typed address: it survives renames.
          pageId: r.pageId || null,
          url: r.pageId ? null : r.url || null,
        })),
      },
      credentials: 'include',
    })
    notice.value = 'Saved. The whole site has been refreshed.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save navigation.')
  } finally {
    pending.value = false
  }
}

const byLocation = (loc: 'header' | 'footer') => rows.value.filter((r) => r.location === loc)
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">Navigation</h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      The menus in the header and footer. Linking to a page keeps working even if its address changes.
    </p>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <section v-for="loc in (['header', 'footer'] as const)" :key="loc" class="mt-8">
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">{{ loc }}</h2>

      <ul class="mt-3 space-y-2">
        <li
          v-for="row in byLocation(loc)"
          :key="row.key"
          class="rounded-card border border-hairline bg-white p-3"
        >
          <div class="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
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
            <div class="flex gap-1">
              <UiButton variant="ghost" title="Move up" @click="move(row.key, -1)">↑</UiButton>
              <UiButton variant="ghost" title="Move down" @click="move(row.key, 1)">↓</UiButton>
              <UiButton variant="ghost" @click="remove(row.key)">Remove</UiButton>
            </div>
          </div>
          <p v-if="row.pageId && pages.find((p) => p.id === row.pageId)?.status === 'draft'" class="mt-2 text-xs text-gold-ink">
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
