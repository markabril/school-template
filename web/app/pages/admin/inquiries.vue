<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Enquiries — CMS' })

interface Inquiry {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  source: string | null
  handledAt: string | null
  createdAt: string
}

const rows = ref<Inquiry[]>([])
const showAll = ref(false)
const error = ref('')
const busyId = ref('')

async function load() {
  error.value = ''
  try {
    rows.value = (
      await $fetch<{ inquiries: Inquiry[] }>(`/api/site/inquiries?all=${showAll.value}`, {
        credentials: 'include',
      })
    ).inquiries
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load enquiries.')
  }
}
onMounted(load)
watch(showAll, load)

async function markHandled(id: string) {
  busyId.value = id
  try {
    await $fetch(`/api/site/inquiries/${id}/handled`, { method: 'POST', credentials: 'include' })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not update.')
  } finally {
    busyId.value = ''
  }
}

const fmt = (d: string) => new Date(d).toLocaleString()
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">Enquiries</h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      Messages sent through the website's contact and admissions forms.
    </p>
    <!--
      Not emailed anywhere on submit: the free Gmail quota is reserved for
      account mail, and a form that emails on submit is a spam amplifier
      pointed at the school's own inbox.
    -->
    <p class="mt-1 text-xs text-ink-muted">
      These are not emailed — check here, or agree a routine with the office.
    </p>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>

    <label class="mt-6 flex items-center gap-2 text-sm">
      <input v-model="showAll" type="checkbox" class="accent-maroon" />
      Include ones already dealt with
    </label>

    <p v-if="!rows.length" class="mt-6 rounded-card border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
      {{ showAll ? 'No enquiries yet.' : 'Nothing waiting. ' }}
    </p>

    <ul v-else class="mt-6 space-y-3">
      <li
        v-for="q in rows"
        :key="q.id"
        class="rounded-card border bg-white p-4"
        :class="q.handledAt ? 'border-hairline opacity-70' : 'border-gold/40'"
      >
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p class="font-semibold text-ink">{{ q.name }}</p>
          <a :href="`mailto:${q.email}`" class="text-sm text-gold-ink underline underline-offset-2">
            {{ q.email }}
          </a>
          <span v-if="q.phone" class="text-sm text-ink-muted">{{ q.phone }}</span>
          <span class="ml-auto text-xs text-ink-muted">{{ fmt(q.createdAt) }}</span>
        </div>

        <p v-if="q.subject" class="mt-2 text-sm font-medium text-ink">{{ q.subject }}</p>
        <!-- whitespace-pre-line so the sender's own line breaks survive. -->
        <p class="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
          {{ q.message }}
        </p>

        <div class="mt-3 flex items-center gap-2">
          <UiButton v-if="!q.handledAt" variant="secondary" :loading="busyId === q.id" @click="markHandled(q.id)">
            Mark as dealt with
          </UiButton>
          <span v-else class="text-xs text-ink-muted">Dealt with {{ fmt(q.handledAt) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>
