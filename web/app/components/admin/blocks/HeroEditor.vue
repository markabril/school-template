<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })

function field<T>(key: string) {
  return computed({
    get: () => model.value[key] as T,
    set: (v: T) => (model.value = { ...model.value, [key]: v }),
  })
}

const title = field<string>('title')
const subtitle = field<string>('subtitle')
const imageMediaId = field<string | null>('imageMediaId')
const ctas = field<Array<{ label: string; href: string }>>('ctas')

function addCta() {
  ctas.value = [...(ctas.value ?? []), { label: '', href: '' }]
}
function removeCta(i: number) {
  ctas.value = ctas.value.filter((_, idx) => idx !== i)
}
function updateCta(i: number, key: 'label' | 'href', value: string) {
  ctas.value = ctas.value.map((c, idx) => (idx === i ? { ...c, [key]: value } : c))
}
</script>

<template>
  <div class="space-y-4">
    <UiField v-model="title" label="Title" required />
    <UiField v-model="subtitle" label="Subtitle" hint="Optional. One or two sentences." />

    <AdminMediaPicker v-model="imageMediaId" label="Background image" />
    <p class="text-xs leading-relaxed text-ink-muted">
      A dark overlay is applied automatically so the text stays readable on any photo.
    </p>

    <div>
      <p class="mb-1.5 text-sm font-semibold text-ink">Buttons</p>
      <div v-for="(cta, i) in ctas" :key="i" class="mb-2 flex gap-2">
        <input
          :value="cta.label"
          placeholder="Label"
          aria-label="Button label"
          class="w-1/3 rounded-card border border-hairline px-3 py-2 text-sm"
          @input="updateCta(i, 'label', ($event.target as HTMLInputElement).value)"
        />
        <input
          :value="cta.href"
          placeholder="/admissions"
          aria-label="Button link"
          class="flex-1 rounded-card border border-hairline px-3 py-2 text-sm"
          @input="updateCta(i, 'href', ($event.target as HTMLInputElement).value)"
        />
        <UiButton variant="ghost" @click="removeCta(i)">Remove</UiButton>
      </div>
      <!-- Two is the cap in the schema: a hero with three competing calls to
           action has no call to action. -->
      <UiButton v-if="(ctas?.length ?? 0) < 2" variant="secondary" @click="addCta">
        Add a button
      </UiButton>
    </div>
  </div>
</template>
