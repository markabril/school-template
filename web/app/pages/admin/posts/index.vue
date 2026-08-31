<script setup lang="ts">
import { slugify } from '@cms/shared'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'News — CMS' })

interface PostRow {
  id: string
  slug: string
  title: string
  category: string | null
  status: 'draft' | 'published'
  publishedAt: string | null
  updatedAt: string
}

const rows = ref<PostRow[]>([])
const error = ref('')
const creating = ref(false)
const title = ref('')
const slug = ref('')
const slugTouched = ref(false)
const pending = ref(false)

watch(title, (t) => {
  if (!slugTouched.value) slug.value = slugify(t)
})

async function load() {
  try {
    rows.value = (await $fetch<{ posts: PostRow[] }>('/api/posts', { credentials: 'include' })).posts
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load articles.')
  }
}
onMounted(load)

async function create() {
  error.value = ''
  pending.value = true
  try {
    const res = await $fetch<{ post: PostRow }>('/api/posts', {
      method: 'POST',
      body: { title: title.value, slug: slug.value },
      credentials: 'include',
    })
    await navigateTo(`/admin/posts/${res.post.id}`)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not create the article.')
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
        <h1 class="font-display text-2xl font-semibold text-maroon">News</h1>
        <p class="mt-1.5 text-sm text-ink-muted">Articles and announcements for the news page.</p>
      </div>
      <UiButton v-if="!creating" @click="creating = true">New article</UiButton>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>

    <form
      v-if="creating"
      class="mt-6 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="create"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField v-model="title" label="Title" required autofocus />
        <UiField
          v-model="slug"
          label="Address"
          required
          :hint="`Will live at /news/${slug || '…'}`"
          @input="slugTouched = true"
        />
      </div>
      <div class="mt-4 flex gap-2">
        <UiButton type="submit" :loading="pending">Create</UiButton>
        <UiButton variant="ghost" @click="creating = false">Cancel</UiButton>
      </div>
    </form>

    <p v-if="!rows.length" class="mt-8 rounded-card border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
      No articles yet.
    </p>

    <div v-else class="mt-8 overflow-x-auto rounded-card border border-hairline bg-white">
      <table class="w-full min-w-[36rem] text-left text-sm">
        <caption class="sr-only">All articles</caption>
        <thead class="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" class="px-4 py-3 font-semibold">Title</th>
            <th scope="col" class="px-4 py-3 font-semibold">Category</th>
            <th scope="col" class="px-4 py-3 font-semibold">Status</th>
            <th scope="col" class="px-4 py-3 font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id" class="border-b border-hairline last:border-0">
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/posts/${p.id}`" class="font-medium text-maroon underline-offset-2 hover:underline">
                {{ p.title }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-ink-muted">{{ p.category ?? '—' }}</td>
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
