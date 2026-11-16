// Registers the Telegram bot webhook for a deployment (run once per site URL):
//   TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… node scripts/notify-telegram-webhook.mjs https://scout-app.kleros.io
const [siteUrl] = process.argv.slice(2)
const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
if (!siteUrl || !token || !secret) {
  console.error(
    'Usage: TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… node scripts/notify-telegram-webhook.mjs <site-url>',
  )
  process.exit(1)
}
const url = `${siteUrl.replace(/\/+$/, '')}/api/notify/telegram/webhook`
const response = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  },
)
console.log(url, await response.json())
