import { Router } from 'express'
import { z } from 'zod'
import { settingsSchema } from '@cms/shared'
import { requireRole } from '../../middleware/requireAuth.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import * as service from './site.service.js'
import { buildSitemap } from './sitemap.service.js'

/* ------------------------------------------------------------------ public */

export const publicSiteRoutes = Router()

/** Everything the site chrome needs, in one request. */
publicSiteRoutes.get('/chrome', async (_req, res, next) => {
  try {
    const [settings, nav, announcements] = await Promise.all([
      service.getSettings(),
      service.publicNavigation(),
      service.activeAnnouncements(),
    ])
    res.json({ settings, nav, announcements })
  } catch (err) {
    next(err)
  }
})

publicSiteRoutes.get('/sitemap', async (_req, res, next) => {
  try {
    res.json({ urls: await buildSitemap() })
  } catch (err) {
    next(err)
  }
})

publicSiteRoutes.get('/staff', async (_req, res, next) => {
  try {
    res.json({ staff: await service.listStaff(true) })
  } catch (err) {
    next(err)
  }
})

publicSiteRoutes.get('/downloads', async (_req, res, next) => {
  try {
    res.json({ downloads: await service.listDownloads(true) })
  } catch (err) {
    next(err)
  }
})

const inquirySchema = z.object({
  name: z.string().min(1).max(120).trim(),
  email: z.string().email().max(200).toLowerCase().trim(),
  phone: z.string().max(60).nullish(),
  subject: z.string().max(160).nullish(),
  message: z.string().min(1).max(4000).trim(),
  source: z.string().max(60).nullish(),
  /**
   * Honeypot: a hidden field real people never fill in.
   *
   * Accepts any string on purpose. Constraining it to empty would make a
   * filled one fail validation with a 400 naming the field — which tells the
   * bot exactly what tripped it and how to adapt. The handler discards it
   * silently instead.
   */
  website: z.string().max(200).optional(),
})

publicSiteRoutes.post(
  '/inquiries',
  rateLimit({ limit: 5, windowMs: 60 * 60 * 1000, name: 'inquiry' }),
  async (req, res, next) => {
    try {
      const input = inquirySchema.parse(req.body)

      // Honeypot filled means a bot. Return 204 rather than an error so the
      // bot cannot learn what tripped it and adapt.
      if (input.website) return res.status(204).end()

      await service.createInquiry({ ...input, ip: req.ip })
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)

/* ------------------------------------------------------------------- admin */

export const siteRoutes = Router()
siteRoutes.use(requireRole('super_admin', 'content_editor'))

siteRoutes.get('/settings', async (_req, res, next) => {
  try {
    res.json({ settings: await service.getSettings() })
  } catch (err) {
    next(err)
  }
})

siteRoutes.put('/settings', async (req, res, next) => {
  try {
    const patch = settingsSchema.partial().parse(req.body)
    res.json({ settings: await service.saveSettings(patch, { id: req.auth!.user.id, ip: req.ip }) })
  } catch (err) {
    next(err)
  }
})

siteRoutes.get('/navigation', async (_req, res, next) => {
  try {
    const [navigation, tree] = await Promise.all([service.listNavigation(), service.exportNavigationTree()])
    res.json({ navigation, tree })
  } catch (err) {
    next(err)
  }
})

siteRoutes.put('/navigation', async (req, res, next) => {
  try {
    const { items } = service.navigationInputSchema.parse(req.body)
    await service.saveNavigation(items, { id: req.auth!.user.id, ip: req.ip })
    res.json({ tree: await service.exportNavigationTree() })
  } catch (err) {
    next(err)
  }
})

const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(140).trim(),
  roleTitle: z.string().max(140).nullish(),
  department: z.string().max(80).nullish(),
  photoMediaId: z.string().nullish(),
  bio: z.string().max(2000).nullish(),
  email: z.union([z.string().email(), z.literal('')]).nullish(),
  seq: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
})

siteRoutes.get('/staff', async (_req, res, next) => {
  try {
    res.json({ staff: await service.listStaff(false) })
  } catch (err) {
    next(err)
  }
})

siteRoutes.put('/staff', async (req, res, next) => {
  try {
    const input = staffSchema.parse(req.body)
    res.json({ staff: await service.upsertStaff(input, { id: req.auth!.user.id, ip: req.ip }) })
  } catch (err) {
    next(err)
  }
})

siteRoutes.delete('/staff/:id', async (req, res, next) => {
  try {
    await service.removeStaff(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

const downloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(500).nullish(),
  mediaId: z.string().min(1),
  category: z.string().max(80).nullish(),
  seq: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
})

siteRoutes.get('/downloads', async (_req, res, next) => {
  try {
    res.json({ downloads: await service.listDownloads(false) })
  } catch (err) {
    next(err)
  }
})

siteRoutes.put('/downloads', async (req, res, next) => {
  try {
    const input = downloadSchema.parse(req.body)
    res.json({ download: await service.upsertDownload(input, { id: req.auth!.user.id, ip: req.ip }) })
  } catch (err) {
    next(err)
  }
})

siteRoutes.delete('/downloads/:id', async (req, res, next) => {
  try {
    await service.removeDownload(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200).trim(),
  body: z.unknown().optional(),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
})

siteRoutes.get('/announcements', async (_req, res, next) => {
  try {
    res.json({ announcements: await service.listAnnouncements() })
  } catch (err) {
    next(err)
  }
})

siteRoutes.put('/announcements', async (req, res, next) => {
  try {
    const input = announcementSchema.parse(req.body)
    res.json({
      announcement: await service.upsertAnnouncement(input, { id: req.auth!.user.id, ip: req.ip }),
    })
  } catch (err) {
    next(err)
  }
})

siteRoutes.delete('/announcements/:id', async (req, res, next) => {
  try {
    await service.removeAnnouncement(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

siteRoutes.get('/inquiries', async (req, res, next) => {
  try {
    const { all } = z.object({ all: z.coerce.boolean().default(false) }).parse(req.query)
    res.json({ inquiries: await service.listInquiries(all) })
  } catch (err) {
    next(err)
  }
})

siteRoutes.post('/inquiries/:id/handled', async (req, res, next) => {
  try {
    res.json({
      inquiry: await service.markInquiryHandled(req.params.id!, {
        id: req.auth!.user.id,
        ip: req.ip,
      }),
    })
  } catch (err) {
    next(err)
  }
})
