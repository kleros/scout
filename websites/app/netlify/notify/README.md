# Scout notifications

Notifies Scout users about activity on items they take part in: challenges,
evidence ("comments"), rulings, appeal funding and deadlines, court period
changes and outcomes. Users sign in with their wallet (SIWE) and pick channels:
the in-app bell, email, Telegram and browser push.

It runs as Netlify Functions next to the app, once switched on (see
[Switching it on](#switching-it-on)):

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
| New evidence from the other side (one alert per burst, see below)     | the submitter and challenger themselves, while disputed | urgent               |
| Any other new evidence (a stranger's, their own side's)               | everyone involved in the item, except the author      | important              |
| Appealed, final outcome                                               | both sides and participants                           | important              |
| Court moved to commit / vote                                          | both sides                                            | soft                   |
| Crowdfunding progress, receipts, rewards paid                         | the relevant party                                    | soft                   |
| Anything on an item you follow                                        | followers                                             | as above, never urgent |

Channel levels ("urgent only", "important and urgent", "everything", "off")
apply per channel; soft categories can be silenced entirely. Everything also
lands in the in-app inbox.

**Nobody else's words leave the app.** Anyone can post evidence on any item,
for the price of gas. So emails, Telegram messages and push notifications
carry only fixed wording, the item's name and a link to it on Scout; what
someone wrote (evidence, a challenge or removal reason) is quoted only in the
app's bell. "The other side" means the requester or challenger of the
dispute, or someone who crowdfunded their side: evidence from anyone else is
never urgent. Evidence posted on a request that is already resolved is not
announced at all, and each recipient gets at most 3 evidence alerts a day
per item by email, Telegram or push; later ones stay in the bell.

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

## Switching it on

The service ships dark: merged but off. Two build-time flags turn it on, each
only when set to exactly `true`:

| Flag                       | Netlify scope | What it does                                                                                                                                                                                               |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOTIFY_ENABLED`           | Builds        | Keeps the three functions in the deploy. Otherwise the build's last step (`scripts/notify-prune.mjs`) deletes them, so there is no `/api/notify` and nothing runs on a schedule.                           |
| `REACT_APP_NOTIFY_ENABLED` | Builds        | Turns on the app's side: the bell, Settings → Notifications, prompts and follow buttons. Otherwise the app never calls `/api/notify`, never registers the service worker and looks as it did before. |

Set both or neither. With only the app's flag, every page load asks a missing
API for its configuration; with only the server's, the schedules run every
minute with nobody using them. Set them for the Production context, plus any
branch deploy used to try the service.

## Setup (Netlify)

Set these environment variables for the site:

| Variable                             | Notes                                                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOTIFY_DATABASE_URL`                | Postgres connection string. Use the **pooled** URL (Netlify DB / Neon, or Supabase transaction pooler). Required: `NETLIFY_DATABASE_URL` and `DATABASE_URL` are not used. Tables are created on first use. |
| `NOTIFY_SESSION_SECRET`              | 32+ random characters (`openssl rand -hex 32`). Signs sessions and email links.                                                                                             |
| `NOTIFY_SITE_URL`                    | Canonical site origin, e.g. `https://scout-app.kleros.io` (defaults to Netlify's `URL`).                                                                                    |
| `REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT` | Already set for the app; reused as the indexer URL (or set `NOTIFY_INDEXER_URL`).                                                                                           |
| `NOTIFY_GNOSIS_RPC_URLS`             | Optional, comma-separated. Defaults to public endpoints.                                                                                                                    |

**Secrets.** `NOTIFY_DATABASE_URL`, `NOTIFY_SESSION_SECRET`, `RESEND_API_KEY`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` and `VAPID_PRIVATE_KEY` must
be:

- scoped to the **Production** deploy context only, and to the **Functions**
  scope only (the build never needs them);
- marked **Contains secret values**;
- kept from deploy previews of pull requests from forks: set the site's
  sensitive variable policy to **Require approval** (or deploy them without
  sensitive variables).

A deploy preview runs the pull request's own function code with every
variable its context can read, and this repository takes pull requests from
outside contributors.

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

Abuse limits (anyone can make wallets, so none of these is per wallet only):

- 120 API requests per minute per IP (Netlify's rate limit).
- New accounts: 5 a day per network and 100 a day overall. A network is an
  IPv4 address or an IPv6 /64, stored only as a hash keyed with
  `NOTIFY_SESSION_SECRET`.
- Verification emails: at most once a minute and 5 a day per wallet, 3 a day
  per inbox (`a.b+x@gmail.com` counts as `ab@gmail.com`), 20 an hour per
  email domain, 10 a day per network and 50 an hour overall. Reaching the
  overall limit logs a warning worth alerting on.
- Per account: 50 followed items, 10 watched addresses, 10 browsers, and
  evidence reads for the 300 most recent items (kept only for accounts that
  can be notified somewhere: a confirmed email, Telegram or a browser).
- Push endpoints only at the browsers' push services.

The numbers are constants in `store.ts` (`SIGNUP_LIMITS`, `EMAIL_SEND_LIMITS`,
`MAX_FOLLOWS`, …) and `src/utils/cases/reads.ts` (`READS_KEPT`).

## Enabling: checklist

The service is merged dark. Before setting the two flags in Production:

1. **Decide to run it.** It needs an owner for abuse reports,
   deliverability, privacy requests and incidents, and has a running cost:
   the two scheduled functions (every minute: about 87,600 runs a month,
   250-600 Netlify credits at 10 credits per GB-hour), one bell poll a
   minute per signed-in tab, an always-on Postgres and the Resend volume.
   Consider every 5 minutes instead (`schedule` in
   `netlify/functions/notify-*.mts`; appeal windows last hours).
2. **Secrets.** Scope every notification secret to Production and Functions
   only, mark it secret, and set fork deploy previews to require approval
   (see [Setup](#setup-netlify)). `NOTIFY_SESSION_SECRET`: 32+ random
   characters; rotating it signs everyone out and voids every email link.
3. **Database.** A dedicated, always-on Postgres (Neon's free tier is not
   enough), through its pooled URL in `NOTIFY_DATABASE_URL`, with a
   least-privilege role, backups and a size alert.
4. **Email.** Resend on a dedicated subdomain (for example
   `notify.kleros.io`) with SPF, DKIM and DMARC, so `kleros.io`'s reputation
   is not at stake; `NOTIFY_EMAIL_FROM` on that subdomain.
5. **Telegram.** A bot owned by a Kleros account; register its webhook once
   with `scripts/notify-telegram-webhook.mjs`.
6. **Push.** Generate the VAPID keys once and never rotate them silently:
   new keys break every existing subscription.
7. **Privacy policy.** Name the processors (Netlify, the Postgres host,
   Resend, Telegram, the browsers' push services, the RPC providers), what
   is stored, the retention ([Data and privacy](#data-and-privacy)), and
   the upload of which items' evidence a wallet has read.
8. **Monitoring.** Alert on function errors, send volumes and failure
   rates, database size, and the warnings logged when verification emails
   or new accounts reach their service-wide limits.
9. **Try it first** on a branch deploy (both flags, its own database and
   bot, secrets scoped to that branch) and check what could not be checked
   locally: that Netlify enforces the API's `rateLimit`, that
   `/api/notify/*` reaches the function before the SPA's `/*` redirect,
   what an unhandled function error returns, that the scheduled runs stay
   within 30 s, and real email, Telegram and push delivery (iPhone
   included).
10. **Roll out one channel at a time:** the in-app bell first (no channel
    variables set), then push, Telegram and email.
11. **Switch on:** `NOTIFY_ENABLED=true` and `REACT_APP_NOTIFY_ENABLED=true`
    for Production (Builds scope), then redeploy. To switch off, remove both
    and redeploy: the functions and their schedules go away, and the app
    stops calling them.

## Local development

```sh
yarn notify:dev    # API on 127.0.0.1:8788, in-memory Postgres (PGlite)
REACT_APP_NOTIFY_ENABLED=true NOTIFY_API_URL=http://127.0.0.1:8788 yarn start   # app, proxying /api/notify
```

The local API listens on 127.0.0.1 only. From `.env` it reads only `NOTIFY_*`
settings and `REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT`; channel credentials
(`RESEND_*`, `TELEGRAM_*`, `VAPID_*`) must be set in the command's own
environment, and it warns when they are: with them it sends real messages.
Set `NOTIFY_DEV_WATCH=1` to also run the watcher and delivery loops against
the live indexer.

`yarn test` runs the unit tests, including this service against PGlite.

## Data and privacy

Stored per account, until the user deletes it ("Delete my notification
data" in the app removes all of it at once):

- wallet address, preferences, and when it last signed in;
- optional watched addresses and followed items;
- email address (with its confirmation state), Telegram chat id and
  username, browser push endpoints;
- for accounts that can be notified somewhere, how far they read each item's
  evidence (the 300 most recent items), uploaded from the browser on sign-in.

Pruned automatically (hourly, by the watcher):

- notifications and their delivery records: after 90 days;
- an email address never confirmed: once its 24-hour link expires;
- a Telegram link never completed: once its 15-minute link expires;
- verification email and new-account rate-limit records: after 2 days;
- used sign-in nonces: once they could no longer be used.

Accounts themselves are not deleted for inactivity. Signing out ends every
session of the account.

Third parties: Netlify (functions), the Postgres host, Resend (recipient
address and message), Telegram (chat id and message), the browsers' push
services (encrypted payloads), Scout's indexer and Gnosis RPC providers
(public chain data; a smart-account sign-in sends the address and the signed
message's hash to the first `NOTIFY_GNOSIS_RPC_URLS` endpoint).
