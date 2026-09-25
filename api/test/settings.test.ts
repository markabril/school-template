import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { siteSettings } from '../src/db/schema/index.js'
import { getSettings } from '../src/modules/site/site.service.js'
import { truncateAll } from './helpers.js'

describe('getSettings', () => {
  beforeEach(truncateAll)

  it('never exposes keys outside the declared settings', async () => {
    // Internal bookkeeping (e.g. the demo manifest) lives in the same table
    // and must not reach the public /content/chrome response.
    await db.insert(siteSettings).values({ key: 'demo.manifest', value: { ids: ['x'] } })
    await db.insert(siteSettings).values({ key: 'site.name', value: 'Stored Name' })

    const settings = await getSettings()

    // Array form: the key contains a dot and must not be read as a nested path.
    expect(settings).not.toHaveProperty(['demo.manifest'])
    expect(settings['site.name']).toBe('Stored Name')
  })

  it('falls back to defaults for missing keys', async () => {
    const settings = await getSettings()
    expect(settings['site.tagline']).toBe('I Think. I Lead. I Care.')
  })
})
