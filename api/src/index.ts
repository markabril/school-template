import { createApp } from './app.js'
import { env } from './env.js'
import { logger } from './lib/logger.js'
import { closeDb } from './db/client.js'
import { startOutboxWorker, stopOutboxWorker } from './modules/outbox/outbox.worker.js'
import { purgeExpired } from './modules/auth/auth.service.js'

const app = createApp()

/**
 * Bind an explicit host. Two reasons, both learned the hard way:
 *
 * 1. Windows will happily let a second process bind a port another process
 *    already holds on a different address family, with no EADDRINUSE. You then
 *    get a server that answers on ::1 but not 127.0.0.1 while a completely
 *    different app answers the other — which looks like "the API is flaky"
 *    rather than "there are two APIs".
 * 2. In development the API has no business being reachable from the network.
 *    In production it sits behind Caddy/nginx on loopback anyway.
 */
const server = app.listen(env.PORT, env.HOST, () => {
  logger.info({ host: env.HOST, port: env.PORT, env: env.NODE_ENV }, 'api listening')
  startOutboxWorker()
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.fatal(
      { host: env.HOST, port: env.PORT },
      'port already in use — another dev server is probably running. Change PORT in api/.env.',
    )
    process.exit(1)
  }
  throw err
})

// Expired sessions and single-use tokens are dead weight and a liability.
const purgeTimer = setInterval(
  () => void purgeExpired().catch((err) => logger.error({ err }, 'purge failed')),
  60 * 60 * 1000,
)
purgeTimer.unref()

/** Close the DB cleanly so WAL is checkpointed rather than left for recovery. */
function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  stopOutboxWorker()
  clearInterval(purgeTimer)
  server.close(() => {
    closeDb()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
