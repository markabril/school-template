<script setup lang="ts">
import { slugify } from '@cms/shared'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Events — CMS' })

interface EventRow {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  status: 'draft' | 'published'
}

const rows = ref<EventRow[]>([])
const error = ref('')
const notice = ref('')
const busyId = ref('')
const creating = ref(false)
const pending = ref(false)
const draft = reactive({ title: '', startsAt: '', location: '' })

interface EventDetail extends EventRow {
  description: import('@cms/shared').RichTextDoc | null
  coverMediaId: string | null
}

const editing = ref<{
  id: string
  title: string
  startsAt: string
  endsAt: string
  allDay: boolean
  location: string
  description: import('@cms/shared').RichTextDoc
  coverMediaId: string | null
} | null>(null)
const saving = ref(false)

/** `datetime-local` wants local wall-clock time with no zone or seconds. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function startEdit(e: EventRow) {
  error.value = ''
  try {
    const { event } = await $fetch<{ event: EventDetail }>(`/api/events/${e.id}`, { credentials: 'include' })
    editing.value = {
      id: event.id,
      title: event.title,
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt),
      allDay: event.allDay,
      location: event.location ?? '',
      description: event.description ?? { type: 'doc', content: [] },
      coverMediaId: event.coverMediaId,
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load that event.')
  }
}

async function saveEdit() {
  if (!editing.value) return
  error.value = ''
  saving.value = true
  try {
    await $fetch(`/api/events/${editing.value.id}`, {
      method: 'PATCH',
      body: {
        title: editing.value.title,
        startsAt: new Date(editing.value.startsAt).toISOString(),
        endsAt: editing.value.endsAt ? new Date(editing.value.endsAt).toISOString() : null,
        allDay: editing.value.allDay,
        location: editing.value.location || null,
        description: editing.value.description,
        coverMediaId: editing.value.coverMediaId,
      },
      credentials: 'include',
    })
    editing.value = null
    notice.value = 'Event saved.'
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save the event.')
  } finally {
    saving.value = false
  }
}

const coverId = computed({
  get: () => editing.value?.coverMediaId ?? null,
  set: (v: string | null) => editing.value && (editing.value.coverMediaId = v),
})
const description = computed({
  get: () => editing.value!.description,
  set: (v) => editing.value && (editing.value.description = v),
})

async function load() {
  try {
    rows.value = (await $fetch<{ events: EventRow[] }>('/api/events', { credentials: 'include' })).events
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load events.')
  }
}
onMounted(load)

async function create() {
  error.value = ''
  if (!draft.startsAt) {
    error.value = 'Give the event a date and time.'
    return
  }
  pending.value = true
  try {
    const res = await $fetch<{ event: EventRow }>('/api/events', {
      method: 'POST',
      body: {
        title: draft.title,
        // Slug gets the date appended: schools run "Family Day" every year, and
        // the second one must not collide with the first.
        slug: `${slugify(draft.title)}-${draft.startsAt.slice(0, 10)}`,
        startsAt: new Date(draft.startsAt).toISOString(),
      },
      credentials: 'include',
    })
    if (draft.location) {
      await $fetch(`/api/events/${res.event.id}`, {
        method: 'PATCH',
        body: { location: draft.location },
        credentials: 'include',
      })
    }
    draft.title = ''
    draft.startsAt = ''
    draft.location = ''
    creating.value = false
    notice.value = 'Event created as a draft.'
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not create the event.')
  } finally {
    pending.value = false
  }
}

async function toggle(e: EventRow) {
  busyId.value = e.id
  try {
    await $fetch(`/api/events/${e.id}/${e.status === 'published' ? 'unpublish' : 'publish'}`, {
      method: 'POST',
      credentials: 'include',
    })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = ''
  }
}

async function del(e: EventRow) {
  if (!confirm(`Delete “${e.title}”?`)) return
  busyId.value = e.id
  try {
    await $fetch(`/api/events/${e.id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = ''
  }
}

const fmt = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const isPast = (e: EventRow) => new Date(e.endsAt ?? e.startsAt) < new Date()
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-maroon">Events</h1>
        <p class="mt-1.5 text-sm text-ink-muted">
          The school calendar. Events stay listed until they finish, not until they start.
        </p>
      </div>
      <UiButton v-if="!creating" @click="creating = true">New event</UiButton>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <form
      v-if="creating"
      class="mt-6 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="create"
    >
      <div class="grid gap-4 sm:grid-cols-3">
        <UiField v-model="draft.title" label="Title" required autofocus />
        <div>
          <label for="startsAt" class="block text-sm font-semibold text-ink">Starts</label>
          <input
            id="startsAt"
            v-model="draft.startsAt"
            type="datetime-local"
            required
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
        </div>
        <UiField v-model="draft.location" label="Location" hint="Optional." />
      </div>
      <div class="mt-4 flex gap-2">
        <UiButton type="submit" :loading="pending">Create</UiButton>
        <UiButton variant="ghost" @click="creating = false">Cancel</UiButton>
      </div>
    </form>

    <form
      v-if="editing"
      class="mt-6 space-y-4 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="saveEdit"
    >
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">Edit event</h2>

      <UiField v-model="editing.title" label="Title" required />

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="edit-starts" class="block text-sm font-semibold text-ink">Starts</label>
          <input
            id="edit-starts"
            v-model="editing.startsAt"
            type="datetime-local"
            required
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
        </div>
        <div>
          <label for="edit-ends" class="block text-sm font-semibold text-ink">Ends</label>
          <input
            id="edit-ends"
            v-model="editing.endsAt"
            type="datetime-local"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
          <p class="mt-1.5 text-xs text-ink-muted">Optional. Events stay listed until they end.</p>
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="editing.allDay" type="checkbox" class="accent-maroon" />
        All day
      </label>

      <UiField v-model="editing.location" label="Location" hint="Optional." />

      <AdminMediaPicker v-model="coverId" label="Picture" />
      <p class="text-xs text-ink-muted">
        Shown when this is the next event on the homepage. Without one, a large date is shown instead.
      </p>

      <AdminRichTextInput v-model="description" label="Description" />

      <div class="flex gap-2">
        <UiButton type="submit" :loading="saving">Save event</UiButton>
        <UiButton variant="ghost" @click="editing = null">Cancel</UiButton>
      </div>
    </form>

    <p v-if="!rows.length" class="mt-8 rounded-card border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
      No events yet.
    </p>

    <ul v-else class="mt-8 space-y-2">
      <li
        v-for="e in rows"
        :key="e.id"
        class="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-white p-4"
        :class="isPast(e) ? 'opacity-60' : ''"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium text-ink">
            {{ e.title }}
            <span v-if="isPast(e)" class="ml-2 text-xs font-normal text-ink-muted">(past)</span>
          </p>
          <p class="mt-0.5 text-sm text-ink-muted">
            {{ fmt(e.startsAt) }}<template v-if="e.location"> &middot; {{ e.location }}</template>
          </p>
        </div>
        <span
          class="rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="e.status === 'published' ? 'bg-gold-tint text-gold-ink' : 'bg-navy-tint text-navy'"
        >
          {{ e.status }}
        </span>
        <UiButton variant="secondary" @click="startEdit(e)">Edit</UiButton>
        <UiButton variant="secondary" :loading="busyId === e.id" @click="toggle(e)">
          {{ e.status === 'published' ? 'Unpublish' : 'Publish' }}
        </UiButton>
        <UiButton variant="danger" :loading="busyId === e.id" @click="del(e)">Delete</UiButton>
      </li>
    </ul>
  </div>
</template>
