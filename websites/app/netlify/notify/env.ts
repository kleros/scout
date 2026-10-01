/**
 * Server configuration for the Scout notification service (Netlify
 * Functions). Channels are optional: each one is enabled only when all of its
 * variables are set.
 */

export interface NotifyEnv {
  databaseUrl: string
  /** HMAC key for session, nonce, verification and unsubscribe tokens. */
  sessionSecret: string
  /** Canonical origin used in links, e.g. https://scout-app.kleros.io */
  siteUrl: string
  /** Scout's Envio HyperIndex GraphQL endpoint. */
  indexerUrl: string
  /** Gnosis JSON-RPC endpoints, tried in order. */
  gnosisRpcUrls: string[]
  /** Ethereum mainnet endpoints, used to verify smart-account (ERC-1271) sign-ins. */
  mainnetRpcUrls: string[]
  email?: { resendApiKey: string; from: string }
  telegram?: { botToken: string; botUsername: string; webhookSecret: string }
  push?: { publicKey: string; privateKey: string; subject: string }
}

const list = (value: string | undefined, fallback: string[]) =>
  value
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : fallback

export const readEnv = (
  env: Record<string, string | undefined> = process.env,
): NotifyEnv => {
  const databaseUrl =
    env.NOTIFY_DATABASE_URL ?? env.NETLIFY_DATABASE_URL ?? env.DATABASE_URL
  const sessionSecret = env.NOTIFY_SESSION_SECRET
  const siteUrl = (env.NOTIFY_SITE_URL ?? env.URL ?? '').replace(/\/+$/, '')
  const indexerUrl =
    env.NOTIFY_INDEXER_URL ?? env.REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT
  const missing = [
    !databaseUrl && 'NOTIFY_DATABASE_URL (or NETLIFY_DATABASE_URL)',
    (!sessionSecret || sessionSecret.length < 32) &&
      'NOTIFY_SESSION_SECRET (32+ characters)',
    !siteUrl && 'NOTIFY_SITE_URL',
    !indexerUrl && 'NOTIFY_INDEXER_URL (or REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT)',
  ].filter(Boolean)
  if (missing.length > 0) {
    throw new Error(
      `Notification service is not configured. Missing: ${missing.join(', ')}.`,
    )
  }

  const config: NotifyEnv = {
    databaseUrl: databaseUrl as string,
    sessionSecret: sessionSecret as string,
    siteUrl,
    indexerUrl: indexerUrl as string,
    gnosisRpcUrls: list(env.NOTIFY_GNOSIS_RPC_URLS, [
      'https://gnosis-rpc.publicnode.com',
      'https://rpc.gnosischain.com',
    ]),
    mainnetRpcUrls: list(env.NOTIFY_MAINNET_RPC_URLS, [
      'https://ethereum-rpc.publicnode.com',
      'https://eth.drpc.org',
    ]),
  }
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL_FROM) {
    config.email = {
      resendApiKey: env.RESEND_API_KEY,
      from: env.NOTIFY_EMAIL_FROM,
    }
  }
  if (
    env.TELEGRAM_BOT_TOKEN &&
    env.TELEGRAM_BOT_USERNAME &&
    env.TELEGRAM_WEBHOOK_SECRET
  ) {
    config.telegram = {
      botToken: env.TELEGRAM_BOT_TOKEN,
      botUsername: env.TELEGRAM_BOT_USERNAME.replace(/^@/, ''),
      webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    }
  }
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
    config.push = {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT,
    }
  }
  return config
}
