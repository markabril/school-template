import { beforeEach, describe, expect, it } from 'vitest'
import * as posts from '../src/modules/posts/posts.service.js'
import { resolveReferences } from '../src/modules/pages/references.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

const DAY = 86_400_000

describe('storiesColumns resolution', () => {
  let actor: { id: string; ip: string }

  async function publish(slug: string, category: string, daysAgo: number) {
    const post = await posts.create({ title: slug, slug }, actor)
    await posts.update(post.id, { category }, actor)
    await posts.setStatus(post.id, 'published', new Date(Date.now() - daysAgo * DAY), actor)
  }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
    await publish('a-1', 'A', 1)
    await publish('a-2', 'A', 2)
    await publish('a-3', 'A', 3)
    await publish('b-1', 'B', 1)
  })

  it('returns each column’s posts, limited, in column order', async () => {
    const refs = await resolveReferences([
      {
        id: 'block-1',
        type: 'storiesColumns',
        data: {
          columns: [
            { title: 'Column B', category: 'B', limit: 3 },
            { title: 'Column A', category: 'A', limit: 2 },
          ],
        },
      },
    ])

    const columns = refs['block-1'] as Array<{ title: string; category: string; posts: Array<{ slug: string }> }>

    expect(columns.map((c) => c.title)).toEqual(['Column B', 'Column A'])
    expect(columns[0]!.posts.map((p) => p.slug)).toEqual(['b-1'])
    expect(columns[1]!.posts.map((p) => p.slug)).toEqual(['a-1', 'a-2'])
  })

  it('returns an empty post list for a category with no articles', async () => {
    const refs = await resolveReferences([
      { id: 'block-2', type: 'storiesColumns', data: { columns: [{ title: 'Empty', category: 'Nope', limit: 3 }] } },
    ])

    expect(refs['block-2']).toEqual([{ title: 'Empty', category: 'Nope', posts: [] }])
  })
})
