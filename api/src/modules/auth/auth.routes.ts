import { Router } from 'express'
import * as service from './auth.service.js'
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptInviteSchema,
  changePasswordSchema,
} from './auth.schema.js'
import { setSessionCookie, clearSessionCookie } from '../../lib/cookies.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { rateLimit, consume, resetKey, LOGIN_IP, LOGIN_ACCOUNT } from '../../middleware/rateLimit.js'
import { tooManyRequests } from '../../lib/errors.js'

export const authRoutes = Router()

authRoutes.post(
  '/login',
  rateLimit({ ...LOGIN_IP, name: 'login-ip' }),
  async (req, res, next) => {
    try {
      const { email, password } = loginSchema.parse(req.body)

      // Second dimension: per-account. Stops a distributed attempt against one
      // known address, which the per-IP limit above does nothing about.
      const accountKey = `login-account:${email}`
      if (!consume(accountKey, LOGIN_ACCOUNT.limit, LOGIN_ACCOUNT.windowMs)) {
        throw tooManyRequests('Too many attempts for this account. Please wait 15 minutes.')
      }

      const { token, user } = await service.login(email, password, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })

      // A successful login clears the account counter so a person who simply
      // mistyped a few times is not locked out for the rest of the window.
      resetKey(accountKey)
      setSessionCookie(res, token)
      res.json({ user })
    } catch (err) {
      next(err)
    }
  },
)

authRoutes.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await service.logout(req.auth!.sessionId, req.auth!.user.id, req.ip)
    clearSessionCookie(res)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

/** The admin SPA calls this on boot to find out whether it has a session. */
authRoutes.get('/me', (req, res) => {
  res.json({ user: req.auth?.user ?? null })
})

authRoutes.post(
  '/forgot-password',
  rateLimit({ limit: 5, windowMs: 15 * 60 * 1000, name: 'forgot' }),
  async (req, res, next) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body)
      await service.requestPasswordReset(email)
      // Always 204, whether or not the address exists. See the service comment.
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)

authRoutes.post(
  '/reset-password',
  rateLimit({ limit: 10, windowMs: 15 * 60 * 1000, name: 'reset' }),
  async (req, res, next) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body)
      await service.resetPassword(token, password, req.ip)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)

authRoutes.post(
  '/accept-invite',
  rateLimit({ limit: 10, windowMs: 15 * 60 * 1000, name: 'invite' }),
  async (req, res, next) => {
    try {
      const { token, password } = acceptInviteSchema.parse(req.body)
      await service.acceptInvite(token, password, req.ip)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)

authRoutes.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)
    await service.changePassword(
      req.auth!.user.id,
      currentPassword,
      newPassword,
      req.auth!.sessionId,
      req.ip,
    )
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
