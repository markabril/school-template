import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { requireRole } from '../../middleware/requireAuth.js'
import { badRequest } from '../../lib/errors.js'
import * as service from './media.service.js'
import { MAX_DOC_BYTES } from './validate.js'

export const mediaRoutes = Router()

/**
 * Memory storage, with multer's limit set to the largest type we accept.
 * Per-type limits are applied in the service once the real format is known
 * from magic bytes — trusting the client's declared type to pick a size limit
 * would let a 25MB "PDF" through that is actually an image.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_BYTES, files: 1 },
})

// Both roles manage media: a content editor cannot build a page without it.
mediaRoutes.use(requireRole('super_admin', 'content_editor'))

mediaRoutes.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = z
      .object({
        limit: z.coerce.number().int().min(1).max(200).default(100),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(req.query)

    const rows = await service.list(limit, offset)
    res.json({ media: rows.map(service.toPublic) })
  } catch (err) {
    next(err)
  }
})

mediaRoutes.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest('No file was uploaded')

    const { alt, caption } = z
      .object({ alt: z.string().max(300), caption: z.string().max(500).optional() })
      .parse(req.body)

    const row = await service.upload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      alt,
      caption,
      actor: { id: req.auth!.user.id, ip: req.ip },
    })

    res.status(201).json({ media: service.toPublic(row) })
  } catch (err) {
    next(err)
  }
})

mediaRoutes.patch('/:id', async (req, res, next) => {
  try {
    const patch = z
      .object({ alt: z.string().max(300).optional(), caption: z.string().max(500).nullable().optional() })
      .parse(req.body)

    const row = await service.updateMeta(req.params.id!, patch, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ media: service.toPublic(row) })
  } catch (err) {
    next(err)
  }
})

mediaRoutes.delete('/:id', async (req, res, next) => {
  try {
    await service.remove(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
