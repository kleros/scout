import type { SendResult } from './email'

const api = (token: string, method: string) =>
  `https://api.telegram.org/bot${token}/${method}`

export const sendTelegram = async (
  botToken: string,
  chatId: string,
  html: string,
  button?: { text: string; url: string },
): Promise<SendResult> => {
  try {
    const response = await fetch(api(botToken, 'sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: button ? { inline_keyboard: [[button]] } : undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) return { ok: true }
    const body = await response.json().catch(() => ({}))
    // 403: the user blocked the bot or deleted the chat.
    if (response.status === 403)
      return { ok: false, gone: true, error: body.description ?? 'Forbidden' }
    return {
      ok: false,
      retryable: response.status === 429 || response.status >= 500,
      error: `Telegram answered HTTP ${response.status}: ${body.description ?? ''}`,
    }
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
