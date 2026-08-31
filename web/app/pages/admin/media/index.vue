<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Media — CMS' })

const { items, load, remove, updateMeta } = useMedia()

const error = ref('')
const notice = ref('')
const busyId = ref('')
const editing = ref<string | null>(null)
const draftAlt = ref('')
const draftCaption = ref('')

onMounted(async () => {
  try {
    await load(true)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load the media library.')
  }
})

function startEdit(item: MediaItem) {
  editing.value = item.id
  draftAlt.value = item.alt
  draftCaption.value = item.caption ?? ''
}

async function saveEdit(id: string) {
  busyId.value = id
  error.value = ''
  try {
    await updateMeta(id, { alt: draftAlt.value, caption: draftCaption.value || null })
    editing.value = null
    notice.value = 'Saved.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save.')
  } finally {
    busyId.value = ''
  }
}

async function del(item: MediaItem) {
  // Deleting media that a page still references would leave a broken image.
  // Phase 2's block editor adds a usage check here; until pages exist there is
  // nothing to check against, so a plain confirm is honest rather than lazy.
  if (!confirm(`Delete “${item.filename}”? This cannot be undone.`)) return

  busyId.value = item.id
  error.value = ''
  try {
    await remove(item.id)
    notice.value = 'Deleted.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not delete that file.')
  } finally {
    busyId.value = ''
  }
}

const isImage = (m: MediaItem) => m.mime.startsWith('image/')
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">Media</h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      Photos and documents used across the website.
    </p>

    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>
    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>

    <div class="mt-6">
      <AdminMediaUploader @uploaded="notice = 'Uploaded.'" />
    </div>

    <h2 class="mt-9 text-sm font-bold uppercase tracking-wider text-ink-muted">
      Library <span class="font-normal normal-case tracking-normal">({{ items.length }})</span>
    </h2>

    <p v-if="!items.length" class="mt-4 rounded-card border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
      Nothing uploaded yet.
    </p>

    <ul v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="m in items"
        :key="m.id"
        class="overflow-hidden rounded-card border border-hairline bg-white"
      >
        <div class="grid aspect-[4/3] place-items-center bg-cream">
          <!--
            width/height are set from the stored intrinsic dimensions so the
            grid does not reflow as thumbnails load.
          -->
          <img
            v-if="isImage(m)"
            :src="m.srcset[0]?.url ?? m.url"
            :srcset="srcsetFor(m)"
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
            :alt="m.alt"
            :width="m.width ?? undefined"
            :height="m.height ?? undefined"
            loading="lazy"
            class="size-full object-cover"
          />
          <span v-else class="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {{ m.mime.split('/')[1] }}
          </span>
        </div>

        <div class="p-3.5">
          <p class="truncate text-sm font-medium text-ink" :title="m.filename">
            {{ m.filename }}
          </p>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{ formatBytes(m.size) }}
            <template v-if="m.width">&middot; {{ m.width }}&times;{{ m.height }}</template>
          </p>

          <div v-if="editing === m.id" class="mt-3 space-y-3">
            <UiField v-model="draftAlt" label="Description" required />
            <UiField v-model="draftCaption" label="Caption" />
            <div class="flex gap-2">
              <UiButton :loading="busyId === m.id" @click="saveEdit(m.id)">Save</UiButton>
              <UiButton variant="ghost" @click="editing = null">Cancel</UiButton>
            </div>
          </div>

          <template v-else>
            <p class="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">{{ m.alt }}</p>
            <div class="mt-3 flex gap-2">
              <UiButton variant="secondary" @click="startEdit(m)">Edit</UiButton>
              <UiButton variant="danger" :loading="busyId === m.id" @click="del(m)">Delete</UiButton>
            </div>
          </template>
        </div>
      </li>
    </ul>
  </div>
</template>
