import type { SiteSettings } from '@cms/shared'

/**
 * Canonical URL for the current route.
 *
 * One canonical host, no query string. Without this a page reachable at both
 * `/about` and `/about?utm_source=fb` looks like two pages with identical
 * content, and search engines pick which to keep — sometimes the one with the
 * tracking parameter attached.
 */
export function useCanonical() {
  const route = useRoute()
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const url = computed(() => `${site}${route.path === '/' ? '' : route.path}`)

  useHead({
    link: [{ rel: 'canonical', href: url }],
  })

  return url
}

/** Serialise JSON-LD safely into a script tag. */
function ld(data: Record<string, unknown>) {
  useHead({
    script: [
      {
        type: 'application/ld+json',
        // `</script>` inside a JSON string would close the tag early and turn
        // the rest of the payload into markup.
        innerHTML: JSON.stringify(data).replace(/</g, '\\u003c'),
      },
    ],
  })
}

/** Organisation schema for the homepage. Drives rich results for the school. */
export function useSchoolSchema(settings: Ref<SiteSettings | undefined>) {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')

  watchEffect(() => {
    const s = settings.value
    if (!s) return

    ld({
      '@context': 'https://schema.org',
      '@type': 'School',
      name: s['site.name'],
      url: site,
      ...(s['site.description'] ? { description: s['site.description'] } : {}),
      ...(s['site.foundedYear'] ? { foundingDate: String(s['site.foundedYear']) } : {}),
      ...(s['contact.email'] ? { email: s['contact.email'] } : {}),
      ...(s['contact.phone'] ? { telephone: s['contact.phone'] } : {}),
      ...(s['contact.address']
        ? { address: { '@type': 'PostalAddress', streetAddress: s['contact.address'] } }
        : {}),
      ...(s['social.facebook'] ? { sameAs: [s['social.facebook']] } : {}),
    })
  })
}

export function useArticleSchema(post: {
  title: string
  excerpt?: string | null
  publishedAt: string
  coverUrl?: string
  slug: string
}) {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  ld({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    datePublished: post.publishedAt,
    ...(post.coverUrl ? { image: `${site}${post.coverUrl}` } : {}),
    mainEntityOfPage: `${site}/news/${post.slug}`,
  })
}

export function useEventListSchema(
  events: Array<{ title: string; startsAt: string; endsAt: string | null; location: string | null }>,
) {
  if (events.length === 0) return
  ld({
    '@context': 'https://schema.org',
    '@graph': events.map((e) => ({
      '@type': 'Event',
      name: e.title,
      startDate: e.startsAt,
      ...(e.endsAt ? { endDate: e.endsAt } : {}),
      ...(e.location ? { location: { '@type': 'Place', name: e.location } } : {}),
      eventStatus: 'https://schema.org/EventScheduled',
    })),
  })
}
