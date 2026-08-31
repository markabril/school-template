/**
 * Gate for /admin. Applied per-page via `definePageMeta({ middleware: 'admin' })`
 * rather than globally, so the login page and the public site are unaffected.
 *
 * This is a redirect, not a security control — it stops a signed-out person
 * seeing an empty broken shell. Every /admin API call is independently
 * authorised server-side, and must remain so.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { ensureLoaded } = useAuth()
  const user = await ensureLoaded()

  if (!user) {
    return navigateTo({
      path: '/admin/login',
      // Bring them back where they were headed after signing in.
      query: to.fullPath === '/admin' ? undefined : { next: to.fullPath },
    })
  }
})
