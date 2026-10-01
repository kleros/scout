import { escapeHtml } from './http'
import type { Urgency } from './preferences'

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

/** "Deadline: Sun, Sep 27, 2026, 18:27 UTC" (seconds dropped, so never later than the real one). */
const deadlineLine = (deadline: string | null) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  return `Deadline: ${date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}, ${date.toISOString().slice(11, 16)} UTC`
}

export const renderEmail = (
  message: Message,
  {
    siteUrl,
    unsubscribeUrl,
    address,
  }: { siteUrl: string; unsubscribeUrl: string; address: string },
) => {
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
    `<b>${escapeHtml(message.title)}</b>`,
    escapeHtml(message.body),
    deadline && `<i>${escapeHtml(deadline)}</i>`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const renderPush = (message: Message) => ({
  title: message.title,
  body:
    message.body.length > 180 ? `${message.body.slice(0, 179)}…` : message.body,
  url: message.url,
  tag: `scout-${message.id}`,
  urgency: message.urgency,
})
