import { db, closeDb } from './client.js'
import { siteSettings, pages, pageBlocks, navigation } from './schema/index.js'
import { logger } from '../lib/logger.js'
import { newId } from '../lib/ids.js'

/**
 * Development seed: enough real structure to build the public site against.
 *
 * No users are seeded — auth is Phase 1, and seeding a password would mean
 * committing a hashing decision before the auth module exists. Content here is
 * placeholder copy, deliberately obvious, so nothing gets mistaken for the
 * school's real words during content loading.
 */

const SETTINGS: Record<string, unknown> = {
  'site.name': 'Cherished Moments School',
  'site.tagline': 'I Think. I Lead. I Care.',
  'site.foundedYear': 1990,
  'site.description':
    'Cherished Moments School — placeholder description, replaced during content loading.',
  'contact.email': 'placeholder@example.com',
  'contact.phone': '',
  'contact.address': '',
  'social.facebook': '',
}

async function seed() {
  const existing = await db.select().from(siteSettings).limit(1)
  if (existing.length > 0) {
    logger.warn('database already seeded — skipping. Use `npm run db:reset` to start clean.')
    return
  }

  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.insert(siteSettings).values({ key, value })
  }

  const homeId = newId()
  const aboutId = newId()
  const now = new Date()

  await db.insert(pages).values([
    { id: homeId, slug: 'home', title: 'Home', status: 'published', publishedAt: now },
    { id: aboutId, slug: 'about', title: 'About Us', status: 'draft' },
  ])

  // Only the three block types Phase 2 builds first. The rest of the registry
  // is added once these are proven end-to-end (docs/release-1.md §9).
  await db.insert(pageBlocks).values([
    {
      pageId: homeId,
      seq: 0,
      type: 'hero',
      data: {
        title: 'Every child’s potential, cherished and grown.',
        subtitle: 'Placeholder hero copy — replaced during content loading.',
        ctas: [{ label: 'Admissions', href: '/admissions' }],
      },
    },
    {
      pageId: homeId,
      seq: 1,
      type: 'richText',
      data: { doc: { type: 'doc', content: [] } },
    },
    {
      pageId: aboutId,
      seq: 0,
      type: 'richText',
      data: { doc: { type: 'doc', content: [] } },
    },
  ])

  await db.insert(navigation).values([
    { location: 'header', label: 'About', pageId: aboutId, seq: 0 },
    { location: 'header', label: 'Academics', url: '/academics', seq: 1 },
    { location: 'header', label: 'Admissions', url: '/admissions', seq: 2 },
    { location: 'header', label: 'News', url: '/news', seq: 3 },
    { location: 'header', label: 'Contact', url: '/contact', seq: 4 },
    { location: 'footer', label: 'Privacy Policy', url: '/privacy', seq: 0 },
  ])

  logger.info('seed complete')
}

seed()
  .catch((err) => {
    logger.error({ err }, 'seed failed')
    process.exitCode = 1
  })
  .finally(closeDb)
