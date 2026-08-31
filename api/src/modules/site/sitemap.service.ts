import { and, eq, lte } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { pages, posts, events } from '../../db/schema/index.js'

export interface SitemapUrl {
  loc: string
  lastmod: string | null
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
}

/**
 * Every publicly reachable URL, built from what is actually live.
 *
 * Derived rather than hand-maintained: a sitemap listing a page that 404s, or
 * omitting one that exists, is worse than none — it teaches search engines to
 * distrust the file. Draft and future-dated content is excluded by the same
 * `status AND published_at` rule the public endpoints use.
 */
export async function buildSitemap(): Promise<SitemapUrl[]> {
  const now = new Date()
  const iso = (d: Date | null) => (d ? d.toISOString() : null)

  const livePages = await db
    .select({ slug: pages.slug, updatedAt: pages.updatedAt })
    .from(pages)
    .where(and(eq(pages.status, 'published'), lte(pages.publishedAt, now)))

  const livePosts = await db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(eq(posts.status, 'published'), lte(posts.publishedAt, now)))

  const liveEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.status, 'published'), lte(events.publishedAt, now)))
    .limit(1)

  const urls: SitemapUrl[] = []

  for (const p of livePages) {
    urls.push({
      loc: p.slug === 'home' ? '/' : `/${p.slug}`,
      lastmod: iso(p.updatedAt),
      changefreq: 'monthly',
      // The homepage is the entry point; other pages are equal to each other.
      priority: p.slug === 'home' ? 1.0 : 0.7,
    })
  }

  // Index pages exist as routes, not as CMS rows, so they are added explicitly.
  urls.push({ loc: '/news', lastmod: iso(livePosts[0]?.updatedAt ?? null), changefreq: 'weekly', priority: 0.8 })
  if (liveEvents.length) {
    urls.push({ loc: '/events', lastmod: iso(now), changefreq: 'weekly', priority: 0.6 })
  }
  urls.push({ loc: '/staff', lastmod: null, changefreq: 'monthly', priority: 0.5 })
  urls.push({ loc: '/downloads', lastmod: null, changefreq: 'monthly', priority: 0.5 })
  urls.push({ loc: '/contact', lastmod: null, changefreq: 'yearly', priority: 0.6 })

  for (const p of livePosts) {
    urls.push({
      loc: `/news/${p.slug}`,
      lastmod: iso(p.updatedAt),
      // An article is finished when published; it does not keep changing.
      changefreq: 'yearly',
      priority: 0.6,
    })
  }

  return urls
}
