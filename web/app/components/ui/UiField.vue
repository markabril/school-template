<script setup lang="ts">
const props = defineProps<{
  label: string
  hint?: string
  error?: string
  required?: boolean
}>()

const model = defineModel<string>({ required: true })

const attrs = useAttrs()
const id = `f-${useId()}`
const describedBy = computed(() =>
  [props.error ? `${id}-err` : null, props.hint ? `${id}-hint` : null].filter(Boolean).join(' '),
)
</script>

<script lang="ts">
// Attributes land on the input, not the wrapper div.
export default { inheritAttrs: false }
</script>

<template>
  <div>
    <label :for="id" class="block text-sm font-semibold text-ink">
      {{ label }}
      <span v-if="required" class="text-maroon" aria-hidden="true">*</span>
    </label>

    <input
      :id="id"
      v-model="model"
      v-bind="attrs"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy || undefined"
      class="mt-1.5 w-full rounded-card border bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink-muted/60"
      :class="error ? 'border-maroon' : 'border-hairline'"
    />

    <!-- Hint sits below the input so a screen reader hears the label first. -->
    <p v-if="hint && !error" :id="`${id}-hint`" class="mt-1.5 text-xs text-ink-muted">
      {{ hint }}
    </p>
    <p v-if="error" :id="`${id}-err`" class="mt-1.5 text-xs font-medium text-maroon">
      {{ error }}
    </p>
  </div>
</template>
