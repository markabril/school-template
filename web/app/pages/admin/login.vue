<script setup lang="ts">
definePageMeta({ layout: false })

const { login, ensureLoaded } = useAuth()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

// Already signed in? Skip the form.
onMounted(async () => {
  if (await ensureLoaded()) await go()
})

function go() {
  const next = route.query.next
  return navigateTo(typeof next === 'string' && next.startsWith('/admin') ? next : '/admin')
}

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await login(email.value, password.value)
    await go()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not sign in. Please try again.')
  } finally {
    pending.value = false
  }
}

useHead({ title: 'Sign in — Cherished Moments School' })
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-cream px-5 py-12">
    <div class="w-full max-w-sm">
      <div class="text-center">
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink">Since 1990</p>
        <h1 class="mt-2 font-display text-2xl font-semibold text-maroon">
          Cherished Moments School
        </h1>
        <p class="mt-1 text-sm text-ink-muted">Content management</p>
      </div>

      <form
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
        <UiField
          v-model="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          required
        />

        <UiButton type="submit" block :loading="pending">Sign in</UiButton>

        <p class="pt-1 text-center text-sm">
          <NuxtLink to="/forgot-password" class="text-gold-ink underline underline-offset-2">
            Forgot your password?
          </NuxtLink>
        </p>
      </form>

      <!--
        No "create an account" link, deliberately: accounts are provisioned by
        an administrator and there is no public signup anywhere in this system.
      -->
      <p class="mt-5 text-center text-xs leading-relaxed text-ink-muted">
        Accounts are created by the school office. Contact them if you need access.
      </p>
    </div>
  </div>
</template>
