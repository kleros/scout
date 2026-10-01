# Scout notifications

Notifies Scout users about activity on items they take part in: challenges,
evidence ("comments"), rulings, appeal funding and deadlines, court period
changes and outcomes. Users sign in with their wallet (SIWE) and pick channels:
the in-app bell, email, Telegram and browser push.

It runs as Netlify Functions next to the app:

| Function         | Trigger         | Job                                                |
| ---------------- | --------------- | -------------------------------------------------- |
| `notify-api`     | `/api/notify/*` | Sign-in, preferences, channels, inbox, follows     |
| `notify-watcher` | every minute    | Detects new activity and queues notifications      |
| `notify-deliver` | every minute    | Sends queued email / Telegram / push, with retries |

## How detection works

The watcher keeps a cursor at a Gnosis block and, each minute, processes every
block up to the latest one that is both **finalized** and **indexed**:

- Registry activity comes from Scout's Envio indexer (the app's own data
  source): new requests, challenges, evidence, rulings, appeal funding,
  appeals and resolutions, found by their timestamps.
- Court period changes (`NewPeriod`) and paid rewards (`RewardWithdrawn`) come
  from Gnosis logs.
- Light Curate has no "side fully funded" event, so funding is derived from
  each round's `hasPaid*` flags and last funding time.

Every notification has a stable key per user and is stored together with its
deliveries in one transaction, so replaying a window (after a crash or a
manual cursor reset) queues each alert exactly once: never twice, and never
without its email, Telegram or push delivery. The first run starts at the
current block; history is not replayed.

Deadline reminders are stateless: when an appeal deadline minus 12 h / 6 h /
3 h / 1 h falls inside the processed window and the side has not funded yet,
its parties get a reminder.

## What gets sent

| Event                                                                 | Who                                                   | Urgency                |
| --------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| Your submission / removal request was challenged                      | requester                                             | urgent                 |
| Someone requested removal of an item you submitted                    | original submitter                                    | urgent                 |
| Jurors ruled against you: raise X by the loser deadline               | losing side                                           | urgent                 |
| Jurors ruled for you: watch for an appeal                             | winning side                                          | important              |
| **The other side fully funded its appeal: fund X by the end or lose** | side that won the vote                                | urgent                 |
| Appeal deadline reminders                                             | side that still has to fund                           | urgent                 |
| New evidence from the other side (one alert per burst, see below)     | the submitter and challenger themselves               | urgent                 |
| New evidence                                                          | everyone else involved in the item, except the author | important              |
| Appealed, final outcome                                               | both sides and participants                           | important              |
| Court moved to commit / vote                                          | both sides                                            | soft                   |
| Crowdfunding progress, receipts, rewards paid                         | the relevant party                                    | soft                   |
| Anything on an item you follow                                        | followers                                             | as above, never urgent |

Channel levels ("urgent only", "important and urgent", "everything", "off")
apply per channel; soft categories can be silenced entirely. Everything also
lands in the in-app inbox.

Evidence is posted one piece per transaction, often several in a row. Each
author's burst is announced once, 10 minutes after its last piece, with all
of its pieces; nobody gets an alert about evidence they already read on the
item page. An email, Telegram message or push still queued when its evidence
is read in the app is dropped; one already handed to its provider can't be
recalled. How far each user has read each item's evidence is stored with
their account, so "new" counts and the bell agree on every device: reading
up to a piece reads the alerts about evidence up to that piece, while alerts
about newer evidence stay unread.

## Always in view: My Profile

Alerts are a one-time nudge, so the app also shows every open case from the
current state of the registries until it is resolved:

- **My Profile** lists what the connected wallet has at stake: red when it
  must act or lose (e.g. the other side funded its appeal), amber for a
  decision before a deadline (appeal a ruling, challenge a removal, add
  evidence), then what is in progress.
- **The item page** shows the red and amber ones for that item, and the
  **My Profile** link gets a badge with their count.

It runs in the browser on `attention.ts` with this service's indexer and
chain modules, so it applies the same rules as the alerts, and it works
without signing up for notifications.

## Wallets that can't receive payouts

Light Curate pays deposits, refunds and rewards with `.send`, which gives the
recipient 2300 gas and ignores failures, so xDAI sent to a wallet that needs
more (such as a Safe) stays in the registry. Wherever xDAI goes in (submit,
challenge, removal, appeal funding), on the profile and in the notification
settings, the app simulates that transfer to the wallet (an `eth_call` from
the registry with 23300 gas and 1 wei, confirmed by two providers) and shows
a strong warning when it fails. It doesn't block: some smart wallets can
receive it.

## Setup (Netlify)

Set these environment variables for the site (Functions scope):

| Variable                             | Notes                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOTIFY_DATABASE_URL`                | Postgres connection string. Use the **pooled** URL (Netlify DB / Neon, or Supabase transaction pooler). `NETLIFY_DATABASE_URL` is picked up automatically. Tables are created on first use. |
| `NOTIFY_SESSION_SECRET`              | 32+ random characters (`openssl rand -hex 32`). Signs sessions and email links.                                                                                                             |
| `NOTIFY_SITE_URL`                    | Canonical site origin, e.g. `https://scout-app.kleros.io` (defaults to Netlify's `URL`).                                                                                                    |
| `REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT` | Already set for the app; reused as the indexer URL (or set `NOTIFY_INDEXER_URL`).                                                                                                           |
| `NOTIFY_GNOSIS_RPC_URLS`             | Optional, comma-separated. Defaults to public endpoints.                                                                                                                                    |

Channels are enabled only when all of their variables are set:

- **Email** (Resend): `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM` (e.g.
  `Kleros Scout <notifications@kleros.io>`). Verify the sending domain in
  Resend (SPF, DKIM, DMARC). Emails carry RFC 8058 one-click unsubscribe.
- **Telegram**: create a bot with @BotFather, then set `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_BOT_USERNAME` and `TELEGRAM_WEBHOOK_SECRET` (random string) and
  register the webhook once per site:
  `node scripts/notify-telegram-webhook.mjs https://scout-app.kleros.io`
- **Browser push**: `npx web-push generate-vapid-keys`, then set
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`
  (`mailto:…`). On iPhone, push only works once Scout is added to the home
  screen.

Scheduled functions only run on the published production deploy.

Abuse limits: 120 API requests per minute per IP; verification emails at most
once a minute and 5 a day per wallet, 3 a day per recipient address and 200
an hour overall; 10 browsers per user; push endpoints only at the browsers'
push services.

## Local development

```sh
yarn notify:dev                                   # API on :8788, in-memory Postgres (PGlite)
NOTIFY_API_URL=http://localhost:8788 yarn start   # app, proxying /api/notify
```

Set `NOTIFY_DEV_WATCH=1` to also run the watcher and delivery loops against
the live indexer. Channel credentials in `.env` are used if present.

`yarn test` runs the unit tests, including this service against PGlite.

## Data and privacy

Stored per user: wallet address, optional watched addresses, followed items,
email (with verification state), Telegram chat id, push endpoints,
preferences, how far they read each item's evidence (the 2,000 most recent
items), and notifications (pruned after 90 days). "Delete my
notification data" in the app removes all of it.
