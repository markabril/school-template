import { beforeEach, describe, expect, it } from 'vitest'
import * as posts from '../src/modules/posts/posts.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

const DAY = 86_400_000

describe('posts', () => {
  let actor: { id: string; ip: string }

  async function publish(slug: string, category: string | null, daysAgo: number) {
    const post = await posts.create({ title: slug, slug }, actor)
    await posts.update(post.id, { category }, actor)
    await posts.setStatus(post.id, 'published', new Date(Date.now() - daysAgo * DAY), actor)
    return post
  }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
  })

  it('returns up to three related posts from the same category, newest first, excluding itself', async () => {
    await publish('main', 'Student Life', 1)
    await publish('sl-2', 'Student Life', 2)
    await publish('sl-3', 'Student Life', 3)
    await publish('sl-4', 'Student Life', 4)
    await publish('sl-5', 'Student Life', 5)
    await publish('other', 'Community', 1)
    const draft = await posts.create({ title: 'draft', slug: 'draft' }, actor)
    await posts.update(draft.id, { category: 'Student Life' }, actor)

    const result = await posts.getPublicBySlug('main')

    expect(result.related?.map((r) => r.slug)).toEqual(['sl-2', 'sl-3', 'sl-4'])
  })

  it('returns no related posts for an uncategorised article', async () => {
    await publish('lonely', null, 1)
    await publish('another', null, 2)

    const result = await posts.getPublicBySlug('lonely')

    expect(result.related).toEqual([])
  })

  it('pages through the public list with limit and offset', async () => {
    for (let i = 1; i <= 5; i++) await publish(`p-${i}`, null, i)

    const { posts: page, total } = await posts.listPublic(2, 2)

    expect(total).toBe(5)
    expect(page.map((p) => p.slug)).toEqual(['p-3', 'p-4'])
  })

  it('filters the public list by category, counting only that category', async () => {
    await publish('c-1', 'Community', 1)
    await publish('s-1', 'Student Life', 2)
    await publish('c-2', 'Community', 3)

    const { posts: page, total } = await posts.listPublic(10, 0, 'Community')

    expect(total).toBe(2)
    expect(page.map((p) => p.slug)).toEqual(['c-1', 'c-2'])
  })
})
