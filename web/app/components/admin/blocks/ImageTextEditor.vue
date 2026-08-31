<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'

const model = defineModel<Record<string, unknown>>({ required: true })

function field<T>(key: string) {
  return computed({
    get: () => model.value[key] as T,
    set: (v: T) => (model.value = { ...model.value, [key]: v }),
  })
}

const heading = field<string>('heading')
const doc = field<RichTextDoc>('doc')
const imageMediaId = field<string | null>('imageMediaId')
const imagePosition = field<'left' | 'right'>('imagePosition')
</script>

<template>
  <div class="space-y-4">
    <UiField v-model="heading" label="Heading" hint="Optional." />
    <AdminMediaPicker v-model="imageMediaId" label="Image" />

    <fieldset>
      <legend class="mb-1.5 text-sm font-semibold text-ink">Image position</legend>
      <div class="flex gap-4">
        <label v-for="pos in ['left', 'right']" :key="pos" class="flex items-center gap-2 text-sm">
          <input
            v-model="imagePosition"
            type="radio"
            :value="pos"
            name="image-position"
            class="accent-maroon"
          />
          {{ pos === 'left' ? 'Left of the text' : 'Right of the text' }}
        </label>
      </div>
      <p class="mt-1.5 text-xs text-ink-muted">
        On phones the image always appears above the text, whichever side is chosen.
      </p>
    </fieldset>

    <AdminRichTextInput v-model="doc" label="Text" />
  </div>
</template>
