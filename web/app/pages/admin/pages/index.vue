<script setup lang="ts">
import { slugify } from '@cms/shared'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Pages — CMS' })

interface PageRow {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  publishedAt: string | null
  updatedAt: string
}

const rows = ref<PageRow[]>([])
const error = ref('')
const creating = ref(false)
const title = ref('')
const slug = ref('')
const slugTouched = ref(false)
const pending = ref(false)

// Auto-fill the address from the title until the editor edits it themselves.
watch(title, (t) => {
  if (!slugTouched.value) slug.value = slugify(t)
})

async function load() {
  try {
    rows.value = (await $fetch<{ pages: PageRow[] }>('/api/pages', { credentials: 'include' })).pages
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load pages.')
  }
}
onMounted(load)

async function create() {
  error.value = ''
  pending.value = true
  try {
    const res = await $fetch<{ page: PageRow }>('/api/pages', {
      method: 'POST',
      body: { title: title.value, slug: slug.value },
      credentials: 'include',
    })
    await navigateTo(`/admin/pages/${res.page.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not create the page.')
  } finally {
    pending.value = false
  }
}

const fmt = (d: string) => new Date(d).toLocaleDateString()
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-maroon">Pages</h1>
        <p class="mt-1.5 text-sm text-ink-muted">The pages that make up the website.</p>
      </div>
      <UiButton v-if="!creating" @click="creating = true">New page</UiButton>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>

    <form
      v-if="creating"
      class="mt-6 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="create"
    >
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">New page</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <UiField v-model="title" label="Title" required autofocus />
        <UiField
          v-model="slug"
          label="Address"
          required
          :hint="`The page will live at /${slug || '…'}`"
          @input="slugTouched = true"
        />
      </div>
      <div class="mt-4 flex gap-2">
        <UiButton type="submit" :loading="pending">Create</UiButton>
        <UiButton variant="ghost" @click="creating = false">Cancel</UiButton>
      </div>
    </form>

    <div class="mt-8 overflow-x-auto rounded-card border border-hairline bg-white">
      <table class="w-full min-w-[36rem] text-left text-sm">
        <caption class="sr-only">All pages with their address and status</caption>
        <thead class="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" class="px-4 py-3 font-semibold">Title</th>
            <th scope="col" class="px-4 py-3 font-semibold">Address</th>
            <th scope="col" class="px-4 py-3 font-semibold">Status</th>
            <th scope="col" class="px-4 py-3 font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id" class="border-b border-hairline last:border-0">
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/pages/${p.id}`" class="font-medium text-maroon underline-offset-2 hover:underline">
                {{ p.title }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-ink-muted">
              /{{ p.slug === 'home' ? '' : p.slug }}
            </td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="p.status === 'published' ? 'bg-gold-tint text-gold-ink' : 'bg-navy-tint text-navy'"
              >
                {{ p.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-ink-muted">{{ fmt(p.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
