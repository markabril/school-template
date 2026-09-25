import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/revalidate.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/revalidate.js')>()),
  revalidate: vi.fn(),
}))

import { db } from '../src/db/client.js'
import { pageBlocks, pages } from '../src/db/schema/index.js'
import { pathsForBlockTypes } from '../src/lib/purge.js'
import { revalidate } from '../src/lib/revalidate.js'
import * as posts from '../src/modules/posts/posts.service.js'
import { upsertStaff } from '../src/modules/site/site.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

async function pageWith(slug: string, status: 'draft' | 'published', types: string[]) {
  const p = await db
    .insert(pages)
    .values({ slug, title: slug, status, publishedAt: status === 'published' ? new Date() : null })
    .returning()
    .then((r) => r[0]!)
  for (const [seq, type] of types.entries()) {
    await db.insert(pageBlocks).values({ pageId: p.id, seq, type, data: {} })
  }
  return p
}

describe('pathsForBlockTypes', () => {
  beforeEach(truncateAll)

  it('returns published pages containing the given block types, home as /', async () => {
    await pageWith('home', 'published', ['hero', 'newsTeaser'])
    await pageWith('community', 'published', ['storiesColumns'])
    await pageWith('draft-news', 'draft', ['newsTeaser'])
    await pageWith('about', 'published', ['richText'])

    const paths = await pathsForBlockTypes(['newsTeaser', 'storiesColumns'])

    expect(paths.sort()).toEqual(['/', '/community'])
  })

  it('returns nothing for an empty type list', async () => {
    await pageWith('home', 'published', ['newsTeaser'])
    expect(await pathsForBlockTypes([])).toEqual([])
  })
})

describe('purge wiring', () => {
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    vi.mocked(revalidate).mockClear()
    actor = actorOf(await makeAdmin())
  })

  it('publishing a post purges pages holding news blocks', async () => {
    await pageWith('parents', 'published', ['storiesColumns'])
    const post = await posts.create({ title: 'Hello', slug: 'hello' }, actor)

    await posts.setStatus(post.id, 'published', null, actor)

    const purged = vi.mocked(revalidate).mock.calls.flatMap((c) => c[0])
    expect(purged).toEqual(expect.arrayContaining(['/news/hello', '/news', '/parents']))
  })

  it('saving staff purges /staff and pages holding a staff grid, not everything', async () => {
    await pageWith('team', 'published', ['staffGrid'])

    await upsertStaff({ name: 'A Teacher', isPublished: true }, actor)

    const purged = vi.mocked(revalidate).mock.calls.flatMap((c) => c[0])
    expect(purged).toEqual(expect.arrayContaining(['/staff', '/team']))
    expect(purged).not.toContain('/**')
  })
})
