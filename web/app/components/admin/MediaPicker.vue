<script setup lang="ts">
const model = defineModel<string | null>({ required: true })
const props = withDefaults(
  defineProps<{
    label?: string
    /** 'image' for photos, 'any' to include PDFs and other documents. */
    accept?: 'image' | 'any'
  }>(),
  { accept: 'image' },
)

const { items, load } = useMedia()
const open = ref(false)
const error = ref('')

const selected = computed(() => items.value.find((m) => m.id === model.value))
const choices = computed(() =>
  props.accept === 'any' ? items.value : items.value.filter((m) => m.mime.startsWith('image/')),
)

const isImage = (mime: string) => mime.startsWith('image/')
const kind = (mime: string) =>
  mime === 'application/pdf' ? 'PDF' : (mime.split('/')[1]?.toUpperCase() ?? 'FILE')

async function show() {
  open.value = true
  try {
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load the media library.')
  }
}

function pick(id: string) {
  model.value = id
  open.value = false
}
</script>

<template>
  <div>
    <p v-if="label" class="mb-1.5 text-sm font-semibold text-ink">{{ label }}</p>

    <div v-if="selected" class="flex items-start gap-3 rounded-card border border-hairline bg-white p-3">
      <img
        v-if="isImage(selected.mime)"
        :src="selected.srcset[0]?.url ?? selected.url"
        :alt="selected.alt"
        class="size-16 shrink-0 rounded object-cover"
      />
      <div
        v-else
        class="grid size-16 shrink-0 place-items-center rounded bg-maroon-tint text-xs font-bold text-maroon"
      >
        {{ kind(selected.mime) }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-ink">{{ selected.filename }}</p>
        <p class="mt-0.5 line-clamp-2 text-xs text-ink-muted">{{ selected.alt }}</p>
        <div class="mt-2 flex gap-2">
          <UiButton variant="secondary" @click="show">Change</UiButton>
          <UiButton variant="ghost" @click="model = null">Remove</UiButton>
        </div>
      </div>
    </div>

    <UiButton v-else variant="secondary" @click="show">
      {{ accept === 'any' ? 'Choose a file' : 'Choose an image' }}
    </UiButton>

    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-navy-deep/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose an image"
      @click.self="open = false"
      @keydown.esc="open = false"
    >
      <div class="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-card bg-white p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-maroon">Choose an image</h2>
          <UiButton variant="ghost" @click="open = false">Close</UiButton>
        </div>

        <UiAlert v-if="error" tone="error" class="mt-4">{{ error }}</UiAlert>

        <p v-if="!choices.length" class="mt-6 text-center text-sm text-ink-muted">
          Nothing here yet. Upload files in
          <NuxtLink to="/admin/media" class="text-gold-ink underline">Media</NuxtLink>.
        </p>

        <ul v-else class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <li v-for="m in choices" :key="m.id">
            <button
              type="button"
              class="w-full overflow-hidden rounded-card border-2 text-left transition-colors"
              :class="m.id === model ? 'border-maroon' : 'border-hairline hover:border-gold'"
              @click="pick(m.id)"
            >
              <img
                v-if="isImage(m.mime)"
                :src="m.srcset[0]?.url ?? m.url"
                :alt="m.alt"
                loading="lazy"
                class="aspect-[4/3] w-full object-cover"
              />
              <span
                v-else
                class="grid aspect-[4/3] w-full place-items-center bg-cream text-sm font-bold text-ink-muted"
              >
                {{ kind(m.mime) }}
              </span>
              <span class="block truncate px-2 py-1.5 text-xs text-ink-muted">{{ m.filename }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
