import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '../src/db/client.js'

// Each test file runs in its own fork with a fresh in-memory database.
migrate(db, { migrationsFolder: './drizzle' })
