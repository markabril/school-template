import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { count, eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { downloads, events, media, pageBlocks, pages, posts, staff } from '../src/db/schema/index.js'
import { PHOTO_ROLES, photoFile } from '../src/demo/photos.js'
import { readManifest, removeDemo, seedDemo } from '../src/demo/seed.js'
import { samplePdf } from '../src/demo/pdf.js'
import * as postsService from '../src/modules/posts/posts.service.js'
import { exportNavigationTree, getSettings, saveNavigation, saveSettings } from '../src/modules/site/site.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

type CountableTable = typeof media | typeof posts | typeof events | typeof staff | typeof downloads

const rows = (table: CountableTable) =>
  db
    .select({ n: count() })
    .from(table as typeof media)
    .then((r) => r[0]!.n)

async function fakeImages(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demo-images-'))
  for (const role of PHOTO_ROLES) {
    const portrait = role.startsWith('staff-')
    await sharp({
      create: { width: portrait ? 48 : 64, height: portrait ? 64 : 48, channels: 3, background: '#6e1d2b' },
    })
      .jpeg()
      .toFile(path.join(dir, photoFile(role)))
  }
  return dir
}

describe('samplePdf', () => {
  it('produces a file that passes the upload magic-byte check', () => {
    const pdf = samplePdf('Title', ['line one'])
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(pdf.toString('latin1')).toContain('%%EOF')
  })
})

describe('seed:demo', { timeout: 60_000 }, () => {
  let imagesDir: string
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
    imagesDir = await fakeImages()
  })

  afterAll(async () => {
    await rm('./test/.tmp-media', { recursive: true, force: true })
  })

  it('creates the exact demo content set', async () => {
    await seedDemo({ imagesDir })

    expect(await rows(media)).toBe(20) // 18 photos + 2 PDFs
    expect(await rows(posts)).toBe(9)
    expect(await rows(events)).toBe(5)
    expect(await rows(staff)).toBe(6)
    expect(await rows(downloads)).toBe(2)

    const photos = await db.select().from(media).where(eq(media.mime, 'image/jpeg'))
    expect(photos.every((m) => m.caption === 'PLACEHOLDER — replace before launch')).toBe(true)

    const home = await db.select().from(pages).where(eq(pages.slug, 'home')).then((r) => r[0]!)
    const blocks = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, home.id))
    expect(blocks.sort((a, b) => a.seq - b.seq).map((b) => b.type)).toEqual([
      'hero',
      'newsTeaser',
      'eventsTeaser',
      'storiesColumns',
    ])

    const tree = await exportNavigationTree()
    expect(tree.find((t) => t.label === 'About')!.children!.map((c) => c.label)).toEqual([
      'History',
      'Mission & Vision',
      'Faculty & Staff',
    ])
  })

  it('keeps the manifest out of public settings and refuses to run twice', async () => {
    await seedDemo({ imagesDir })

    expect(await readManifest()).not.toBeNull()
    expect(await getSettings()).not.toHaveProperty(['demo.manifest'])
    await expect(seedDemo({ imagesDir })).rejects.toThrow(/already seeded/)
  })

  it('refuses when a photo is missing, naming it', async () => {
    await rm(path.join(imagesDir, 'staff-3.jpg'))
    await expect(seedDemo({ imagesDir })).rejects.toThrow(/staff-3\.jpg/)
  })

  it('removes exactly what it created and restores what it replaced', async () => {
    // Pre-existing state the seed will overwrite.
    const home = await db
      .insert(pages)
      .values({ slug: 'home', title: 'Home', status: 'published', publishedAt: new Date() })
      .returning()
      .then((r) => r[0]!)
    await db.insert(pageBlocks).values({ pageId: home.id, seq: 0, type: 'richText', data: { doc: { type: 'doc', content: [] } } })
    await saveNavigation([{ location: 'header', label: 'Only link', url: '/only' }], actor)
    await saveSettings({ 'site.name': 'Before Seeding' }, actor)

    await seedDemo({ imagesDir })

    // Content added by a person after seeding must survive removal.
    const mine = await postsService.create({ title: 'Real article', slug: 'real-article' }, actor)

    await removeDemo()

    expect(await rows(media)).toBe(0)
    expect(await rows(events)).toBe(0)
    expect(await rows(staff)).toBe(0)
    expect(await rows(downloads)).toBe(0)
    expect((await db.select().from(posts)).map((p) => p.id)).toEqual([mine.id])

    const restored = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, home.id))
    expect(restored.map((b) => b.type)).toEqual(['richText'])
    expect((await exportNavigationTree()).map((t) => t.label)).toEqual(['Only link'])
    expect((await getSettings())['site.name']).toBe('Before Seeding')
    expect(await readManifest()).toBeNull()
  })

  it('removes a homepage it created itself', async () => {
    await seedDemo({ imagesDir })
    await removeDemo()
    expect(await db.select().from(pages).where(eq(pages.slug, 'home'))).toEqual([])
  })
})
