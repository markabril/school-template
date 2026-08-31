import { Router } from 'express'
import { z } from 'zod'
import { isLive, seoSchema, slugSchema } from '@cms/shared'
import { requireRole } from '../../middleware/requireAuth.js'
import { notFound } from '../../lib/errors.js'
import { signPreviewToken, verifyPreviewToken } from '../../lib/preview.js'
import { env } from '../../env.js'
import * as service from './pages.service.js'

/** Public reads: the site itself. No session required. */
export const publicPageRoutes = Router()

publicPageRoutes.get('/by-slug/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug!
    let result
    try {
      result = await service.getBySlugWithBlocks(slug)
    } catch {
      // Not a current slug — it may be an old one that should redirect.
      const current = await service.resolveOldSlug(slug)
      if (current) return res.status(301).json({ redirectTo: `/${current}` })
      throw notFound('No such page')
    }

    // A draft, or a scheduled page whose date has not arrived, is not public.
    // The status column alone is not the gate — see shared/src/content.ts.
    if (!isLive(result.page)) throw notFound('No such page')

    res.json({
      page: {
        id: result.page.id,
        slug: result.page.slug,
        title: result.page.title,
        seo: result.page.seo,
        publishedAt: result.page.publishedAt,
      },
      blocks: result.blocks.map((b) => ({ id: b.id, type: b.type, data: b.data })),
      media: result.media,
      refs: result.refs,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Preview a draft with a signed token.
 *
 * Separate from the authenticated admin route on purpose: the point of preview
 * is to send a link to someone reviewing the page, who may have no CMS account.
 */
publicPageRoutes.get('/preview/:token', async (req, res, next) => {
  try {
    const claim = verifyPreviewToken(req.params.token!)
    if (!claim) throw notFound('This preview link is invalid or has expired')

    const result = await service.getWithBlocks(claim.pageId)
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    res.setHeader('Cache-Control', 'no-store')
    res.json({
      page: {
        id: result.page.id,
        slug: result.page.slug,
        title: result.page.title,
        seo: result.page.seo,
        status: result.page.status,
      },
      blocks: result.blocks.map((b) => ({ id: b.id, type: b.type, data: b.data })),
      media: result.media,
      refs: result.refs,
      isPreview: true,
    })
  } catch (err) {
    next(err)
  }
})

/** Admin writes. */
export const pageRoutes = Router()
pageRoutes.use(requireRole('super_admin', 'content_editor'))

pageRoutes.get('/', async (_req, res, next) => {
  try {
    res.json({ pages: await service.list() })
  } catch (err) {
    next(err)
  }
})

pageRoutes.get('/:id', async (req, res, next) => {
  try {
    const r = await service.getWithBlocks(req.params.id!)
    res.json({
      page: r.page,
      blocks: r.blocks.map((b) => ({ id: b.id, type: b.type, data: b.data, seq: b.seq })),
      media: r.media,
      refs: r.refs,
    })
  } catch (err) {
    next(err)
  }
})

pageRoutes.post('/', async (req, res, next) => {
  try {
    const input = z
      .object({ title: z.string().min(1).max(200).trim(), slug: slugSchema })
      .parse(req.body)
    const page = await service.create(input, { id: req.auth!.user.id, ip: req.ip })
    res.status(201).json({ page })
  } catch (err) {
    next(err)
  }
})

pageRoutes.patch('/:id', async (req, res, next) => {
  try {
    const patch = z
      .object({
        title: z.string().min(1).max(200).trim().optional(),
        slug: slugSchema.optional(),
        seo: seoSchema.optional(),
      })
      .parse(req.body)

    const page = await service.updateMeta(req.params.id!, patch, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ page })
  } catch (err) {
    next(err)
  }
})

pageRoutes.put('/:id/blocks', async (req, res, next) => {
  try {
    // Block data is validated per-type by the registry inside the service, so
    // it is passthrough here — one schema, not two that can drift apart.
    const { blocks } = z
      .object({ blocks: z.array(z.object({ type: z.string(), data: z.unknown() })).max(60) })
      .parse(req.body)

    const saved = await service.saveBlocks(req.params.id!, blocks, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ blocks: saved.map((b) => ({ id: b.id, type: b.type, data: b.data, seq: b.seq })) })
  } catch (err) {
    next(err)
  }
})

pageRoutes.post('/:id/publish', async (req, res, next) => {
  try {
    const { publishedAt } = z
      .object({ publishedAt: z.coerce.date().nullable().optional() })
      .parse(req.body ?? {})

    const page = await service.setStatus(req.params.id!, 'published', publishedAt ?? null, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ page })
  } catch (err) {
    next(err)
  }
})

pageRoutes.post('/:id/unpublish', async (req, res, next) => {
  try {
    const page = await service.setStatus(req.params.id!, 'draft', null, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ page })
  } catch (err) {
    next(err)
  }
})

pageRoutes.post('/:id/preview-link', async (req, res, next) => {
  try {
    await service.getWithBlocks(req.params.id!) // 404s if the page is gone
    const token = signPreviewToken(req.params.id!)
    res.json({ url: `${env.PUBLIC_ORIGIN}/preview/${token}`, expiresInMinutes: 30 })
  } catch (err) {
    next(err)
  }
})

pageRoutes.delete('/:id', async (req, res, next) => {
  try {
    await service.remove(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
