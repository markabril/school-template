import { pino } from 'pino'
import { env, isDev } from '../env.js'

/**
 * Redaction list is not optional. This app will eventually log requests that
 * carry session cookies, invite tokens and, in Release 2, student data.
 * Add to this list whenever a new secret-bearing field appears.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.tokenHash',
      'SMTP_PASS',
    ],
    censor: '[redacted]',
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
})
