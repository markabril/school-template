<script setup lang="ts">
interface Column {
  title: string
  category: string
  limit: number
}

const model = defineModel<Record<string, unknown>>({ required: true })

// Categories that already have articles. Picking from this list (rather than
// typing) means a typo cannot create a column that stays empty forever.
const categories = ref<string[]>([])
onMounted(async () => {
  try {
    categories.value = (await $fetch<{ categories: string[] }>('/api/content/posts/categories')).categories
  } catch {
    categories.value = []
  }
})

const heading = computed({
  get: () => (model.value.heading as string | undefined) ?? '',
  set: (v: string) => (model.value = { ...model.value, heading: v }),
})

const columns = computed<Column[]>(() => (model.value.columns as Column[] | undefined) ?? [])

function setColumns(next: Column[]) {
  model.value = { ...model.value, columns: next }
}

function update(i: number, patch: Partial<Column>) {
  setColumns(columns.value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
}

function add() {
  if (columns.value.length < 3) setColumns([...columns.value, { title: '', category: '', limit: 3 }])
}

function remove(i: number) {
  setColumns(columns.value.filter((_, idx) => idx !== i))
}

function move(i: number, delta: number) {
  const j = i + delta
  if (j < 0 || j >= columns.value.length) return
  const next = [...columns.value]
  const [col] = next.splice(i, 1)
  next.splice(j, 0, col!)
  setColumns(next)
}

/** Keep a stored category selectable even if no article uses it any more. */
const optionsFor = (current: string) =>
  current && !categories.value.includes(current) ? [current, ...categories.value] : categories.value
</script>

<template>
  <div class="space-y-5">
    <UiField v-model="heading" label="Heading" hint="Optional. Leave empty and each column title acts as the heading." />

    <div v-for="(col, i) in columns" :key="i" class="rounded-card border border-hairline p-4">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-maroon">Column {{ i + 1 }}</p>
        <div class="flex gap-1">
          <UiButton variant="ghost" :disabled="i === 0" title="Move left" @click="move(i, -1)">←</UiButton>
          <UiButton variant="ghost" :disabled="i === columns.length - 1" title="Move right" @click="move(i, 1)">→</UiButton>
          <UiButton variant="ghost" :disabled="columns.length === 1" @click="remove(i)">Remove</UiButton>
        </div>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <UiField
          :model-value="col.title"
          label="Title"
          required
          @update:model-value="update(i, { title: $event })"
        />
        <div>
          <label :for="`col-cat-${i}`" class="block text-sm font-semibold text-ink">Category</label>
          <select
            :id="`col-cat-${i}`"
            :value="col.category"
            class="mt-1.5 w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-base"
            @change="update(i, { category: ($event.target as HTMLSelectElement).value })"
          >
            <option value="" disabled>Choose…</option>
            <option v-for="c in optionsFor(col.category)" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label :for="`col-limit-${i}`" class="block text-sm font-semibold text-ink">Show</label>
          <input
            :id="`col-limit-${i}`"
            :value="col.limit"
            type="number"
            min="1"
            max="5"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
            @input="update(i, { limit: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
      </div>
    </div>

    <p v-if="!categories.length" class="text-xs text-ink-muted">
      No news categories exist yet. Give some articles a category first.
    </p>

    <UiButton v-if="columns.length < 3" variant="secondary" @click="add">Add a column</UiButton>
  </div>
</template>
