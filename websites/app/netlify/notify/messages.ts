import { escapeHtml } from './http'
import type { Urgency } from './preferences'

/**
 * What email, Telegram and push carry: fixed wording, the item's name and a
 * link to it on Scout. Never what anyone wrote (evidence, challenge and
 * removal reasons): that is a notification's `detail`, shown in the app only.
 */
export interface Message {
  id: number
  kind: string
  urgency: Urgency
  title: string
  body: string
  url: string | null
  deadline: string | null
}

export const settingsUrl = (siteUrl: string) => `${siteUrl}/home#notifications`

/**
 * An item's name is its submitter's own text (a token's name, a domain, a
 * tag, a repository), and mail and chat apps turn whatever looks like a
 * link into one. So email, Telegram and push write links and domains in a
 * title or body inertly ("hxxps://", "evil[.]com"); the app's bell shows
 * them as they are, as plain text. Scout's own links are not touched.
 */
export const defang = (text: string) =>
  text
    .replace(/\b(h)tt(ps?):\/\//gi, '$1xx$2://')
    .replace(/(?<=[a-z0-9])\.(?=[a-z])/gi, '[.]')

/** "Deadline: Sun, Sep 27, 2026, 18:27 UTC" (seconds dropped, so never later than the real one). */
const deadlineLine = (deadline: string | null) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  return `Deadline: ${date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}, ${date.toISOString().slice(11, 16)} UTC`
}

export const renderEmail = (
  original: Message,
  {
    siteUrl,
    unsubscribeUrl,
    address,
  }: { siteUrl: string; unsubscribeUrl: string; address: string },
) => {
  const message = {
    ...original,
    title: defang(original.title),
    body: defang(original.body),
  }
  const subject = (
    message.urgency === 'urgent' && !/^action needed\b/i.test(message.title)
      ? `Action needed: ${message.title}`
      : message.title
  ).slice(0, 150)
  const deadline = deadlineLine(message.deadline)
  const lines = [message.title, '', message.body]
  if (deadline) lines.push('', deadline)
  if (message.url) lines.push('', `Open in Scout: ${message.url}`)
  lines.push(
    '',
    '—',
    `You're receiving this because ${address} enabled email notifications on Kleros Scout.`,
    `Notification settings: ${settingsUrl(siteUrl)}`,
    `Unsubscribe from all Scout emails: ${unsubscribeUrl}`,
  )
  const text = lines.join('\n')
  const accent = message.urgency === 'urgent' ? '#E5484D' : '#4D5EDF'
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border-top:4px solid ${accent}">
    <tr><td style="padding:24px 28px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#6e6e73">Kleros Scout${message.urgency === 'urgent' ? ' · action needed' : ''}</p>
      <h1 style="margin:0 0 12px;font-size:18px;line-height:1.35">${escapeHtml(message.title)}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55">${escapeHtml(message.body)}</p>
      ${deadline ? `<p style="margin:0 0 16px;font-size:14px;font-weight:600;color:${accent}">${escapeHtml(deadline)}</p>` : ''}
      ${message.url ? `<a href="${escapeHtml(message.url)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#1c1c1e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">Open in Scout</a>` : ''}
    </td></tr>
    <tr><td style="padding:16px 28px 24px;border-top:1px solid #e5e5ea;font-size:12px;line-height:1.5;color:#6e6e73">
      You're receiving this because ${escapeHtml(address)} enabled email notifications on Kleros Scout.<br>
      <a href="${escapeHtml(settingsUrl(siteUrl))}" style="color:#6e6e73">Notification settings</a> ·
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6e6e73">Unsubscribe</a>
    </td></tr>
  </table>
</body></html>`
  return { subject, text, html }
}

export const renderVerificationEmail = (
  verifyUrl: string,
  address: string,
) => ({
  subject: 'Confirm your email for Kleros Scout notifications',
  text: `Confirm this address to receive Scout notifications for ${address}:\n\n${verifyUrl}\n\nThe link expires in 24 hours. If you didn't ask for this, ignore this email.`,
  html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px"><tr><td style="padding:24px 28px">
    <h1 style="margin:0 0 12px;font-size:18px">Confirm your email</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55">Confirm this address to receive Kleros Scout notifications for ${escapeHtml(address)}.</p>
    <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#1c1c1e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">Confirm email</a>
    <p style="margin:16px 0 0;font-size:12px;color:#6e6e73">The link expires in 24 hours. If you didn't ask for this, ignore this email.</p>
  </td></tr></table></body></html>`,
})

/** Telegram HTML (only <b>, <i>, <a> and escaped text). */
export const renderTelegram = (message: Message) => {
  const deadline = deadlineLine(message.deadline)
  return [
    `<b>${escapeHtml(defang(message.title))}</b>`,
    escapeHtml(defang(message.body)),
    deadline && `<i>${escapeHtml(deadline)}</i>`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const renderPush = (message: Message) => {
  const body = defang(message.body)
  return {
    title: defang(message.title),
    body: body.length > 180 ? `${body.slice(0, 179)}…` : body,
    url: message.url,
    tag: `scout-${message.id}`,
    urgency: message.urgency,
  }
}
