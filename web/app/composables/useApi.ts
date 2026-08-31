import type { UseFetchOptions } from '#app'

/**
 * Every call to the Express API goes through here.
 *
 * The base URL differs by where the code is running, and getting this wrong is
 * the classic Nuxt-plus-separate-API bug:
 *
 *  - On the SERVER, a relative '/api/...' resolves against Nitro itself, which
 *    knows nothing about Express. The dev proxy only rewrites browser traffic.
 *    So server-side calls use the absolute origin from runtimeConfig.
 *  - In the BROWSER, '/api' is correct and deliberate: the dev proxy (and the
 *    reverse proxy in production) maps it to Express, so the page only ever
 *    talks to its own origin. No CORS, no cross-site cookie rules.
 *
 * `useRuntimeConfig()` is called synchronously during setup — not inside a URL
 * getter, where it would run outside the Nuxt instance context.
 *
 * Note there is no cookie forwarding here, and there should not be: every
 * SSR-rendered route is public and anonymous. Authenticated surfaces (/admin,
 * and /portal in Release 2) run with `ssr: false` precisely so this stays true.
 * If you ever find yourself wanting to forward a session cookie through SSR,
 * the route is probably in the wrong rendering mode.
 */

/** `path` is relative to the API root, e.g. '/health' or '/pages/about'. */
export function useApi<T>(path: string, opts: UseFetchOptions<T> = {}) {
  const base = import.meta.server ? useRuntimeConfig().apiBase : '/api'
  const merged = {
    // Explicit key: server and client build different absolute URLs, so
    // without it the payload key differs and every request refetches on
    // hydration — doubling API load and flashing the UI.
    key: `api:${path}`,
    ...opts,
  }

  // The cast is confined to this one line on purpose. useFetch's options type
  // threads six generics including `T extends void ? unknown : T`, which
  // TypeScript will not simplify for an unconstrained T — so no honest
  // annotation satisfies it. Callers are unaffected: the `useFetch<T>` return
  // type is preserved, so `data` is still fully typed at every call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useFetch<T>(`${base}${path}`, merged as any)
}

/** Imperative variant for event handlers. Client-side only by design. */
export function $api<T>(path: string, opts?: Parameters<typeof $fetch>[1]): Promise<T> {
  return $fetch<T>(`/api${path}`, opts) as Promise<T>
}
