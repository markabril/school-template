/**
 * Cache purge hook. Called by Express when content is published.
 *
 * Not a public endpoint despite living on the public origin: it is guarded by a
 * shared secret and, in production, must also be blocked at the reverse proxy
 * so it is only reachable from localhost. Anyone able to call this can flush
 * the cache repeatedly and turn every request into an origin render.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const provided = getHeader(event, 'x-revalidate-secret')

  if (!config.revalidateSecret || provided !== config.revalidateSecret) {
    // 404 rather than 401: an unauthenticated caller should not learn that
    // this endpoint exists at all.
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const body = await readBody<{ paths?: string[] }>(event)
  const paths = Array.isArray(body?.paths) ? body.paths : []
  if (paths.length === 0) return { purged: 0 }

  const storage = useStorage('cache')
  let purged = 0

  for (const path of paths) {
    if (path === '/**') {
      // Nav or site settings changed: header and footer are on every page, so
      // nothing cached is still correct.
      const keys = await storage.getKeys('nitro:routes')
      await Promise.all(keys.map((k) => storage.removeItem(k)))
      purged += keys.length
      continue
    }

    // Nitro keys route cache entries by a colon-separated form of the path.
    const normalised = path === '/' ? 'index' : path.replace(/^\/+|\/+$/g, '').replace(/\//g, ':')
    const keys = await storage.getKeys('nitro:routes')
    const matches = keys.filter((k) => k.includes(normalised))
    await Promise.all(matches.map((k) => storage.removeItem(k)))
    purged += matches.length
  }

  return { purged }
})
