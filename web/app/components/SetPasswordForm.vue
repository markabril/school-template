<script setup lang="ts">
/**
 * Shared by invite acceptance and password reset. The two flows differ only in
 * wording and endpoint — duplicating the form would mean fixing every password
 * rule twice and eventually getting them out of step.
 */
const props = defineProps<{
  token: string
  endpoint: '/api/auth/accept-invite' | '/api/auth/reset-password'
  heading: string
  submitLabel: string
}>()

const password = ref('')
const confirm = ref('')
const error = ref('')
const pending = ref(false)
const done = ref(false)

const tooShort = computed(() => password.value.length > 0 && password.value.length < 12)
const mismatch = computed(() => confirm.value.length > 0 && confirm.value !== password.value)

async function submit() {
  error.value = ''
  if (password.value.length < 12) {
    error.value = 'Use at least 12 characters.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'The two passwords do not match.'
    return
  }

  pending.value = true
  try {
    await $fetch(props.endpoint, {
      method: 'POST',
      body: { token: props.token, password: password.value },
    })
    done.value = true
  } catch (err) {
    error.value = apiErrorMessage(err, 'That did not work. The link may have expired.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-cream px-5 py-12">
    <div class="w-full max-w-sm">
      <div class="text-center">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink">Since 1990</p>
        <h1 class="mt-2 font-display text-2xl font-semibold text-maroon">
          {{ done ? 'All set' : heading }}
        </h1>
      </div>

      <div v-if="done" class="mt-7 rounded-card border border-hairline bg-white p-6 text-center">
        <p class="text-sm leading-relaxed text-ink-muted">
          Your password has been saved. You can now sign in.
        </p>
        <div class="mt-5">
          <NuxtLink to="/admin/login">
            <UiButton block>Go to sign in</UiButton>
          </NuxtLink>
        </div>
      </div>

      <form
        v-else
        class="mt-7 space-y-4 rounded-card border border-hairline bg-white p-6"
        @submit.prevent="submit"
      >
        <UiAlert v-if="error" tone="error">{{ error }}</UiAlert>

        <UiField
          v-model="password"
          label="New password"
          type="password"
          autocomplete="new-password"
          required
          autofocus
          hint="At least 12 characters. A short phrase is easier to remember and harder to guess."
          :error="tooShort ? 'At least 12 characters.' : undefined"
        />
        <UiField
          v-model="confirm"
          label="Confirm password"
          type="password"
          autocomplete="new-password"
          required
          :error="mismatch ? 'The two passwords do not match.' : undefined"
        />

        <UiButton type="submit" block :loading="pending">{{ submitLabel }}</UiButton>
      </form>
    </div>
  </div>
</template>
