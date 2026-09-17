import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { pages } from '../src/db/schema/index.js'
import {
  exportNavigationTree,
  navigationInputSchema,
  publicNavigation,
  saveNavigation,
} from '../src/modules/site/site.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

async function page(slug: string, status: 'draft' | 'published') {
  return db
    .insert(pages)
    .values({ slug, title: slug, status, publishedAt: status === 'published' ? new Date() : null })
    .returning()
    .then((r) => r[0]!)
}

describe('navigation tree', () => {
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
  })

  it('round-trips a nested tree, preserving order at both levels', async () => {
    const history = await page('history', 'published')
    const items = [
      { location: 'header' as const, label: 'Home', url: '/' },
      {
        location: 'header' as const,
        label: 'About',
        children: [
          { label: 'History', pageId: history.id },
          { label: 'Staff', url: '/staff' },
        ],
      },
      { location: 'footer' as const, label: 'Contact', url: '/contact' },
    ]

    await saveNavigation(items, actor)
    const tree = await exportNavigationTree()

    expect(tree.map((t) => t.label)).toEqual(['Home', 'About', 'Contact'])
    expect(tree[1]!.children!.map((c) => c.label)).toEqual(['History', 'Staff'])
    expect(tree[1]!.children![0]!.pageId).toBe(history.id)
  })

  it('rejects a grandchild', () => {
    const result = navigationInputSchema.safeParse({
      items: [
        {
          location: 'header',
          label: 'About',
          children: [{ label: 'History', url: '/history', children: [{ label: 'Too deep', url: '/x' }] }],
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('exposes a parent with children as a non-link whose own link becomes the first child', async () => {
    const about = await page('about', 'published')
    await saveNavigation(
      [{ location: 'header', label: 'About', pageId: about.id, children: [{ label: 'Staff', url: '/staff' }] }],
      actor,
    )

    const { header } = await publicNavigation()

    expect(header[0]!.href).toBeNull()
    expect(header[0]!.children.map((c) => [c.label, c.href])).toEqual([
      ['About', '/about'],
      ['Staff', '/staff'],
    ])
  })

  it('hides draft pages, and drops a parent left with nothing to show', async () => {
    const draft = await page('draft-page', 'draft')
    await saveNavigation(
      [
        { location: 'header', label: 'Hidden parent', children: [{ label: 'Draft', pageId: draft.id }] },
        { location: 'header', label: 'Kept parent', children: [{ label: 'Draft', pageId: draft.id }, { label: 'News', url: '/news' }] },
      ],
      actor,
    )

    const { header } = await publicNavigation()

    expect(header.map((h) => h.label)).toEqual(['Kept parent'])
    expect(header[0]!.children.map((c) => c.label)).toEqual(['News'])
  })

  it('keeps a childless item as a plain link', async () => {
    await saveNavigation([{ location: 'footer', label: 'Contact', url: '/contact' }], actor)
    const { footer } = await publicNavigation()
    expect(footer[0]).toMatchObject({ label: 'Contact', href: '/contact', children: [] })
  })
})
