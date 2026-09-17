import { db, sqlite } from '../src/db/client.js'
import { users } from '../src/db/schema/index.js'

/** Empty every application table. Call in beforeEach. */
export function truncateAll(): void {
  const tables = sqlite
    .prepare(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name != '__drizzle_migrations'",
    )
    .all() as Array<{ name: string }>

  sqlite.pragma('foreign_keys = OFF')
  for (const t of tables) sqlite.prepare(`delete from "${t.name}"`).run()
  sqlite.pragma('foreign_keys = ON')
}

export async function makeAdmin() {
  return db
    .insert(users)
    .values({
      email: 'admin@test.local',
      displayName: 'Test Admin',
      role: 'super_admin',
      status: 'active',
      passwordHash: null,
    })
    .returning()
    .then((r) => r[0]!)
}

export const actorOf = (user: { id: string }) => ({ id: user.id, ip: '127.0.0.1' })
