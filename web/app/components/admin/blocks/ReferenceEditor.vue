<script setup lang="ts">
/**
 * Shared editor for all four reference blocks.
 *
 * They differ only in which filter they offer, so four near-identical
 * components would be four places to fix the same wording later. The block
 * registry still treats them as distinct types — this is a UI detail.
 */
const props = defineProps<{
  filter?: 'category' | 'department' | 'none'
  showLimit?: boolean
  /** Options for the filter dropdown, discovered from existing content. */
  options?: string[]
  /** Layout choices; omitted for blocks with a single layout. */
  layouts?: Array<{ value: string; label: string; hint: string }>
  note: string
}>()

const model = defineModel<Record<string, unknown>>({ required: true })

function field<T>(key: string) {
  return computed({
    get: () => model.value[key] as T,
    set: (v: T) => (model.value = { ...model.value, [key]: v }),
  })
}

const heading = field<string>('heading')
const limit = field<number>('limit')
const layout = field<string>('layout')
const filterKey = computed(() => (props.filter === 'department' ? 'department' : 'category'))
const filterValue = computed({
  get: () => (model.value[filterKey.value] as string | null) ?? '',
  set: (v: string) => (model.value = { ...model.value, [filterKey.value]: v || null }),
})
</script>

<template>
  <div class="space-y-4">
    <UiField v-model="heading" label="Heading" hint="Leave empty for no heading." />

    <fieldset v-if="layouts?.length">
      <legend class="mb-1.5 text-sm font-semibold text-ink">Layout</legend>
      <div class="space-y-2">
        <label v-for="l in layouts" :key="l.value" class="flex items-start gap-2 text-sm">
          <input v-model="layout" type="radio" :value="l.value" class="mt-1 accent-maroon" />
          <span>
            <span class="font-medium text-ink">{{ l.label }}</span>
            <span class="block text-xs text-ink-muted">{{ l.hint }}</span>
          </span>
        </label>
      </div>
    </fieldset>

    <div v-if="showLimit">
      <label for="limit" class="block text-sm font-semibold text-ink">How many to show</label>
      <input
        id="limit"
        v-model.number="limit"
        type="number"
        min="1"
        max="9"
        class="mt-1.5 w-24 rounded-card border border-hairline px-3 py-2.5 text-base"
      />
    </div>

    <div v-if="filter && filter !== 'none'">
      <label :for="filterKey" class="block text-sm font-semibold text-ink">
        {{ filter === 'department' ? 'Department' : 'Category' }}
      </label>
      <input
        :id="filterKey"
        v-model="filterValue"
        list="ref-options"
        :placeholder="`All ${filter === 'department' ? 'departments' : 'categories'}`"
        class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
      />
      <datalist id="ref-options">
        <option v-for="o in options ?? []" :key="o" :value="o" />
      </datalist>
      <p class="mt-1.5 text-xs text-ink-muted">Leave empty to show everything.</p>
    </div>

    <p class="rounded-card bg-gold-tint/60 px-3 py-2.5 text-xs leading-relaxed text-gold-ink">
      {{ note }}
    </p>
  </div>
</template>
