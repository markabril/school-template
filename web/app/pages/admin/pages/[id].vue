<script setup lang="ts">
import type { BlockType } from '@cms/shared'
import type { EditableBlock } from '~/components/admin/BlockEditor.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const id = useRoute().params.id as string

interface PageDetail {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  publishedAt: string | null
}

const page = ref<PageDetail | null>(null)
const blocks = ref<EditableBlock[]>([])
const error = ref('')
const notice = ref('')
const saving = ref(false)
const publishing = ref(false)
const previewUrl = ref('')

// Snapshot of the last saved state, so "unsaved changes" is a fact rather than
// a guess based on whether anything was clicked.
const savedSnapshot = ref('')
const dirty = computed(
  () => savedSnapshot.value !== JSON.stringify(blocks.value.map((b) => ({ t: b.type, d: b.data }))),
)

function snapshot() {
  savedSnapshot.value = JSON.stringify(blocks.value.map((b) => ({ t: b.type, d: b.data })))
}

async function load() {
  try {
    const res = await $fetch<{
      page: PageDetail
      blocks: Array<{ id: string; type: BlockType; data: Record<string, unknown> }>
    }>(`/api/pages/${id}`, { credentials: 'include' })

    page.value = res.page
    blocks.value = res.blocks.map((b) => ({ key: b.id, type: b.type, data: b.data }))
    await nextTick()
    snapshot()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load this page.')
  }
}
onMounted(load)

useHead({ title: () => `${page.value?.title ?? 'Page'} — CMS` })

async function save() {
  error.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/pages/${id}/blocks`, {
      method: 'PUT',
      body: { blocks: blocks.value.map((b) => ({ type: b.type, data: b.data })) },
      credentials: 'include',
    })
    snapshot()
    notice.value = 'Saved.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save.')
  } finally {
    saving.value = false
  }
}

async function togglePublish() {
  error.value = ''
  notice.value = ''
  publishing.value = true
  try {
    // Publishing stale content is worse than an extra request — always save
    // first so what goes live is what is on screen.
    if (dirty.value) await save()

    const action = page.value?.status === 'published' ? 'unpublish' : 'publish'
    const res = await $fetch<{ page: PageDetail }>(`/api/pages/${id}/${action}`, {
      method: 'POST',
      credentials: 'include',
    })
    page.value = res.page
    notice.value = action === 'publish' ? 'Published and live.' : 'Unpublished.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not change the status.')
  } finally {
    publishing.value = false
  }
}

async function makePreviewLink() {
  error.value = ''
  try {
    if (dirty.value) await save()
    const res = await $fetch<{ url: string }>(`/api/pages/${id}/preview-link`, {
      method: 'POST',
      credentials: 'include',
    })
    previewUrl.value = res.url
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not create a preview link.')
  }
}

// Browser-level guard. The in-page banner is the real signal; this catches the
// tab-close case, which no amount of in-page UI can.
onMounted(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (dirty.value) e.preventDefault()
  }
  window.addEventListener('beforeunload', handler)
  onBeforeUnmount(() => window.removeEventListener('beforeunload', handler))
})

const publicPath = computed(() =>
  page.value ? (page.value.slug === 'home' ? '/' : `/${page.value.slug}`) : '',
)
</script>

<template>
  <div>
    <NuxtLink to="/admin/pages" class="text-sm text-gold-ink underline underline-offset-2">
      ← All pages
    </NuxtLink>

    <div v-if="page" class="mt-3 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="font-display text-2xl font-semibold text-maroon">{{ page.title }}</h1>
        <p class="mt-1 font-mono text-xs text-ink-muted">{{ publicPath }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="page.status === 'published' ? 'bg-gold-tint text-gold-ink' : 'bg-navy-tint text-navy'"
        >
          {{ page.status }}
        </span>
        <UiButton variant="ghost" @click="makePreviewLink">Preview</UiButton>
        <UiButton variant="secondary" :loading="saving" @click="save">Save</UiButton>
        <UiButton :loading="publishing" @click="togglePublish">
          {{ page.status === 'published' ? 'Unpublish' : 'Publish' }}
        </UiButton>
      </div>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <UiAlert v-if="previewUrl" tone="info" class="mt-5">
      Preview link, valid for 30 minutes:
      <a :href="previewUrl" target="_blank" rel="noopener" class="break-all underline">
        {{ previewUrl }}
      </a>
    </UiAlert>

    <div
      v-if="dirty"
      class="mt-5 rounded-card border border-gold/40 bg-gold-tint px-3.5 py-2.5 text-sm text-gold-ink"
    >
      You have unsaved changes.
    </div>

    <div class="mt-6">
      <AdminBlockEditor v-model="blocks" />
    </div>

    <div class="mt-6 flex gap-2 border-t border-hairline pt-5">
      <UiButton :loading="saving" @click="save">Save changes</UiButton>
      <NuxtLink v-if="page?.status === 'published'" :to="publicPath" target="_blank">
        <UiButton variant="ghost">View live page</UiButton>
      </NuxtLink>
    </div>
  </div>
</template>
