import { mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import sharp, { type Sharp } from 'sharp'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { media } from '../../db/schema/index.js'
import { newId } from '../../lib/ids.js'
import { badRequest, notFound } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { logger } from '../../lib/logger.js'
import { detectType, assertSize } from './validate.js'

export const MEDIA_ROOT = path.resolve('data/media')

/** Widths generated for every raster upload. Covers phone through 2x desktop. */
export const DERIVATIVE_WIDTHS = [400, 800, 1200, 1600] as const

export interface UploadArgs {
  buffer: Buffer
  originalName: string
  alt: string
  caption?: string
  actor: { id: string; ip?: string | null }
}

function monthDir(): string {
  const now = new Date()
  // Year/month subdirectories keep any single directory small. A school
  // uploading photos every term reaches tens of thousands of files, and flat
  // directories that size are miserable for backups and for `ls`.
  return path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'))
}

export async function upload(args: UploadArgs) {
  const detected = detectType(args.buffer)
  assertSize(args.buffer.length, detected.kind)

  const alt = args.alt.trim()
  if (!alt) {
    // Enforced at the service, not just the form. Upload is the only moment
    // anyone will realistically write alt text, and a public school site has a
    // genuine accessibility obligation.
    throw badRequest('Alt text is required — describe the image for someone who cannot see it')
  }

  const id = newId()
  const rel = monthDir()
  const dir = path.join(MEDIA_ROOT, rel)
  await mkdir(dir, { recursive: true })

  const filename = `${id}.${detected.ext}`
  const storagePath = path.join(rel, filename).replace(/\\/g, '/')

  let width: number | null = null
  let height: number | null = null

  if (detected.kind === 'image') {
    let image: Sharp
    try {
      image = sharp(args.buffer, { failOn: 'error' })
      const meta = await image.metadata()
      width = meta.width ?? null
      height = meta.height ?? null
    } catch {
      // Passed the magic-byte check but sharp cannot decode it: truncated,
      // corrupt, or a deliberately malformed decoder-bomb. Refuse it.
      throw badRequest('That image could not be read. It may be corrupted.')
    }

    if (!width || !height) throw badRequest('That image could not be read.')

    await writeFile(path.join(dir, filename), args.buffer)
    await generateDerivatives(args.buffer, dir, id, width)
  } else {
    await writeFile(path.join(dir, filename), args.buffer)
  }

  const row = await db
    .insert(media)
    .values({
      id,
      filename: args.originalName.slice(0, 200),
      storagePath,
      mime: detected.mime,
      size: args.buffer.length,
      width,
      height,
      alt,
      caption: args.caption?.trim() || null,
      uploadedBy: args.actor.id,
    })
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: args.actor.id,
    action: 'media.uploaded',
    entity: 'media',
    entityId: id,
    after: { filename: row.filename, mime: row.mime, size: row.size },
    ip: args.actor.ip,
  })

  return row
}

/**
 * WebP derivatives at fixed widths, never upscaled.
 *
 * Generated at upload rather than on request: this runs on a small VPS beside
 * SQLite, and resizing on demand turns one crawler hitting a gallery into a CPU
 * spike that also stalls database writes.
 */
async function generateDerivatives(
  buffer: Buffer,
  dir: string,
  id: string,
  originalWidth: number,
): Promise<void> {
  const targets = DERIVATIVE_WIDTHS.filter((w) => w < originalWidth)

  await Promise.all(
    targets.map(async (w) => {
      try {
        const out = await sharp(buffer)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toBuffer()
        await writeFile(path.join(dir, `${id}-${w}.webp`), out)
      } catch (err) {
        // A failed derivative degrades quality, it does not break the upload —
        // the original is already written and the frontend falls back to it.
        logger.warn({ err, id, width: w }, 'derivative generation failed')
      }
    }),
  )
}

export async function list(limit = 100, offset = 0) {
  return db.select().from(media).orderBy(desc(media.createdAt)).limit(limit).offset(offset)
}

export async function get(id: string) {
  const row = await db
    .select()
    .from(media)
    .where(eq(media.id, id))
    .limit(1)
    .then((r) => r[0])
  if (!row) throw notFound('No such file')
  return row
}

export async function updateMeta(
  id: string,
  patch: { alt?: string; caption?: string | null },
  actor: { id: string; ip?: string | null },
) {
  const before = await get(id)

  if (patch.alt !== undefined && !patch.alt.trim()) {
    throw badRequest('Alt text cannot be empty')
  }

  const after = await db
    .update(media)
    .set({
      ...(patch.alt !== undefined ? { alt: patch.alt.trim() } : {}),
      ...(patch.caption !== undefined ? { caption: patch.caption?.trim() || null } : {}),
    })
    .where(eq(media.id, id))
    .returning()
    .then((r) => r[0]!)

  audit({
    actorUserId: actor.id,
    action: 'media.updated',
    entity: 'media',
    entityId: id,
    before: { alt: before.alt, caption: before.caption },
    after: { alt: after.alt, caption: after.caption },
    ip: actor.ip,
  })

  return after
}

export async function remove(id: string, actor: { id: string; ip?: string | null }) {
  const row = await get(id)

  // Files are removed from disk after the row is gone. If the unlink fails we
  // are left with an orphaned file, which is harmless; the reverse — a row
  // pointing at a deleted file — renders as a broken image on the public site.
  await db.delete(media).where(eq(media.id, id))

  const dir = path.dirname(path.join(MEDIA_ROOT, row.storagePath))
  const base = path.basename(row.storagePath, path.extname(row.storagePath))

  await Promise.all([
    rm(path.join(MEDIA_ROOT, row.storagePath), { force: true }),
    ...DERIVATIVE_WIDTHS.map((w) => rm(path.join(dir, `${base}-${w}.webp`), { force: true })),
  ])

  audit({
    actorUserId: actor.id,
    action: 'media.deleted',
    entity: 'media',
    entityId: id,
    before: { filename: row.filename, storagePath: row.storagePath },
    ip: actor.ip,
  })
}

/** Shape returned to clients: the frontend never sees a filesystem path. */
export function toPublic(row: typeof media.$inferSelect) {
  const base = row.storagePath.replace(/\.[^.]+$/, '')
  const isImage = row.mime.startsWith('image/')

  return {
    id: row.id,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    alt: row.alt,
    caption: row.caption,
    url: `/media/${row.storagePath}`,
    srcset: isImage
      ? DERIVATIVE_WIDTHS.filter((w) => !row.width || w < row.width).map((w) => ({
          width: w,
          url: `/media/${base}-${w}.webp`,
        }))
      : [],
    createdAt: row.createdAt,
  }
}
