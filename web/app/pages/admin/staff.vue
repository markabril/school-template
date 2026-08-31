<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Staff — CMS' })

interface StaffRow {
  id: string
  name: string
  roleTitle: string | null
  department: string | null
  photoMediaId: string | null
  bio: string | null
  email: string | null
  seq: number
  isPublished: boolean
  photo: MediaItem | null
}

const rows = ref<StaffRow[]>([])
const error = ref('')
const notice = ref('')
const busyId = ref('')
const editing = ref<Partial<StaffRow> | null>(null)

async function load() {
  try {
    rows.value = (await $fetch<{ staff: StaffRow[] }>('/api/site/staff', { credentials: 'include' })).staff
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load staff.')
  }
}
onMounted(load)

const departments = computed(() =>
  [...new Set(rows.value.map((r) => r.department).filter((d): d is string => !!d))].sort(),
)

function startNew() {
  editing.value = {
    name: '',
    roleTitle: '',
    department: '',
    photoMediaId: null,
    bio: '',
    email: '',
    // New people go to the end of their department rather than the top.
    seq: rows.value.length,
    isPublished: false,
  }
}

const startEdit = (r: StaffRow) => (editing.value = { ...r })

async function save() {
  if (!editing.value?.name?.trim()) {
    error.value = 'A name is required.'
    return
  }
  error.value = ''
  busyId.value = editing.value.id ?? 'new'
  try {
    await $fetch('/api/site/staff', {
      method: 'PUT',
      body: {
        id: editing.value.id,
        name: editing.value.name,
        roleTitle: editing.value.roleTitle || null,
        department: editing.value.department || null,
        photoMediaId: editing.value.photoMediaId ?? null,
        bio: editing.value.bio || null,
        email: editing.value.email || null,
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

async function togglePublished(r: StaffRow) {
  busyId.value = r.id
  try {
    await $fetch('/api/site/staff', {
      method: 'PUT',
      body: { ...r, photo: undefined, isPublished: !r.isPublished },
      credentials: 'include',
    })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = ''
  }
}

async function del(r: StaffRow) {
  if (!confirm(`Remove ${r.name} from the staff list?`)) return
  busyId.value = r.id
  try {
    await $fetch(`/api/site/staff/${r.id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = ''
  }
}

const photoId = computed({
  get: () => editing.value?.photoMediaId ?? null,
  set: (v: string | null) => editing.value && (editing.value.photoMediaId = v),
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-maroon">Staff</h1>
        <p class="mt-1.5 text-sm text-ink-muted">
          Teachers and staff shown on the website. Only published people appear.
        </p>
      </div>
      <UiButton v-if="!editing" @click="startNew">Add someone</UiButton>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <form
      v-if="editing"
      class="mt-6 space-y-4 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="save"
    >
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">
        {{ editing.id ? 'Edit' : 'New staff member' }}
      </h2>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiField v-model="editing.name as string" label="Name" required />
        <UiField v-model="editing.roleTitle as string" label="Role" hint="For example: Grade 5 Adviser." />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="dept" class="block text-sm font-semibold text-ink">Department</label>
          <input
            id="dept"
            v-model="editing.department as string"
            list="departments"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
          <datalist id="departments">
            <option v-for="d in departments" :key="d" :value="d" />
          </datalist>
          <p class="mt-1.5 text-xs text-ink-muted">Groups people on the staff page.</p>
        </div>
        <UiField v-model="editing.email as string" label="Email" hint="Optional. Shown publicly if set." />
      </div>

      <div>
        <label for="bio" class="block text-sm font-semibold text-ink">Short biography</label>
        <textarea
          id="bio"
          v-model="editing.bio as string"
          rows="3"
          class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
        />
      </div>

      <AdminMediaPicker v-model="photoId" label="Photo" />

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
      Nobody added yet.
    </p>

    <ul v-else class="mt-8 space-y-2">
      <li
        v-for="r in rows"
        :key="r.id"
        class="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-white p-3"
      >
        <img
          v-if="r.photo"
          :src="r.photo.srcset[0]?.url ?? r.photo.url"
          :alt="r.photo.alt"
          class="size-12 shrink-0 rounded-full object-cover"
        />
        <div v-else class="grid size-12 shrink-0 place-items-center rounded-full bg-maroon-tint text-sm font-semibold text-maroon">
          {{ r.name.split(' ').map((p) => p[0]).slice(0, 2).join('') }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="font-medium text-ink">{{ r.name }}</p>
          <p class="text-sm text-ink-muted">
            {{ r.roleTitle ?? '—' }}<template v-if="r.department"> &middot; {{ r.department }}</template>
          </p>
        </div>

        <span
          class="rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="r.isPublished ? 'bg-gold-tint text-gold-ink' : 'bg-navy-tint text-navy'"
        >
          {{ r.isPublished ? 'shown' : 'hidden' }}
        </span>
        <UiButton variant="secondary" @click="startEdit(r)">Edit</UiButton>
        <UiButton variant="ghost" :loading="busyId === r.id" @click="togglePublished(r)">
          {{ r.isPublished ? 'Hide' : 'Show' }}
        </UiButton>
        <UiButton variant="danger" :loading="busyId === r.id" @click="del(r)">Remove</UiButton>
      </li>
    </ul>
  </div>
</template>
