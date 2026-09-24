<script setup lang="ts">
import { SETTING_FIELDS, type SiteSettings } from '@cms/shared'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Settings — CMS' })

const form = ref<Record<string, string>>({})
const error = ref('')
const notice = ref('')
const pending = ref(false)

const groups = ['Site', 'Contact', 'Social'] as const

onMounted(async () => {
  try {
    const res = await $fetch<{ settings: SiteSettings }>('/api/site/settings', {
      credentials: 'include',
    })
    // Everything renders as a text input, so coerce here rather than juggling
    // types through the form.
    form.value = Object.fromEntries(Object.entries(res.settings).map(([k, v]) => [k, String(v)]))
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load settings.')
  }
})

async function save() {
  error.value = ''
  notice.value = ''
  pending.value = true
  try {
    const res = await $fetch<{ settings: SiteSettings }>('/api/site/settings', {
      method: 'PUT',
      body: form.value,
      credentials: 'include',
    })
    form.value = Object.fromEntries(Object.entries(res.settings).map(([k, v]) => [k, String(v)]))
    notice.value = 'Saved. The whole site has been refreshed.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">Settings</h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      Details that appear across the whole website.
    </p>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <form class="mt-6 space-y-6" @submit.prevent="save">
      <fieldset
        v-for="group in groups"
        :key="group"
        class="rounded-card border border-hairline bg-white p-5"
      >
        <legend class="px-1 text-sm font-bold uppercase tracking-wider text-ink-muted">
          {{ group }}
        </legend>

        <div class="mt-3 space-y-4">
          <template v-for="f in SETTING_FIELDS.filter((x) => x.group === group)" :key="f.key">
            <div v-if="f.type === 'media'">
              <AdminMediaPicker :model-value="form[f.key] || null" :label="f.label" @update:model-value="form[f.key] = $event ?? ''" />
              <p v-if="f.hint" class="mt-1.5 text-xs text-ink-muted">{{ f.hint }}</p>
            </div>
            <div v-else-if="f.multiline">
              <label :for="f.key" class="block text-sm font-semibold text-ink">{{ f.label }}</label>
              <textarea
                :id="f.key"
                v-model="form[f.key]"
                rows="3"
                class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
              />
              <p v-if="f.hint" class="mt-1.5 text-xs text-ink-muted">{{ f.hint }}</p>
            </div>
            <!-- `form` is keyed dynamically, so TypeScript cannot prove the
                 entry exists yet; the fallback keeps the model non-nullable. -->
            <UiField
              v-else
              :model-value="form[f.key] ?? ''"
              :label="f.label"
              :hint="f.hint"
              @update:model-value="form[f.key] = $event"
            />
          </template>
        </div>
      </fieldset>

      <UiButton type="submit" :loading="pending">Save settings</UiButton>
    </form>
  </div>
</template>
