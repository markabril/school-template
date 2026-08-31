<script setup lang="ts">
const emit = defineEmits<{ uploaded: [] }>()
const { upload } = useMedia()

const file = ref<File | null>(null)
const previewUrl = ref('')
const alt = ref('')
const caption = ref('')
const error = ref('')
const pending = ref(false)
const dragging = ref(false)
const input = ref<HTMLInputElement>()

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'

function choose(f: File | undefined) {
  error.value = ''
  if (!f) return
  file.value = f
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = f.type.startsWith('image/') ? URL.createObjectURL(f) : ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  choose(e.dataTransfer?.files?.[0])
}

function reset() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  file.value = null
  alt.value = ''
  caption.value = ''
  if (input.value) input.value.value = ''
}

// Object URLs leak until revoked; the media page can churn through a lot.
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

async function submit() {
  error.value = ''
  if (!file.value) {
    error.value = 'Choose a file first.'
    return
  }
  if (!alt.value.trim()) {
    error.value = 'Describe the file so screen-reader users know what it is.'
    return
  }

  pending.value = true
  try {
    await upload(file.value, alt.value, caption.value || undefined)
    reset()
    emit('uploaded')
  } catch (err) {
    error.value = apiErrorMessage(err, 'Upload failed.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="rounded-card border border-hairline bg-white p-5" @submit.prevent="submit">
    <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">Upload</h2>
    <UiAlert v-if="error" tone="error" class="mt-4">{{ error }}</UiAlert>

    <div
      class="mt-4 rounded-card border-2 border-dashed p-5 text-center transition-colors"
      :class="dragging ? 'border-maroon bg-maroon-tint/40' : 'border-hairline'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt=""
        class="mx-auto max-h-40 rounded-card object-contain"
      />
      <p v-else-if="file" class="text-sm font-medium text-ink">{{ file.name }}</p>
      <p v-else class="text-sm text-ink-muted">Drag a file here, or</p>

      <div class="mt-3">
        <!-- The real input is hidden but still focusable via the label, so
             keyboard users are not locked out of the drop zone. -->
        <label
          class="inline-block cursor-pointer rounded-card border border-hairline bg-white px-3.5 py-2 text-sm font-semibold text-maroon hover:bg-maroon-tint focus-within:outline focus-within:outline-2 focus-within:outline-gold-ink"
        >
          {{ file ? 'Choose a different file' : 'Choose a file' }}
          <input
            ref="input"
            type="file"
            class="sr-only"
            :accept="ACCEPT"
            @change="choose(($event.target as HTMLInputElement).files?.[0])"
          />
        </label>
      </div>

      <p class="mt-3 text-xs text-ink-muted">
        JPEG, PNG, WebP, GIF or PDF. Images up to 10MB, documents up to 25MB.
      </p>
    </div>

    <div class="mt-4 space-y-4">
      <UiField
        v-model="alt"
        label="Describe this file"
        required
        hint="What someone would need to hear if they cannot see it. For example: “Grade 5 pupils presenting their science projects”."
      />
      <UiField v-model="caption" label="Caption" hint="Optional. Shown beneath the image on the page." />
    </div>

    <div class="mt-4 flex gap-2">
      <UiButton type="submit" :loading="pending">Upload</UiButton>
      <UiButton v-if="file" variant="ghost" @click="reset">Clear</UiButton>
    </div>
  </form>
</template>
