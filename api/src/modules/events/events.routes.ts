import { Router } from 'express'
import { z } from 'zod'
import { slugSchema } from '@cms/shared'
import { requireRole } from '../../middleware/requireAuth.js'
import * as service from './events.service.js'

export const publicEventRoutes = Router()

publicEventRoutes.get('/', async (req, res, next) => {
  try {
    const q = z
      .object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        past: z.coerce.boolean().default(false),
      })
      .parse(req.query)
    res.json({ events: await service.listPublic(q.limit, q.past) })
  } catch (err) {
    next(err)
  }
})

export const eventRoutes = Router()
eventRoutes.use(requireRole('super_admin', 'content_editor'))

eventRoutes.get('/', async (_req, res, next) => {
  try {
    res.json({ events: await service.listAdmin() })
  } catch (err) {
    next(err)
  }
})

eventRoutes.get('/:id', async (req, res, next) => {
  try {
    res.json({ event: await service.getAdmin(req.params.id!) })
  } catch (err) {
    next(err)
  }
})

eventRoutes.post('/', async (req, res, next) => {
  try {
    const input = z
      .object({
        title: z.string().min(1).max(200).trim(),
        slug: slugSchema,
        startsAt: z.coerce.date(),
      })
      .parse(req.body)
    const event = await service.create(input, { id: req.auth!.user.id, ip: req.ip })
    res.status(201).json({ event })
  } catch (err) {
    next(err)
  }
})

eventRoutes.patch('/:id', async (req, res, next) => {
  try {
    const patch = z
      .object({
        title: z.string().min(1).max(200).trim().optional(),
        slug: slugSchema.optional(),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date().nullable().optional(),
        allDay: z.boolean().optional(),
        location: z.string().max(200).nullable().optional(),
        description: z.unknown().optional(),
      })
      .parse(req.body)
    const event = await service.update(req.params.id!, patch, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ event })
  } catch (err) {
    next(err)
  }
})

eventRoutes.post('/:id/publish', async (req, res, next) => {
  try {
    res.json({
      event: await service.setStatus(req.params.id!, 'published', {
        id: req.auth!.user.id,
        ip: req.ip,
      }),
    })
  } catch (err) {
    next(err)
  }
})

eventRoutes.post('/:id/unpublish', async (req, res, next) => {
  try {
    res.json({
      event: await service.setStatus(req.params.id!, 'draft', {
        id: req.auth!.user.id,
        ip: req.ip,
      }),
    })
  } catch (err) {
    next(err)
  }
})

eventRoutes.delete('/:id', async (req, res, next) => {
  try {
    await service.remove(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
