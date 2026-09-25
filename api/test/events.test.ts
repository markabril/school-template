import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { media } from '../src/db/schema/index.js'
import * as events from '../src/modules/events/events.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

describe('event covers', () => {
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
  })

  it('sets a cover and returns it resolved in the public list', async () => {
    const photo = await db
      .insert(media)
      .values({
        filename: 'fair.jpg',
        storagePath: '2026/09/fair.jpg',
        mime: 'image/jpeg',
        size: 1000,
        width: 1600,
        height: 900,
        alt: 'Science fair tables',
        uploadedBy: actor.id,
      })
      .returning()
      .then((r) => r[0]!)

    const event = await events.create(
      { title: 'Fair', slug: 'fair', startsAt: new Date(Date.now() + 86_400_000) },
      actor,
    )
    await events.update(event.id, { coverMediaId: photo.id }, actor)
    await events.setStatus(event.id, 'published', actor)

    const [listed] = await events.listPublic(5, false)

    expect(listed!.cover).toMatchObject({ id: photo.id, alt: 'Science fair tables', url: '/media/2026/09/fair.jpg' })
  })

  it('returns a null cover when none is set', async () => {
    const event = await events.create(
      { title: 'Plain', slug: 'plain', startsAt: new Date(Date.now() + 86_400_000) },
      actor,
    )
    await events.setStatus(event.id, 'published', actor)

    const [listed] = await events.listPublic(5, false)
    expect(listed!.cover).toBeNull()
  })
})
