import type { Role } from '@cms/shared'

export interface AuthUser {
  id: string
  email: string
  role: Role
  displayName: string
}

/**
 * Client-side auth state for /admin.
 *
 * /admin runs with `ssr: false`, so this is genuinely client-only — there is no
 * server render to hydrate and no session cookie to forward through SSR. The
 * cookie is httpOnly, so JavaScript can never read it; `/auth/me` is the only
 * way to find out who we are, and the server stays the sole authority.
 *
 * Nothing here is a security boundary. Hiding a nav link is courtesy; the API
 * refusing the request is the actual rule.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const ready = useState<boolean>('auth:ready', () => false)

  async function refresh(): Promise<AuthUser | null> {
    try {
      const res = await $fetch<{ user: AuthUser | null }>('/api/auth/me', {
        credentials: 'include',
      })
      user.value = res.user
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
    return user.value
  }

  /** Resolve once, then reuse. Called by route middleware on every navigation. */
  async function ensureLoaded(): Promise<AuthUser | null> {
    if (ready.value) return user.value
    return refresh()
  }

  async function login(email: string, password: string): Promise<void> {
    const res = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      credentials: 'include',
    })
    user.value = res.user
    ready.value = true
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      user.value = null
      await navigateTo('/admin/login')
    }
  }

  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')

  return { user, ready, refresh, ensureLoaded, login, logout, isSuperAdmin }
}

/** Pull a readable message out of an API error envelope. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data
  return data?.error?.message ?? fallback
}
