import { env } from '../../env.js'

export interface RenderedMail {
  subject: string
  text: string
  html: string
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function layout(bodyHtml: string): string {
  // Inline styles and a table-free single column: school inboxes are a mix of
  // Gmail, Outlook and phone clients, and anything cleverer degrades badly.
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#FAF7F2;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A1A1A">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E6E0D8;border-radius:8px;padding:28px">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8A6A20;font-weight:700">Cherished Moments School</p>
${bodyHtml}
<hr style="border:0;border-top:1px solid #E6E0D8;margin:24px 0">
<p style="margin:0;font-size:12px;color:#5A5550">If you were not expecting this email you can ignore it. Our website is <a href="${env.PUBLIC_ORIGIN}" style="color:#6E1D2B">${env.PUBLIC_ORIGIN}</a>.</p>
</div></body></html>`
}

/**
 * Every template states the school's real website address.
 *
 * Mail is sent from a free @gmail.com account (docs/architecture.md §6), which
 * to a careful recipient is indistinguishable from phishing. We cannot fix that
 * with markup — only a real domain fixes it — but naming the site the reader
 * can independently verify is the least we can do.
 */
export const templates = {
  invite({ displayName, url }: { displayName: string; url: string }): RenderedMail {
    const subject = 'Your Cherished Moments School account'
    const text = `Hello ${displayName},

An account has been created for you on the Cherished Moments School website.

Set your password here (the link works once, and expires in 7 days):
${url}

If you were not expecting this, you can ignore this email.`
    return {
      subject,
      text,
      html: layout(
        `<h1 style="margin:8px 0 12px;font-size:20px;color:#6E1D2B">Set up your account</h1>
<p style="margin:0 0 16px;line-height:1.55">Hello ${escapeHtml(displayName)}, an account has been created for you on the school website.</p>
<p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#6E1D2B;color:#FAF7F2;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600">Set your password</a></p>
<p style="margin:0;font-size:13px;color:#5A5550;line-height:1.5">This link works once and expires in 7 days.</p>`,
      ),
    }
  },

  passwordReset({ displayName, url }: { displayName: string; url: string }): RenderedMail {
    const subject = 'Reset your password'
    const text = `Hello ${displayName},

Someone asked to reset the password for your Cherished Moments School account.

Reset it here (the link works once, and expires in 1 hour):
${url}

If this wasn't you, ignore this email — your password has not changed.`
    return {
      subject,
      text,
      html: layout(
        `<h1 style="margin:8px 0 12px;font-size:20px;color:#6E1D2B">Reset your password</h1>
<p style="margin:0 0 16px;line-height:1.55">Hello ${escapeHtml(displayName)}, someone asked to reset your password.</p>
<p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#6E1D2B;color:#FAF7F2;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600">Reset password</a></p>
<p style="margin:0;font-size:13px;color:#5A5550;line-height:1.5">This link works once and expires in 1 hour. If this wasn't you, ignore this email — your password has not changed.</p>`,
      ),
    }
  },
} as const

export type TemplateName = keyof typeof templates
