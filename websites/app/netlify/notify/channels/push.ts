import webpush from 'web-push'
import type { Urgency } from '../preferences'
import type { SendResult } from './email'

const PUSH_URGENCY: Record<Urgency, 'high' | 'normal' | 'low'> = {
  urgent: 'high',
  important: 'normal',
  soft: 'low',
}

export const sendPush = async (
  vapid: { publicKey: string; privateKey: string; subject: string },
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: Record<string, unknown>,
  urgency: Urgency,
): Promise<SendResult> => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      {
        vapidDetails: vapid,
        TTL: urgency === 'soft' ? 6 * 3600 : 48 * 3600,
        urgency: PUSH_URGENCY[urgency],
        timeout: 10_000,
      },
    )
    return { ok: true }
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410)
      return {
        ok: false,
        gone: true,
        error: `Subscription expired (${status})`,
      }
    return {
      ok: false,
      retryable: !status || status === 429 || status >= 500,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
