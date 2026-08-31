import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../env.js'
import { logger } from './logger.js'
import { newId } from './ids.js'

export interface OutgoingMail {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Mail sits behind this interface from day one even though there is exactly
 * one real transport today.
 *
 * The school is on free Gmail (~500 recipients/day). When they get a domain,
 * Google Workspace for Education is free for accredited schools and the cap
 * effectively disappears — at which point this becomes a config change rather
 * than a refactor. See docs/architecture.md §6.
 */
export interface Mailer {
  send(mail: OutgoingMail): Promise<void>
}

const MAIL_DIR = path.resolve('data/mail')

/**
 * Dev transport: writes .eml files to disk and never touches the network.
 * Nobody should need live SMTP credentials to work on this app, and nobody
 * should be able to accidentally email a real parent from a dev machine.
 */
class FileMailer implements Mailer {
  async send(mail: OutgoingMail): Promise<void> {
    await mkdir(MAIL_DIR, { recursive: true })
    const from = `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_ADDRESS}>`
    const eml = [
      `From: ${from}`,
      `To: ${mail.to}`,
      `Subject: ${mail.subject}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      `Content-Type: ${mail.html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      mail.html ?? mail.text,
    ].join('\r\n')

    const file = path.join(MAIL_DIR, `${newId()}.eml`)
    await writeFile(file, eml, 'utf8')
    logger.info({ to: mail.to, subject: mail.subject, file }, 'mail written to disk (dev transport)')
  }
}

/**
 * SMTP transport. Deliberately not wired up in Phase 0 — there is nothing to
 * send yet, and adding credentials before there is an outbox to throttle them
 * is how you get an account suspended during the first bulk invite run.
 * Phase 1 implements this alongside the outbox worker.
 */
class SmtpMailer implements Mailer {
  async send(_mail: OutgoingMail): Promise<void> {
    throw new Error(
      'SMTP transport is not implemented until Phase 1 (outbox worker). Use MAIL_TRANSPORT=file.',
    )
  }
}

export const mailer: Mailer = env.MAIL_TRANSPORT === 'smtp' ? new SmtpMailer() : new FileMailer()
