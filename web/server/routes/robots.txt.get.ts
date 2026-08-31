export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const site = config.public.siteUrl.replace(/\/$/, '')

  /**
   * `/admin` and `/preview` are disallowed as a courtesy to crawlers, not as a
   * security measure — robots.txt is public and advisory. Both are protected
   * properly: /admin by session auth, /preview by a signed expiring token that
   * also sends X-Robots-Tag: noindex.
   *
   * On a non-production origin everything is disallowed, so a staging copy
   * cannot outrank the real school website.
   */
  const isProduction = site.startsWith('https://') && !site.includes('localhost')

  const body = isProduction
    ? `User-agent: *
Allow: /
Disallow: /admin
Disallow: /preview

Sitemap: ${site}/sitemap.xml
`
    : `# Non-production origin — indexing disabled.
User-agent: *
Disallow: /
`

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return body
})
