import { Router } from 'express'
import { z } from 'zod'
import { seoSchema, slugSchema } from '@cms/shared'
import { requireRole } from '../../middleware/requireAuth.js'
import * as service from './posts.service.js'

export const publicPostRoutes = Router()

publicPostRoutes.get('/', async (req, res, next) => {
  try {
    const q = z
      .object({
        limit: z.coerce.number().int().min(1).max(50).default(12),
        offset: z.coerce.number().int().min(0).default(0),
        category: z.string().max(60).optional(),
      })
      .parse(req.query)
    res.json(await service.listPublic(q.limit, q.offset, q.category))
  } catch (err) {
    next(err)
  }
})

publicPostRoutes.get('/categories', async (_req, res, next) => {
  try {
    res.json({ categories: await service.categories() })
  } catch (err) {
    next(err)
  }
})

publicPostRoutes.get('/:slug', async (req, res, next) => {
  try {
    const result = await service.getPublicBySlug(req.params.slug!)
    if ('redirectTo' in result) return res.status(301).json(result)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export const postRoutes = Router()
postRoutes.use(requireRole('super_admin', 'content_editor'))

postRoutes.get('/', async (_req, res, next) => {
  try {
    res.json({ posts: await service.listAdmin() })
  } catch (err) {
    next(err)
  }
})

postRoutes.get('/:id', async (req, res, next) => {
  try {
    res.json(await service.getAdmin(req.params.id!))
  } catch (err) {
    next(err)
  }
})

postRoutes.post('/', async (req, res, next) => {
  try {
    const input = z
      .object({ title: z.string().min(1).max(200).trim(), slug: slugSchema })
      .parse(req.body)
    const post = await service.create(input, { id: req.auth!.user.id, ip: req.ip })
    res.status(201).json({ post })
  } catch (err) {
    next(err)
  }
})

postRoutes.patch('/:id', async (req, res, next) => {
  try {
    const patch = z
      .object({
        title: z.string().min(1).max(200).trim().optional(),
        slug: slugSchema.optional(),
        excerpt: z.string().max(400).nullable().optional(),
        body: z.unknown().optional(),
        coverMediaId: z.string().nullable().optional(),
        category: z.string().max(60).nullable().optional(),
        seo: seoSchema.optional(),
      })
      .parse(req.body)
    const post = await service.update(req.params.id!, patch, { id: req.auth!.user.id, ip: req.ip })
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

postRoutes.post('/:id/publish', async (req, res, next) => {
  try {
    const { publishedAt } = z
      .object({ publishedAt: z.coerce.date().nullable().optional() })
      .parse(req.body ?? {})
    const post = await service.setStatus(req.params.id!, 'published', publishedAt ?? null, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

postRoutes.post('/:id/unpublish', async (req, res, next) => {
  try {
    const post = await service.setStatus(req.params.id!, 'draft', null, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

postRoutes.delete('/:id', async (req, res, next) => {
  try {
    await service.remove(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
