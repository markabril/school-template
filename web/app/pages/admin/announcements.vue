<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Announcements — CMS' })

interface AnnouncementRow {
  id: string
  title: string
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

const rows = ref<AnnouncementRow[]>([])
const error = ref('')
const notice = ref('')
const busyId = ref('')
const editing = ref<{ id?: string; title: string; startsAt: string; endsAt: string } | null>(null)

async function load() {
  try {
    rows.value = (
      await $fetch<{ announcements: AnnouncementRow[] }>('/api/site/announcements', {
        credentials: 'include',
      })
    ).announcements
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load announcements.')
  }
}
onMounted(load)

// datetime-local wants 'YYYY-MM-DDTHH:mm' with no zone or seconds.
const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')

const startNew = () => (editing.value = { title: '', startsAt: '', endsAt: '' })
const startEdit = (r: AnnouncementRow) =>
  (editing.value = { id: r.id, title: r.title, startsAt: toLocal(r.startsAt), endsAt: toLocal(r.endsAt) })

async function save() {
  if (!editing.value?.title.trim()) {
    error.value = 'An announcement needs some text.'
    return
  }
  error.value = ''
  busyId.value = editing.value.id ?? 'new'
  try {
    await $fetch('/api/site/announcements', {
      method: 'PUT',
      body: {
        id: editing.value.id,
        title: editing.value.title,
        startsAt: editing.value.startsAt ? new Date(editing.value.startsAt).toISOString() : null,
        endsAt: editing.value.endsAt ? new Date(editing.value.endsAt).toISOString() : null,
      },
      credentials: 'include',
    })
    editing.value = null
    notice.value = 'Saved. The whole site has been refreshed.'
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save.')
  } finally {
    busyId.value = ''
  }
}

async function del(r: AnnouncementRow) {
  if (!confirm('Remove this announcement?')) return
  busyId.value = r.id
  try {
    await $fetch(`/api/site/announcements/${r.id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = ''
  }
}

/** Mirrors the API's window logic so the badge cannot disagree with the site. */
function state(r: AnnouncementRow): 'showing' | 'scheduled' | 'finished' {
  const now = Date.now()
  if (r.startsAt && new Date(r.startsAt).getTime() > now) return 'scheduled'
  if (r.endsAt && new Date(r.endsAt).getTime() < now) return 'finished'
  return 'showing'
}

const badge: Record<string, string> = {
  showing: 'bg-gold-tint text-gold-ink',
  scheduled: 'bg-navy-tint text-navy',
  finished: 'bg-maroon-tint text-maroon',
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-maroon">Announcements</h1>
        <p class="mt-1.5 text-sm text-ink-muted">
          A banner across the top of every page. Use sparingly — three show at most.
        </p>
      </div>
      <UiButton v-if="!editing" @click="startNew">New announcement</UiButton>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <form
      v-if="editing"
      class="mt-6 space-y-4 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="save"
    >
      <UiField
        v-model="editing.title"
        label="Message"
        required
        hint="Keep it to one line. For example: “Classes suspended on Friday due to the typhoon warning.”"
      />
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="from" class="block text-sm font-semibold text-ink">Show from</label>
          <input
            id="from"
            v-model="editing.startsAt"
            type="datetime-local"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
          <p class="mt-1.5 text-xs text-ink-muted">Leave empty to show immediately.</p>
        </div>
        <div>
          <label for="until" class="block text-sm font-semibold text-ink">Show until</label>
          <input
            id="until"
            v-model="editing.endsAt"
            type="datetime-local"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
          <!-- Without an end date these outlive their usefulness and a stale
               notice on a school homepage is worse than none. -->
          <p class="mt-1.5 text-xs text-ink-muted">
            Set one where you can — it stops old notices lingering.
          </p>
        </div>
      </div>

      <div class="flex gap-2">
        <UiButton type="submit" :loading="busyId !== ''">Save</UiButton>
        <UiButton variant="ghost" @click="editing = null">Cancel</UiButton>
      </div>
    </form>

    <p v-if="!rows.length" class="mt-8 rounded-card border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
      No announcements. The banner is hidden.
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
            <template v-if="fmt(r.startsAt)">From {{ fmt(r.startsAt) }}</template>
            <template v-else>Showing now</template>
            <template v-if="fmt(r.endsAt)"> until {{ fmt(r.endsAt) }}</template>
            <template v-else> with no end date</template>
          </p>
        </div>
        <span :class="[badge[state(r)], 'rounded-full px-2 py-0.5 text-xs font-semibold']">
          {{ state(r) }}
        </span>
        <UiButton variant="secondary" @click="startEdit(r)">Edit</UiButton>
        <UiButton variant="danger" :loading="busyId === r.id" @click="del(r)">Remove</UiButton>
      </li>
    </ul>
  </div>
</template>
