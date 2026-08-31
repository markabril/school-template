<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Downloads — CMS' })

interface DownloadRow {
  id: string
  title: string
  description: string | null
  mediaId: string
  category: string | null
  seq: number
  isPublished: boolean
  file: MediaItem | null
}

const rows = ref<DownloadRow[]>([])
const error = ref('')
const notice = ref('')
const busyId = ref('')
const editing = ref<Partial<DownloadRow> | null>(null)

async function load() {
  try {
    rows.value = (
      await $fetch<{ downloads: DownloadRow[] }>('/api/site/downloads', { credentials: 'include' })
    ).downloads
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load downloads.')
  }
}
onMounted(load)

const categories = computed(() =>
  [...new Set(rows.value.map((r) => r.category).filter((c): c is string => !!c))].sort(),
)

const startNew = () =>
  (editing.value = {
    title: '',
    description: '',
    mediaId: '',
    category: '',
    seq: rows.value.length,
    isPublished: false,
  })

const startEdit = (r: DownloadRow) => (editing.value = { ...r })

async function save() {
  if (!editing.value?.title?.trim()) {
    error.value = 'A title is required.'
    return
  }
  if (!editing.value.mediaId) {
    // The file is the entire point of the record; without it there is nothing
    // to download and the public list would render a dead row.
    error.value = 'Choose a file. Upload it in Media first if it is not there yet.'
    return
  }

  error.value = ''
  busyId.value = editing.value.id ?? 'new'
  try {
    await $fetch('/api/site/downloads', {
      method: 'PUT',
      body: {
        id: editing.value.id,
        title: editing.value.title,
        description: editing.value.description || null,
        mediaId: editing.value.mediaId,
        category: editing.value.category || null,
        seq: editing.value.seq ?? 0,
        isPublished: editing.value.isPublished ?? false,
      },
      credentials: 'include',
    })
    editing.value = null
    notice.value = 'Saved.'
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save.')
  } finally {
    busyId.value = ''
  }
}

async function del(r: DownloadRow) {
  if (!confirm(`Remove “${r.title}” from downloads? The file stays in Media.`)) return
  busyId.value = r.id
  try {
    await $fetch(`/api/site/downloads/${r.id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = ''
  }
}

const fileId = computed({
  get: () => (editing.value?.mediaId || null) as string | null,
  set: (v: string | null) => editing.value && (editing.value.mediaId = v ?? ''),
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-maroon">Downloads</h1>
        <p class="mt-1.5 text-sm text-ink-muted">
          Forms and documents parents can download. Upload the file in Media first.
        </p>
      </div>
      <UiButton v-if="!editing" @click="startNew">Add a download</UiButton>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <form
      v-if="editing"
      class="mt-6 space-y-4 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="save"
    >
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">
        {{ editing.id ? 'Edit' : 'New download' }}
      </h2>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiField v-model="editing.title as string" label="Title" required />
        <div>
          <label for="cat" class="block text-sm font-semibold text-ink">Category</label>
          <input
            id="cat"
            v-model="editing.category as string"
            list="dl-categories"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
          <datalist id="dl-categories">
            <option v-for="c in categories" :key="c" :value="c" />
          </datalist>
        </div>
      </div>

      <UiField
        v-model="editing.description as string"
        label="Description"
        hint="Optional. A line explaining what the file is for."
      />

      <AdminMediaPicker v-model="fileId" label="File" accept="any" />

      <label class="flex items-center gap-2 text-sm">
        <input v-model="editing.isPublished" type="checkbox" class="accent-maroon" />
        Show on the website
      </label>

      <div class="flex gap-2">
        <UiButton type="submit" :loading="busyId !== ''">Save</UiButton>
        <UiButton variant="ghost" @click="editing = null">Cancel</UiButton>
      </div>
    </form>

    <p v-if="!rows.length" class="mt-8 rounded-card border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
      No downloads yet.
    </p>

    <ul v-else class="mt-8 space-y-2">
      <li
        v-for="r in rows"
        :key="r.id"
        class="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-white p-3.5"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium text-ink">{{ r.title }}</p>
          <p class="text-sm text-ink-muted">
            <template v-if="r.category">{{ r.category }} &middot; </template>
            <template v-if="r.file">{{ formatBytes(r.file.size) }}</template>
            <span v-else class="text-maroon">file missing</span>
          </p>
        </div>
        <span
          class="rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="r.isPublished ? 'bg-gold-tint text-gold-ink' : 'bg-navy-tint text-navy'"
        >
          {{ r.isPublished ? 'shown' : 'hidden' }}
        </span>
        <UiButton variant="secondary" @click="startEdit(r)">Edit</UiButton>
        <UiButton variant="danger" :loading="busyId === r.id" @click="del(r)">Remove</UiButton>
      </li>
    </ul>
  </div>
</template>
