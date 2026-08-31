import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { eq } from 'drizzle-orm'
import { db, closeDb } from '../db/client.js'
import { users } from '../db/schema/index.js'
import { hashPassword } from '../lib/hash.js'
import { passwordSchema } from '../modules/auth/auth.schema.js'
import { audit } from '../lib/audit.js'

/**
 * Bootstrap the first super_admin.
 *
 * There is no public signup anywhere in this system, so without this script a
 * fresh install has no way in at all. Deliberately interactive and local-only:
 * an HTTP endpoint that creates an administrator is a backdoor no matter how
 * carefully it is guarded.
 *
 *   npm run create-admin --workspace=api
 */
/** `--email x` / `--email=x`. Lets the script run unattended in provisioning. */
function flag(name: string): string | undefined {
  const args = process.argv.slice(2)
  const exact = args.indexOf(`--${name}`)
  if (exact !== -1 && args[exact + 1]) return args[exact + 1]
  const inline = args.find((a) => a.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

async function main() {
  const preset = {
    email: flag('email'),
    name: flag('name'),
    password: flag('password'),
  }
  // Only open a TTY prompt for what was not supplied. A fully-flagged
  // invocation never touches stdin, so it works in CI and over ssh.
  const needsPrompt = !preset.email || !preset.name || !preset.password
  const rl = needsPrompt ? createInterface({ input: stdin, output: stdout }) : null

  try {
    const email = (preset.email ?? (await rl!.question('Email: '))).trim().toLowerCase()
    const displayName = (preset.name ?? (await rl!.question('Display name: '))).trim()
    const password = preset.password ?? (await rl!.question('Password (min 12 chars): '))

    if (preset.password) {
      // A password on the command line lands in shell history and `ps` output.
      // Fine for a throwaway dev database; say so rather than let it pass.
      stdout.write('Warning: --password is visible in shell history. Dev use only.\n')
    }

    if (!email.includes('@')) throw new Error('That is not an email address')
    if (!displayName) throw new Error('Display name is required')

    const parsed = passwordSchema.safeParse(password)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid password')

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((r) => r[0])

    if (existing) throw new Error('An account with that email already exists')

    const created = await db
      .insert(users)
      .values({
        email,
        displayName,
        role: 'super_admin',
        status: 'active',
        passwordHash: await hashPassword(password),
      })
      .returning()
      .then((r) => r[0]!)

    audit({
      actorUserId: created.id,
      action: 'user.bootstrap_admin',
      entity: 'user',
      entityId: created.id,
    })

    stdout.write(`\nCreated super_admin ${email}\nSign in at /admin/login\n`)
  } finally {
    rl?.close()
    closeDb()
  }
}

// No closeDb() here: the `finally` in main() already closed it, and closing
// better-sqlite3 twice crashes the process rather than throwing.
main().catch((err) => {
  stdout.write(`\n${err instanceof Error ? err.message : String(err)}\n`)
  process.exitCode = 1
})
