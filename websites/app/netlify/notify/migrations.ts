import type { Db } from './db'

/**
 * Schema migrations, applied in order on first use by any function instance.
 * Embedded as strings so the function bundler always ships them.
 */
export const MIGRATIONS: { version: string; sql: string }[] = [
  {
    version: '001_init',
    sql: `
      create table users (
        id bigserial primary key,
        address text not null unique check (address ~ '^0x[0-9a-f]{40}$'),
        preferences jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        last_seen_at timestamptz not null default now()
      );

      -- Extra addresses a user wants notifications for (e.g. a second wallet).
      create table watched_addresses (
        user_id bigint not null references users(id) on delete cascade,
        address text not null check (address ~ '^0x[0-9a-f]{40}$'),
        created_at timestamptz not null default now(),
        primary key (user_id, address)
      );
      create index watched_addresses_address on watched_addresses(address);

      -- Items a user follows without being a party (indexer LItem id: itemID@registry).
      create table follows (
        user_id bigint not null references users(id) on delete cascade,
        item_id text not null,
        created_at timestamptz not null default now(),
        primary key (user_id, item_id)
      );
      create index follows_item on follows(item_id);

      create table emails (
        user_id bigint primary key references users(id) on delete cascade,
        email text not null,
        verified_at timestamptz,
        token_hash text,
        token_expires_at timestamptz,
        sent_at timestamptz,
        sends_in_window int not null default 0,
        window_started_at timestamptz,
        unsubscribed_at timestamptz
      );

      -- Verification emails sent, by hashed recipient, for limits no number of wallets can get around.
      create table email_sends (
        id bigserial primary key,
        email_hash text not null,
        sent_at timestamptz not null default now()
      );
      create index email_sends_recipient on email_sends(email_hash, sent_at);
      create index email_sends_time on email_sends(sent_at);

      create table telegram_links (
        user_id bigint primary key references users(id) on delete cascade,
        chat_id text unique,
        username text,
        token_hash text unique,
        token_expires_at timestamptz,
        linked_at timestamptz
      );

      create table push_subscriptions (
        id bigserial primary key,
        user_id bigint not null references users(id) on delete cascade,
        endpoint text not null unique,
        p256dh text not null,
        auth text not null,
        created_at timestamptz not null default now()
      );
      create index push_subscriptions_user on push_subscriptions(user_id);

      create table notifications (
        id bigserial primary key,
        user_id bigint not null references users(id) on delete cascade,
        dedup_key text not null,
        kind text not null,
        urgency text not null check (urgency in ('urgent', 'important', 'soft')),
        title text not null,
        body text not null,
        url text,
        item_id text,
        deadline timestamptz,
        -- For alerts about an item's evidence: the newest piece's time (unix
        -- seconds). Reading the evidence up to it reads the alert.
        evidence_at bigint,
        created_at timestamptz not null default now(),
        read_at timestamptz,
        unique (user_id, dedup_key)
      );
      create index notifications_user_created on notifications(user_id, created_at desc);
      create index notifications_unread on notifications(user_id) where read_at is null;

      create table deliveries (
        id bigserial primary key,
        notification_id bigint not null references notifications(id) on delete cascade,
        channel text not null check (channel in ('email', 'telegram', 'push')),
        status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
        attempts int not null default 0,
        next_attempt_at timestamptz not null default now(),
        last_error text,
        sent_at timestamptz,
        unique (notification_id, channel)
      );
      create index deliveries_due on deliveries(next_attempt_at) where status = 'pending';

      -- Sign-in nonces already used (hashed), until they would have expired.
      create table used_nonces (
        nonce_hash text primary key,
        expires_at timestamptz not null
      );

      create table watcher_state (
        id text primary key,
        cursor_ts bigint not null,
        cursor_block bigint not null,
        updated_at timestamptz not null default now()
      );

      -- How far each user has read each item's evidence, so "new" counts
      -- follow them across devices.
      create table evidence_reads (
        user_id bigint not null references users(id) on delete cascade,
        item_id text not null,
        seen_until bigint not null,
        updated_at timestamptz not null default now(),
        primary key (user_id, item_id)
      );
    `,
  },
]

let ensured: Promise<void> | undefined

/** Applies pending migrations once per function instance. */
export const ensureSchema = (db: Db): Promise<void> => {
  if (!ensured) {
    ensured = migrate(db).then(
      () => undefined,
      (error) => {
        ensured = undefined
        throw error
      },
    )
  }
  return ensured
}

export const migrate = async (db: Db): Promise<string[]> => {
  await db.query(
    `create table if not exists schema_migrations (
       version text primary key,
       applied_at timestamptz not null default now()
     )`,
  )
  const applied: string[] = []
  await db.transaction(async (tx) => {
    // Serializes concurrent cold starts; released at commit.
    await tx.query(`select pg_advisory_xact_lock(7426159)`)
    const rows = await tx.query<{ version: string }>(
      `select version from schema_migrations`,
    )
    const done = new Set(rows.map((row) => row.version))
    for (const migration of MIGRATIONS) {
      if (done.has(migration.version)) continue
      await tx.exec(migration.sql)
      await tx.query(`insert into schema_migrations (version) values ($1)`, [
        migration.version,
      ])
      applied.push(migration.version)
    }
  })
  return applied
}
