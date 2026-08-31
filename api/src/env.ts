import 'dotenv/config'
import { z } from 'zod'

/**
 * Env is parsed once, at boot, and the process refuses to start if it is wrong.
 * A missing secret should fail loudly on `npm run dev`, not silently at 2am when
 * someone tries to reset their password.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // 4100/3100 rather than the usual 4000/3000: this machine already runs other
  // dev servers on those, and on Windows the collision is silent (see index.ts).
  PORT: z.coerce.number().int().positive().default(4100),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_PATH: z.string().default('./data/school.db'),
  PUBLIC_ORIGIN: z.string().url().default('http://localhost:3000'),

  REVALIDATE_SECRET: z.string().min(8),
  REVALIDATE_URL: z.string().url().default('http://localhost:3000/__revalidate'),
  SECRET_KEY: z.string().min(8),

  MAIL_TRANSPORT: z.enum(['file', 'smtp']).default('file'),
  MAIL_FROM_NAME: z.string().default('Cherished Moments School'),
  MAIL_FROM_ADDRESS: z.string().email().default('noreply@example.com'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  console.error('\nCopy api/.env.example to api/.env and fill it in.')
  process.exit(1)
}

export const env = parsed.data

if (env.NODE_ENV === 'production') {
  const weak = ['dev-only-change-me']
  if (weak.includes(env.SECRET_KEY) || weak.includes(env.REVALIDATE_SECRET)) {
    console.error('Refusing to start: default development secrets are set in production.')
    process.exit(1)
  }
  if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_USER) {
    console.error('Refusing to start: MAIL_TRANSPORT=smtp but SMTP_USER is empty.')
    process.exit(1)
  }
}

export const isDev = env.NODE_ENV === 'development'
export const isProd = env.NODE_ENV === 'production'
