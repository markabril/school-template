<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const pending = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: { email: email.value } })
  } catch (err) {
    // Only surface genuine failures such as rate limiting. A non-existent
    // address returns 204 from the API by design.
    error.value = apiErrorMessage(err, 'Could not send the email. Please try again shortly.')
    pending.value = false
    return
  }
  sent.value = true
  pending.value = false
}

useHead({ title: 'Forgot your password — Cherished Moments School' })
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-cream px-5 py-12">
    <div class="w-full max-w-sm">
      <div class="text-center">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink">Since 1990</p>
        <h1 class="mt-2 font-display text-2xl font-semibold text-maroon">Forgot your password</h1>
      </div>

      <!--
        The confirmation never says whether the address exists — a reset form
        that does is an account-enumeration endpoint with a friendly label.
      -->
      <div v-if="sent" class="mt-7 rounded-card border border-hairline bg-white p-6">
        <p class="text-sm leading-relaxed text-ink-muted">
          If there is an account for <span class="font-medium text-ink">{{ email }}</span
          >, a reset link is on its way. It expires in one hour.
        </p>
        <p class="mt-3 text-xs leading-relaxed text-ink-muted">
          Check your spam folder if it does not arrive within a few minutes.
        </p>
        <div class="mt-5">
          <NuxtLink to="/admin/login">
            <UiButton variant="secondary" block>Back to sign in</UiButton>
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
          v-model="email"
          label="Email"
          type="email"
          autocomplete="username"
          required
          autofocus
        />
        <UiButton type="submit" block :loading="pending">Send reset link</UiButton>
        <p class="pt-1 text-center text-sm">
          <NuxtLink to="/admin/login" class="text-gold-ink underline underline-offset-2">
            Back to sign in
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
