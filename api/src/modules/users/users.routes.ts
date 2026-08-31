import { Router } from 'express'
import { z } from 'zod'
import { roleSchema } from '@cms/shared'
import { requireRole } from '../../middleware/requireAuth.js'
import * as service from './users.service.js'

export const userRoutes = Router()

// User management is super_admin only. A content_editor has no business
// creating accounts, and in Release 2 nothing here should reach a registrar
// either without a deliberate decision.
userRoutes.use(requireRole('super_admin'))

const inviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  displayName: z.string().min(1).max(120).trim(),
  role: roleSchema,
})

userRoutes.get('/', async (_req, res, next) => {
  try {
    res.json({ users: await service.listUsers() })
  } catch (err) {
    next(err)
  }
})

userRoutes.post('/', async (req, res, next) => {
  try {
    const input = inviteSchema.parse(req.body)
    const user = await service.inviteUser(input, { id: req.auth!.user.id, ip: req.ip })
    res.status(201).json({ user: { id: user.id, email: user.email, status: user.status } })
  } catch (err) {
    next(err)
  }
})

userRoutes.post('/:id/resend-invite', async (req, res, next) => {
  try {
    await service.resendInvite(req.params.id!, { id: req.auth!.user.id, ip: req.ip })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

userRoutes.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['active', 'disabled']) }).parse(req.body)
    const user = await service.setUserStatus(req.params.id!, status, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ user: { id: user.id, status: user.status } })
  } catch (err) {
    next(err)
  }
})

userRoutes.patch('/:id/role', async (req, res, next) => {
  try {
    const { role } = z.object({ role: roleSchema }).parse(req.body)
    const user = await service.setUserRole(req.params.id!, role, {
      id: req.auth!.user.id,
      ip: req.ip,
    })
    res.json({ user: { id: user.id, role: user.role } })
  } catch (err) {
    next(err)
  }
})
