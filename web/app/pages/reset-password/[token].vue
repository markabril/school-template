<script setup lang="ts">
definePageMeta({ layout: false })

const token = useRoute().params.token as string

useHead({
  title: 'Reset your password — Cherished Moments School',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<template>
  <SetPasswordForm
    :token="token"
    endpoint="/api/auth/reset-password"
    heading="Choose a new password"
    submit-label="Save password"
  />
</template>
