import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'node:crypto'
import { logger } from './lib/logger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { loadSession } from './middleware/session.js'
import { csrfGuard } from './middleware/csrf.js'
import { sqlite } from './db/client.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { userRoutes } from './modules/users/users.routes.js'
import { mediaRoutes } from './modules/media/media.routes.js'
import { MEDIA_ROOT } from './modules/media/media.service.js'
import { pageRoutes, publicPageRoutes } from './modules/pages/pages.routes.js'
import { postRoutes, publicPostRoutes } from './modules/posts/posts.routes.js'
import { eventRoutes, publicEventRoutes } from './modules/events/events.routes.js'
import { siteRoutes, publicSiteRoutes } from './modules/site/site.routes.js'

export function createApp() {
  const app = express()

  // Behind Caddy/nginx in production. Without this, req.ip is the proxy and
  // per-IP rate limiting silently limits the whole internet as one client.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  // Request id + one log line per request. Enough to trace a report of
  // "it broke" without logging bodies.
  app.use((req, res, next) => {
    const id = randomUUID()
    res.setHeader('x-request-id', id)
    const started = Date.now()
    res.on('finish', () => {
      logger.info(
        {
          id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          ms: Date.now() - started,
          user: req.auth?.user.id,
        },
        'request',
      )
    })
    next()
  })

  /**
   * Uploaded files, served straight from disk above the session middleware.
   *
   * Public on purpose: these are photos and documents for a public website, and
   * routing every image through auth would mean the browser cannot cache them.
   * Paths are ULID-derived, so nothing is guessable, but treat anything here as
   * world-readable — do not put a document in the media library that should not
   * be. (Release 2's report cards will NOT use this path.)
   *
   * `immutable` is safe because a ULID filename never changes content: an edit
   * produces a new upload with a new id.
   */
  app.use(
    '/media',
    express.static(MEDIA_ROOT, {
      maxAge: '1y',
      immutable: true,
      index: false,
      dotfiles: 'deny',
      // Never let a stray .html in the media directory execute in our origin.
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  )

  app.get('/api/health', (_req, res) => {
    // Touch the DB — a health check that does not is just checking that Node
    // is running, which is never the thing that broke.
    const row = sqlite.prepare('select 1 as ok').get() as { ok: number } | undefined
    res.json({ status: 'ok', db: row?.ok === 1, at: new Date().toISOString() })
  })

  // Order matters: identify the caller, then refuse forged cross-origin
  // writes, then route. csrfGuard must sit above every mutating endpoint
  // rather than being remembered per-router.
  app.use(loadSession)
  app.use(csrfGuard)

  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/media', mediaRoutes)

  // Public content reads, mounted before the admin routers so they stay
  // unauthenticated — this is what the website itself calls.
  app.use('/api/content/pages', publicPageRoutes)
  app.use('/api/content/posts', publicPostRoutes)
  app.use('/api/content/events', publicEventRoutes)
  app.use('/api/content', publicSiteRoutes)

  app.use('/api/pages', pageRoutes)
  app.use('/api/posts', postRoutes)
  app.use('/api/events', eventRoutes)
  app.use('/api/site', siteRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
