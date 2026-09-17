import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import type { SiteSettings } from '@cms/shared'
import { db } from '../db/client.js'
import { pages, siteSettings, users } from '../db/schema/index.js'
import { AppError } from '../lib/errors.js'
import * as mediaService from '../modules/media/media.service.js'
import * as postsService from '../modules/posts/posts.service.js'
import * as eventsService from '../modules/events/events.service.js'
import * as pagesService from '../modules/pages/pages.service.js'
import * as site from '../modules/site/site.service.js'
import {
  PLACEHOLDER_CAPTION,
  daysAgo,
  demoDownloads,
  demoEvents,
  demoNavigation,
  demoPosts,
  demoSettings,
  demoStaff,
  historyBlocks,
  homeBlocks,
  missionBlocks,
} from './content.js'
import { samplePdf } from './pdf.js'
import { DEMO_PHOTOS, PHOTO_ROLES, photoFile, type PhotoRole } from './photos.js'

export const MANIFEST_KEY = 'demo.manifest'

export interface DemoManifest {
  createdAt: string
  ids: {
    media: string[]
    posts: string[]
    events: string[]
    staff: string[]
    downloads: string[]
    pages: string[]
  }
  /** State the seed overwrites, captured first so removal can put it back. */
  snapshot: {
    home: { id: string; status: 'draft' | 'published'; blocks: Array<{ type: string; data: unknown }> } | null
    navigation: site.NavInputItem[]
    settings: SiteSettings
  }
}

export async function readManifest(): Promise<DemoManifest | null> {
  const row = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, MANIFEST_KEY))
    .limit(1)
    .then((r) => r[0])
  return (row?.value as DemoManifest | undefined) ?? null
}

async function writeManifest(manifest: DemoManifest): Promise<void> {
  // Written directly, not through saveSettings: this key is internal and is
  // deliberately excluded from the public settings object.
  await db
    .insert(siteSettings)
    .values({ key: MANIFEST_KEY, value: manifest })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: manifest } })
}

async function deleteManifest(): Promise<void> {
  await db.delete(siteSettings).where(eq(siteSettings.key, MANIFEST_KEY))
}

async function adminActor() {
  const admin = await db
    .select()
    .from(users)
    .where(and(eq(users.role, 'super_admin'), eq(users.status, 'active')))
    .limit(1)
    .then((r) => r[0])
  if (!admin) throw new Error('No active administrator found. Run `npm run create-admin` first.')
  return { id: admin.id, ip: null }
}

export async function seedDemo(opts: { imagesDir: string }): Promise<DemoManifest['ids']> {
  if (await readManifest()) {
    throw new Error('Demo content is already seeded. Run `npm run seed:demo -- --remove` first.')
  }

  const missing: string[] = []
  for (const role of PHOTO_ROLES) {
    try {
      await access(path.join(opts.imagesDir, photoFile(role)))
    } catch {
      missing.push(photoFile(role))
    }
  }
  if (missing.length) {
    throw new Error(`Missing demo photos in ${opts.imagesDir}: ${missing.join(', ')}`)
  }

  const actor = await adminActor()

  const existingHome = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, 'home'))
    .limit(1)
    .then((r) => r[0])

  const manifest: DemoManifest = {
    createdAt: new Date().toISOString(),
    ids: { media: [], posts: [], events: [], staff: [], downloads: [], pages: [] },
    snapshot: {
      home: existingHome
        ? {
            id: existingHome.id,
            status: existingHome.status,
            blocks: (await pagesService.getWithBlocks(existingHome.id)).blocks.map((b) => ({
              type: b.type,
              data: b.data,
            })),
          }
        : null,
      navigation: await site.exportNavigationTree(),
      settings: await site.getSettings(),
    },
  }

  // Record progress as we go, so a failure half-way through is still fully
  // removable with --remove instead of leaving untracked rows behind.
  const record = async <K extends keyof DemoManifest['ids']>(kind: K, id: string) => {
    manifest.ids[kind].push(id)
    await writeManifest(manifest)
  }
  await writeManifest(manifest)

  // --- photos --------------------------------------------------------------
  const photoIds = {} as Record<PhotoRole, string>
  for (const role of PHOTO_ROLES) {
    const row = await mediaService.upload({
      buffer: await readFile(path.join(opts.imagesDir, photoFile(role))),
      originalName: photoFile(role),
      alt: DEMO_PHOTOS[role].alt,
      caption: PLACEHOLDER_CAPTION,
      actor,
    })
    photoIds[role] = row.id
    await record('media', row.id)
  }

  // --- posts ---------------------------------------------------------------
  for (const item of demoPosts) {
    const post = await postsService.create({ title: item.title, slug: item.slug }, actor)
    await record('posts', post.id)
    await postsService.update(
      post.id,
      {
        excerpt: item.excerpt,
        body: item.body,
        category: item.category,
        coverMediaId: item.cover ? photoIds[item.cover] : null,
      },
      actor,
    )
    await postsService.setStatus(post.id, 'published', daysAgo(item.daysAgo), actor)
  }

  // --- events --------------------------------------------------------------
  for (const item of demoEvents()) {
    const event = await eventsService.create({ title: item.title, slug: item.slug, startsAt: item.startsAt }, actor)
    await record('events', event.id)
    await eventsService.update(
      event.id,
      {
        endsAt: item.endsAt,
        allDay: item.allDay,
        location: item.location,
        description: item.description,
        coverMediaId: item.cover ? photoIds[item.cover] : null,
      },
      actor,
    )
    await eventsService.setStatus(event.id, 'published', actor)
  }

  // --- staff ---------------------------------------------------------------
  for (const [seq, person] of demoStaff.entries()) {
    const row = await site.upsertStaff(
      {
        name: person.name,
        roleTitle: person.roleTitle,
        department: person.department,
        photoMediaId: photoIds[person.photo],
        bio: 'Placeholder profile — replace before launch.',
        seq,
        isPublished: true,
      },
      actor,
    )
    await record('staff', row.id)
  }

  // --- downloads -----------------------------------------------------------
  for (const [seq, item] of demoDownloads.entries()) {
    const file = await mediaService.upload({
      buffer: samplePdf(item.pdfTitle, item.pdfLines),
      originalName: item.file,
      alt: item.alt,
      caption: PLACEHOLDER_CAPTION,
      actor,
    })
    await record('media', file.id)
    const row = await site.upsertDownload(
      {
        title: item.title,
        description: item.description,
        mediaId: file.id,
        category: item.category,
        seq,
        isPublished: true,
      },
      actor,
    )
    await record('downloads', row.id)
  }

  // --- pages ---------------------------------------------------------------
  const history = await pagesService.create({ title: 'Our History', slug: 'history' }, actor)
  await record('pages', history.id)
  await pagesService.saveBlocks(
    history.id,
    historyBlocks({ first: photoIds['history-1'], second: photoIds['history-2'] }),
    actor,
  )
  await pagesService.setStatus(history.id, 'published', null, actor)

  const mission = await pagesService.create({ title: 'Mission and Vision', slug: 'mission-and-vision' }, actor)
  await record('pages', mission.id)
  await pagesService.saveBlocks(mission.id, missionBlocks(), actor)
  await pagesService.setStatus(mission.id, 'published', null, actor)

  let homeId = existingHome?.id
  if (!homeId) {
    const home = await pagesService.create({ title: 'Home', slug: 'home' }, actor)
    homeId = home.id
    await record('pages', home.id)
  }
  await pagesService.saveBlocks(homeId, homeBlocks(photoIds.hero), actor)
  await pagesService.setStatus(homeId, 'published', null, actor)

  // --- settings and navigation ----------------------------------------------
  await site.saveSettings(demoSettings, actor)
  await site.saveNavigation(demoNavigation({ home: homeId, history: history.id, mission: mission.id }), actor)

  return manifest.ids
}

/** Run a deletion, tolerating rows someone already removed by hand. */
async function tolerateMissing(run: () => Promise<unknown>): Promise<void> {
  try {
    await run()
  } catch (err) {
    if (err instanceof AppError && err.status === 404) return
    throw err
  }
}

export async function removeDemo(): Promise<void> {
  const manifest = await readManifest()
  if (!manifest) throw new Error('No demo content to remove.')

  const actor = await adminActor()
  const { ids, snapshot } = manifest

  for (const id of ids.downloads) await site.removeDownload(id, actor)
  for (const id of ids.staff) await site.removeStaff(id, actor)
  for (const id of ids.events) await tolerateMissing(() => eventsService.remove(id, actor))
  for (const id of ids.posts) await tolerateMissing(() => postsService.remove(id, actor))
  for (const id of ids.pages) await tolerateMissing(() => pagesService.remove(id, actor))

  if (snapshot.home) {
    await tolerateMissing(async () => {
      await pagesService.saveBlocks(snapshot.home!.id, snapshot.home!.blocks, actor)
      await pagesService.setStatus(snapshot.home!.id, snapshot.home!.status, null, actor)
    })
  }
  await site.saveNavigation(snapshot.navigation, actor)
  await site.saveSettings(snapshot.settings, actor)

  // Media last: nothing restored above may still reference it.
  for (const id of ids.media) await tolerateMissing(() => mediaService.remove(id, actor))

  await deleteManifest()
}
