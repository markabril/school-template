import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { media } from '../src/db/schema/index.js'
import { publicChrome, saveSettings } from '../src/modules/site/site.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

describe('site logo in the public chrome', () => {
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
  })

  async function uploadLogo() {
    return db
      .insert(media)
      .values({
        filename: 'crest.png',
        storagePath: '2026/09/crest.png',
        mime: 'image/png',
        size: 4000,
        width: 500,
        height: 500,
        alt: 'School crest',
        uploadedBy: actor.id,
      })
      .returning()
      .then((r) => r[0]!)
  }

  it('resolves the chosen logo for the header', async () => {
    const logo = await uploadLogo()
    await saveSettings({ 'site.logoMediaId': logo.id }, actor)

    const chrome = await publicChrome()

    expect(chrome.logo).toMatchObject({
      id: logo.id,
      alt: 'School crest',
      url: '/media/2026/09/crest.png',
      width: 500,
      height: 500,
    })
  })

  it('has no logo when none is chosen', async () => {
    expect((await publicChrome()).logo).toBeNull()
  })

  // A logo deleted from the media library leaves the id behind in settings.
  // Resolving it to null keeps the header on the wordmark instead of rendering
  // a broken image on every page of the site.
  it('has no logo when the image was deleted from the library', async () => {
    const logo = await uploadLogo()
    await saveSettings({ 'site.logoMediaId': logo.id }, actor)
    await db.delete(media)

    expect((await publicChrome()).logo).toBeNull()
  })
})
