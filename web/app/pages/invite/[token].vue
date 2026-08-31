<script setup lang="ts">
definePageMeta({ layout: false })

const token = useRoute().params.token as string

useHead({
  title: 'Set up your account — Cherished Moments School',
  // Invite links must never be indexed if one leaks into a referrer or a
  // pasted URL somewhere public.
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<template>
  <SetPasswordForm
    :token="token"
    endpoint="/api/auth/accept-invite"
    heading="Set up your account"
    submit-label="Save password"
  />
</template>
