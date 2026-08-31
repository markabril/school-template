import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, closeDb } from './client.js'
import { logger } from '../lib/logger.js'

/**
 * Applies committed migrations from ./drizzle. Run on deploy, before the app
 * starts. Never hand-edit a migration that has already been applied anywhere.
 */
try {
  migrate(db, { migrationsFolder: './drizzle' })
  logger.info('migrations applied')
} catch (err) {
  logger.error({ err }, 'migration failed')
  process.exitCode = 1
} finally {
  closeDb()
}
