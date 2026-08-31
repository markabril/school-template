import { mailer } from '../../lib/mailer.js'
import { logger } from '../../lib/logger.js'
import { templates, type TemplateName } from './templates.js'
import { claimNext, markSent, markFailed } from './outbox.service.js'

const TICK_MS = 5_000

let running = false
let timer: NodeJS.Timeout | undefined

/**
 * Drains the outbox one message per tick.
 *
 * One at a time on purpose. Free Gmail throttles bursts and will temporarily
 * suspend an account that suddenly sends hundreds of messages, so a slow
 * trickle is the point rather than a limitation — a bulk invite run is meant
 * to take days (docs/architecture.md §6).
 */
async function tick(): Promise<void> {
  if (running) return
  running = true
  try {
    const job = await claimNext()
    if (!job) return

    const render = templates[job.template as TemplateName]
    if (!render) {
      await markFailed(job.id, job.attempts, `Unknown template: ${job.template}`)
      return
    }

    try {
      const mail = render(job.payload as never)
      await mailer.send({
        to: job.toEmail,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      })
      await markSent(job.id)
      logger.info({ id: job.id, template: job.template, to: job.toEmail }, 'mail sent')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await markFailed(job.id, job.attempts, message)
      logger.warn({ id: job.id, attempts: job.attempts + 1, err: message }, 'mail send failed')
    }
  } catch (err) {
    logger.error({ err }, 'outbox tick failed')
  } finally {
    running = false
  }
}

export function startOutboxWorker(): void {
  if (timer) return
  timer = setInterval(() => void tick(), TICK_MS)
  timer.unref()
  logger.info({ tickMs: TICK_MS }, 'outbox worker started')
}

export function stopOutboxWorker(): void {
  if (timer) clearInterval(timer)
  timer = undefined
}
