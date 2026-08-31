interface SitemapUrl {
  loc: string
  lastmod: string | null
  changefreq: string
  priority: number
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Built from live content on every request, then cached for an hour.
 *
 * Not prerendered: a sitemap frozen at build time lists pages that have since
 * been unpublished and omits everything added since, which is worse than no
 * sitemap at all.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const site = config.public.siteUrl.replace(/\/$/, '')

  const { urls } = await $fetch<{ urls: SitemapUrl[] }>(`${config.apiBase}/content/sitemap`)

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${escapeXml(site + u.loc)}</loc>` +
      (u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '') +
      `\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority.toFixed(1)}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return body
})
