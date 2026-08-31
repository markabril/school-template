<script setup lang="ts">
import { EMPTY_DOC, type RichTextDoc } from '@cms/shared'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const id = useRoute().params.id as string

interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: RichTextDoc | null
  category: string | null
  coverMediaId: string | null
  status: 'draft' | 'published'
  publishedAt: string | null
}

const post = ref<Post | null>(null)
const body = ref<RichTextDoc>(structuredClone(EMPTY_DOC))
const error = ref('')
const notice = ref('')
const saving = ref(false)
const publishing = ref(false)

async function load() {
  try {
    const res = await $fetch<{ post: Post }>(`/api/posts/${id}`, { credentials: 'include' })
    post.value = res.post
    body.value = res.post.body ?? structuredClone(EMPTY_DOC)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load this article.')
  }
}
onMounted(load)

useHead({ title: () => `${post.value?.title ?? 'Article'} — CMS` })

async function save() {
  if (!post.value) return
  error.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      body: {
        title: post.value.title,
        slug: post.value.slug,
        excerpt: post.value.excerpt || null,
        category: post.value.category || null,
        coverMediaId: post.value.coverMediaId,
        body: body.value,
      },
      credentials: 'include',
    })
    notice.value = 'Saved.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save.')
  } finally {
    saving.value = false
  }
}

async function togglePublish() {
  if (!post.value) return
  publishing.value = true
  error.value = ''
  try {
    await save()
    const action = post.value.status === 'published' ? 'unpublish' : 'publish'
    const res = await $fetch<{ post: Post }>(`/api/posts/${id}/${action}`, {
      method: 'POST',
      credentials: 'include',
    })
    post.value = { ...post.value, status: res.post.status, publishedAt: res.post.publishedAt }
    notice.value = action === 'publish' ? 'Published.' : 'Unpublished.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not change the status.')
  } finally {
    publishing.value = false
  }
}

async function del() {
  if (!confirm('Delete this article? This cannot be undone.')) return
  try {
    await $fetch(`/api/posts/${id}`, { method: 'DELETE', credentials: 'include' })
    await navigateTo('/admin/posts')
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not delete.')
  }
}

const coverId = computed({
  get: () => post.value?.coverMediaId ?? null,
  set: (v: string | null) => post.value && (post.value.coverMediaId = v),
})
</script>

<template>
  <div v-if="post">
    <NuxtLink to="/admin/posts" class="text-sm text-gold-ink underline underline-offset-2">
      ← All news
    </NuxtLink>

    <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
      <h1 class="font-display text-2xl font-semibold text-maroon">{{ post.title }}</h1>
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="post.status === 'published' ? 'bg-gold-tint text-gold-ink' : 'bg-navy-tint text-navy'"
        >
          {{ post.status }}
        </span>
        <UiButton variant="secondary" :loading="saving" @click="save">Save</UiButton>
        <UiButton :loading="publishing" @click="togglePublish">
          {{ post.status === 'published' ? 'Unpublish' : 'Publish' }}
        </UiButton>
      </div>
    </div>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <div class="mt-6 space-y-5 rounded-card border border-hairline bg-white p-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField v-model="post.title" label="Title" required />
        <UiField v-model="post.slug" label="Address" :hint="`/news/${post.slug}`" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField
          v-model="post.category as string"
          label="Category"
          hint="Optional. For example: Announcements, Achievements."
        />
        <UiField
          v-model="post.excerpt as string"
          label="Summary"
          hint="Shown on the news listing. Left empty, the opening of the article is used."
        />
      </div>
      <AdminMediaPicker v-model="coverId" label="Cover image" />
    </div>

    <div class="mt-5">
      <AdminRichTextInput v-model="body" label="Article" />
    </div>

    <div class="mt-6 flex items-center gap-2 border-t border-hairline pt-5">
      <UiButton :loading="saving" @click="save">Save changes</UiButton>
      <NuxtLink v-if="post.status === 'published'" :to="`/news/${post.slug}`" target="_blank">
        <UiButton variant="ghost">View live</UiButton>
      </NuxtLink>
      <UiButton variant="danger" class="ml-auto" @click="del">Delete</UiButton>
    </div>
  </div>
</template>
