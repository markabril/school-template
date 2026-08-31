import { env } from '../env.js'
import { logger } from '../lib/logger.js'

/**
 * Ask Nuxt to drop cached renders for specific paths.
 *
 * Public pages are SWR-cached in Nitro; the CMS is a separate Express process.
 * Publishing has to reach across that boundary or editors publish, see no
 * change, publish again, and then call you.
 *
 * Deliberately fire-and-forget: a purge failure must not fail the publish. The
 * content IS published; the cache is at worst stale until its TTL. Failing the
 * request would be strictly worse — the editor would retry and republish.
 */
export function revalidate(paths: string[]): void {
  if (paths.length === 0) return

  const unique = [...new Set(paths)]

  void fetch(env.REVALIDATE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-revalidate-secret': env.REVALIDATE_SECRET,
    },
    body: JSON.stringify({ paths: unique }),
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => {
      if (res.ok) {
        logger.info({ paths: unique }, 'revalidated')
        return
      }
      // 404 is the guard's deliberate response to a bad secret — it refuses to
      // confirm the endpoint exists. Name the likely cause, because the failure
      // is otherwise invisible: publishing succeeds, the cache keeps serving
      // the old page, and nothing anywhere says why.
      logger.warn(
        { status: res.status, paths: unique },
        res.status === 404
          ? 'revalidate refused — REVALIDATE_SECRET in api/.env probably does not match NUXT_REVALIDATE_SECRET in web/.env. Published pages will serve stale until their TTL expires.'
          : 'revalidate rejected',
      )
    })
    .catch((err) => {
      // In development the Nuxt process may simply not be running.
      logger.warn({ err: String(err), paths: unique }, 'revalidate failed')
    })
}

/**
 * Paths to purge when a page changes.
 *
 * Navigation and site settings appear in the header and footer of every page,
 * so those changes purge everything. Getting this scope wrong is the most
 * likely cause of "I published it but the site still shows the old version".
 */
export function pathsForPage(slug: string): string[] {
  return slug === 'home' ? ['/'] : [`/${slug}`]
}

export const PURGE_EVERYTHING = ['/**']
