import { mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { env } from '../env.js'
import { logger } from '../lib/logger.js'
import * as schema from './schema/index.js'

// `:memory:` is a SQLite sentinel, not a path — resolving it would produce a
// file literally named ":memory:", which is also invalid on Windows.
const isMemory = env.DATABASE_PATH === ':memory:'
const dbPath = isMemory ? ':memory:' : path.resolve(env.DATABASE_PATH)
if (!isMemory) mkdirSync(path.dirname(dbPath), { recursive: true })

export const sqlite = new Database(dbPath)

/**
 * These pragmas are the difference between SQLite handling a school and SQLite
 * falling over. Set on every connection, not once at creation.
 */
sqlite.pragma('journal_mode = WAL') // concurrent readers alongside one writer
sqlite.pragma('foreign_keys = ON') // OFF by default in SQLite — a real trap
sqlite.pragma('busy_timeout = 5000') // wait for the writer instead of throwing
sqlite.pragma('synchronous = NORMAL') // safe with WAL, much faster than FULL

logger.info({ dbPath }, 'sqlite connected')

export const db = drizzle(sqlite, { schema })

export type Db = typeof db

export function closeDb(): void {
  sqlite.close()
}
