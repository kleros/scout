export interface SendResult {
  ok: boolean
  /** Worth trying again later (rate limit, provider outage). */
  retryable?: boolean
  /** The destination no longer exists; stop sending to it. */
  gone?: boolean
  error?: string
}

/** Sends one email through Resend's HTTP API, with RFC 8058 one-click unsubscribe headers. */
export const sendEmail = async (
  config: { resendApiKey: string; from: string },
  {
    to,
    subject,
    html,
    text,
    unsubscribeUrl,
  }: {
    to: string
    subject: string
    html: string
    text: string
    unsubscribeUrl?: string
  },
): Promise<SendResult> => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject,
        html,
        text,
        headers: unsubscribeUrl
          ? {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            }
          : undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) return { ok: true }
    const detail = (await response.text()).slice(0, 300)
    return {
      ok: false,
      retryable: response.status === 429 || response.status >= 500,
      error: `Resend answered HTTP ${response.status}: ${detail}`,
    }
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
