import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createSiweMessage } from 'viem/siwe'
import { createApi } from './api'
import {
  READS_KEPT,
  READS_PER_REQUEST,
  readsAhead,
  uploadReads,
} from '../../src/utils/cases/reads'
import type { Chain } from './chain'
import type { Db } from './db'
import type { NotifyEnv } from './env'
import { detectItemEvents } from './events'
import { formatDeadline } from './items'
import type {
  IndexedItem,
  IndexedRequest,
  IndexedRound,
  Indexer,
} from './indexer'
import { renderEmail, renderPush, renderTelegram } from './messages'
import { migrate } from './migrations'
import { pgliteDb } from './pglite'
import { plan, reminderEvents } from './plan'
import {
  createService,
  deliverDue,
  planContext,
  runWatcherTick,
} from './service'
import * as store from './store'
import { ipBucket, ipKey, sha256Hex } from './tokens'

// ---------------------------------------------------------------------------
// Test database (PGlite: Postgres compiled to WASM)
// ---------------------------------------------------------------------------

let pg: PGlite
let db: Db

before(async () => {
  pg = new PGlite()
  db = pgliteDb(pg)
  await migrate(db)
})
after(async () => pg.close())
beforeEach(async () => {
  await db.query(
    `truncate users, watched_addresses, follows, emails, email_sends, telegram_links, push_subscriptions, notifications, deliveries, watcher_state, evidence_reads, used_nonces, signups restart identity cascade`,
  )
})

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

// ---------------------------------------------------------------------------
// Fixtures: an Address Tags item that gets challenged and appealed
// ---------------------------------------------------------------------------

const REGISTRY = '0x66260c69d03837016d88c9877e61e08ef74c59f2'
const ITEM_ID = `0x${'ab'.repeat(32)}`
const ALICE = `0x${'11'.repeat(20)}` // submitter
const BOB = `0x${'22'.repeat(20)}` // challenger
const CAROL = `0x${'33'.repeat(20)}` // crowdfunds Alice's appeal
const DAVE = `0x${'44'.repeat(20)}` // follows the item

const APPEAL_START = 10_000
const APPEAL_END = APPEAL_START + 194_400 // 54 h
const LOSER_DEADLINE = APPEAL_START + 97_200

const round = (
  index: number,
  fields: Partial<IndexedRound> = {},
): IndexedRound => ({
  id: `${ITEM_ID}@${REGISTRY}-0-${index}`,
  creationTime: '0',
  ruling: 'None',
  rulingTime: '0',
  appealPeriodStart: '0',
  appealPeriodEnd: '0',
  appealed: false,
  appealedAt: null,
  hasPaidRequester: false,
  hasPaidChallenger: false,
  amountPaidRequester: '0',
  amountPaidChallenger: '0',
  lastFundedRequester: '0',
  lastFundedChallenger: '0',
  contributions: [],
  ...fields,
})

const request = (fields: Partial<IndexedRequest> = {}): IndexedRequest => ({
  id: `${ITEM_ID}@${REGISTRY}-0`,
  requestType: 'RegistrationRequested',
  requester: ALICE,
  challenger: BOB,
  disputed: true,
  disputeID: '1013',
  arbitrator: '0x9c1da9a04925bdfdedf0f6421bc7eea8305f9002',
  arbitratorExtraData: '0x',
  submissionTime: '1000',
  challengeTime: '2000',
  txHashChallenge: '0xc1',
  creationTx: '0xa1',
  resolved: false,
  resolutionTime: '0',
  disputeOutcome: 'None',
  numberOfRounds: '2',
  evidenceGroup_id: `1@${REGISTRY}`,
  evidenceGroup: {
    evidences: [
      {
        id: 'e0',
        party: BOB,
        number: '0',
        timestamp: '2000',
        title: 'Not a contract',
        description: 'The address is an EOA.',
        txHash: '0xc1',
      },
      {
        id: 'e1',
        party: ALICE,
        number: '1',
        timestamp: '3000',
        title: 'It is a contract',
        description: 'See the explorer.',
        txHash: '0xe2',
      },
    ],
  },
  rounds: [
    round(0, {
      contributions: [
        { contributor: ALICE, side: '1' },
        { contributor: BOB, side: '2' },
      ],
    }),
    round(1, {
      ruling: 'Reject',
      appealPeriodStart: String(APPEAL_START),
      appealPeriodEnd: String(APPEAL_END),
      lastFundedRequester: '30000',
      hasPaidRequester: true,
      amountPaidRequester: '151200000000000000000',
      contributions: [
        { contributor: ALICE, side: '1' },
        { contributor: CAROL, side: '1' },
      ],
    }),
  ],
  ...fields,
})

const item = (req: IndexedRequest = request()): IndexedItem => ({
  id: `${ITEM_ID}@${REGISTRY}`,
  itemID: ITEM_ID,
  registryAddress: REGISTRY,
  status: 'RegistrationRequested',
  data: '/ipfs/x',
  key0: `eip155:1:${ALICE}`,
  key1: null,
  key2: null,
  props: [
    { label: 'Contract Address', value: `eip155:1:0x${'55'.repeat(20)}` },
    { label: 'Public Name Tag', value: 'Router' },
  ],
  requests: [req],
})

const env: NotifyEnv = {
  databaseUrl: 'pglite',
  sessionSecret: 'x'.repeat(40),
  siteUrl: 'https://scout.test',
  indexerUrl: 'https://indexer.test/graphql',
  gnosisRpcUrls: ['https://rpc.test'],
  email: { resendApiKey: 're_test', from: 'Scout <scout@test>' },
  telegram: {
    botToken: 'bot-token',
    botUsername: 'ScoutTestBot',
    webhookSecret: 'hook-secret',
  },
}

const fakeChain = {
  appealFunding: async () => ({
    winner: 100_800_000_000_000_000_000n,
    loser: 151_200_000_000_000_000_000n,
    shared: 100_800_000_000_000_000_000n,
  }),
  challengePeriod: async () => 302_400,
  disputePeriod: async () => ({ period: 'evidence', deadline: 150_000 }),
} as unknown as Chain

const service = (
  overrides: { indexer?: Partial<Indexer>; chain?: Partial<Chain> } = {},
) =>
  createService(env, db, {
    indexer: overrides.indexer as Indexer,
    chain: { ...fakeChain, ...overrides.chain } as Chain,
  })

/** Alice (email), Bob (Telegram), Carol (no channel), Dave (follows the item, email). */
const seedUsers = async () => {
  const alice = await store.upsertUser(db, ALICE)
  const bob = await store.upsertUser(db, BOB)
  const carol = await store.upsertUser(db, CAROL)
  const dave = await store.upsertUser(db, DAVE)
  await db.query(
    `insert into emails (user_id, email, verified_at) values ($1, 'alice@test', now()), ($2, 'dave@test', now())`,
    [alice.id, dave.id],
  )
  await db.query(
    `insert into telegram_links (user_id, chat_id, linked_at) values ($1, '777', now())`,
    [bob.id],
  )
  await store.follow(db, dave.id, `${ITEM_ID}@${REGISTRY}`)
  return { alice, bob, carol, dave }
}

const planWindow = async (from: number, to: number, now = to) => {
  const svc = service()
  const ctx = planContext(svc, now)
  const snapshot = item()
  return plan(
    detectItemEvents(snapshot, from, to),
    await reminderEvents([snapshot], from, to, ctx),
    ctx,
  )
}

describe('event detection', () => {
  it('turns indexer snapshots into keyed events per time window', () => {
    const kinds = (from: number, to: number) =>
      detectItemEvents(item(), from, to).map((e) => e.kind)
    assert.deepEqual(kinds(0, 1500), ['submitted'])
    // The challenger's reason arrives with the challenge, not as separate evidence.
    assert.deepEqual(kinds(1500, 2500), ['challenged'])
    // Evidence is announced once its author has paused for 10 minutes.
    assert.deepEqual(kinds(2500, 3500), [])
    assert.deepEqual(kinds(3500, 3700), ['evidence'])
    assert.deepEqual(kinds(9500, 10_500), ['appealable'])
    assert.deepEqual(kinds(29_500, 30_500), ['funded'])
    assert.deepEqual(kinds(40_000, 50_000), [])
  })

  it('announces each burst of evidence once, with all of its pieces', () => {
    const piece = (id: string, party: string, timestamp: number) => ({
      id,
      party,
      number: id,
      timestamp: String(timestamp),
      title: `Piece ${id}`,
      description: '',
      txHash: `0xfeed${id}`,
    })
    const burst = item(
      request({
        evidenceGroup: {
          evidences: [
            piece('b1', BOB, 5_000),
            piece('b2', BOB, 5_300),
            piece('a1', ALICE, 5_400),
            piece('b3', BOB, 5_800),
            // More than 10 minutes after b3: a new burst.
            piece('b4', BOB, 7_000),
          ],
        },
      }),
    )
    const found = (from: number, to: number) =>
      detectItemEvents(burst, from, to).flatMap((e) =>
        e.kind === 'evidence' ? [e.pieces.map((p) => p.id).join()] : [],
      )
    // Bob keeps posting, so nothing is announced until he pauses.
    assert.deepEqual(found(5_000, 6_300), ['a1'])
    assert.deepEqual(found(6_300, 6_500), ['b1,b2,b3'])
    assert.deepEqual(found(6_500, 7_700), ['b4'])
  })

  it('reports an appeal instead of funding when both sides complete in the window', () => {
    const appealed = request({
      rounds: [
        round(0),
        round(1, {
          ruling: 'Reject',
          appealPeriodStart: String(APPEAL_START),
          appealPeriodEnd: String(APPEAL_END),
          hasPaidRequester: true,
          hasPaidChallenger: true,
          lastFundedRequester: '30000',
          lastFundedChallenger: '30000',
          appealed: true,
          appealedAt: '30000',
        }),
        round(2),
      ],
    })
    assert.deepEqual(
      detectItemEvents(item(appealed), 29_000, 31_000).map((e) => e.kind),
      ['appealed'],
    )
  })

  it('does not report funding for rounds that were appealed after the window', () => {
    const later = request({
      rounds: [
        round(0),
        round(1, {
          ruling: 'Reject',
          appealPeriodStart: String(APPEAL_START),
          appealPeriodEnd: String(APPEAL_END),
          hasPaidRequester: true,
          hasPaidChallenger: true,
          lastFundedRequester: '30000',
          lastFundedChallenger: '31000',
          appealed: true,
          appealedAt: '31000',
        }),
        round(2),
      ],
    })
    assert.deepEqual(detectItemEvents(item(later), 29_500, 30_500), [])
    assert.deepEqual(
      detectItemEvents(item(later), 30_500, 31_500).map((e) => e.kind),
      ['appealed'],
    )
  })

  it('reports partial crowdfunding as a contribution', () => {
    const partial = request({
      rounds: [
        round(0),
        round(1, {
          ruling: 'Reject',
          appealPeriodStart: String(APPEAL_START),
          appealPeriodEnd: String(APPEAL_END),
          lastFundedRequester: '20000',
          amountPaidRequester: '50000000000000000000',
        }),
      ],
    })
    const [event] = detectItemEvents(item(partial), 19_000, 21_000)
    assert.equal(event.kind, 'contribution')
  })
})

describe('notification planning', () => {
  it('alerts the submitter urgently when challenged, and gives the challenger a receipt', async () => {
    const users = await seedUsers()
    const notes = await planWindow(1500, 2500)
    const alice = notes.find((n) => n.userId === users.alice.id)
    const bob = notes.find((n) => n.userId === users.bob.id)
    const dave = notes.find((n) => n.userId === users.dave.id)
    assert.equal(alice?.urgency, 'urgent')
    assert.match(alice?.title ?? '', /was challenged/)
    // The challenger's reason is quoted in the app only.
    assert.match(alice?.body ?? '', /Read the challenger's reason/)
    assert.doesNotMatch(alice?.body ?? '', /Not a contract/)
    assert.match(alice?.detail ?? '', /^The challenger says: “Not a contract”/)
    assert.deepEqual(alice?.channels, ['email'])
    assert.equal(bob?.kind, 'challenge_live')
    assert.deepEqual(bob?.channels, []) // soft: in-app only by default
    assert.equal(dave?.urgency, 'important')
  })

  it('notes the evidence each alert about evidence covers', async () => {
    const users = await seedUsers()
    const challenge = await planWindow(1500, 2500)
    const evidence = await planWindow(3500, 3700)
    // The challenge reason (posted with it), and the burst's last piece.
    assert.equal(
      challenge.find((n) => n.userId === users.alice.id)?.evidenceAt,
      2000,
    )
    assert.equal(
      evidence.find((n) => n.userId === users.bob.id)?.evidenceAt,
      3000,
    )
    // A receipt for your own challenge has nothing to read.
    assert.equal(
      challenge.find((n) => n.userId === users.bob.id)?.evidenceAt,
      undefined,
    )
  })

  it('quotes the challenge description when its title is only a label', async () => {
    const users = await seedUsers()
    const labelled = request({
      evidenceGroup: {
        evidences: [
          {
            id: 'e0',
            party: BOB,
            number: '0',
            timestamp: '2000',
            title: 'Challenge Justification',
            description: 'The contract is not deployed on Base.',
            txHash: '0xc1',
          },
        ],
      },
    })
    const ctx = planContext(service(), 2500)
    const notes = await plan(
      detectItemEvents(item(labelled), 1500, 2500),
      [],
      ctx,
    )
    const alice = notes.find((n) => n.userId === users.alice.id)
    assert.match(
      alice?.detail ?? '',
      /The challenger says: “The contract is not deployed on Base\.”/,
    )
    assert.doesNotMatch(alice?.detail ?? '', /Challenge Justification/)
  })

  it('tells everyone else involved about new evidence, but not its author', async () => {
    const users = await seedUsers()
    const notes = await planWindow(3500, 3700)
    assert.ok(!notes.some((n) => n.userId === users.alice.id))
    assert.equal(notes.find((n) => n.userId === users.bob.id)?.kind, 'evidence')
    // Urgent for the challenger, who can answer; news for a follower.
    assert.equal(
      notes.find((n) => n.userId === users.bob.id)?.urgency,
      'urgent',
    )
    assert.equal(
      notes.find((n) => n.userId === users.dave.id)?.urgency,
      'important',
    )
    assert.match(
      notes.find((n) => n.userId === users.bob.id)?.body ?? '',
      /The submitter posted evidence/,
    )
    // It opens the item's Evidence tab.
    assert.match(
      notes.find((n) => n.userId === users.bob.id)?.url ?? '',
      /\?tab=evidence$/,
    )
  })

  it('does not alert about evidence the user already read', async () => {
    const users = await seedUsers()
    await store.setEvidenceReads(db, users.bob.id, {
      [`${ITEM_ID}@${REGISTRY}`]: 3_000,
    })
    const notes = await planWindow(3500, 3700)
    assert.ok(!notes.some((n) => n.userId === users.bob.id))
    assert.ok(notes.some((n) => n.userId === users.dave.id))
  })

  it('tells the losing side how much to raise and by when', async () => {
    const users = await seedUsers()
    const notes = await planWindow(9500, 10_500)
    const alice = notes.find((n) => n.userId === users.alice.id)
    const bob = notes.find((n) => n.userId === users.bob.id)
    assert.equal(alice?.kind, 'ruling_lost')
    assert.equal(alice?.urgency, 'urgent')
    assert.match(alice?.body ?? '', /151 xDAI/)
    assert.equal(alice?.deadline?.getTime(), LOSER_DEADLINE * 1000)
    assert.equal(bob?.kind, 'ruling_won')
    assert.match(bob?.body ?? '', /or you lose despite this ruling/)
  })

  it('warns the side that won the vote as soon as the other side funds its appeal', async () => {
    const users = await seedUsers()
    const notes = await planWindow(29_500, 30_500)
    const bob = notes.find((n) => n.userId === users.bob.id)
    assert.equal(bob?.kind, 'opponent_funded')
    assert.equal(bob?.urgency, 'urgent')
    assert.match(bob?.title ?? '', /Action needed/)
    assert.match(bob?.body ?? '', /Fund 101 xDAI by .* or you lose the case/)
    assert.equal(bob?.deadline?.getTime(), APPEAL_END * 1000)
    assert.deepEqual(bob?.channels, ['telegram'])
    assert.equal(
      notes.find((n) => n.userId === users.carol.id)?.kind,
      'side_funded',
    )
  })

  it('reminds the winner before the deadline while they are still unfunded', async () => {
    const users = await seedUsers()
    const twelveHoursBefore = APPEAL_END - 12 * 3600
    const notes = await planWindow(
      twelveHoursBefore - 30,
      twelveHoursBefore + 30,
    )
    const bob = notes.find((n) => n.userId === users.bob.id)
    assert.equal(bob?.kind, 'appeal_reminder')
    assert.equal(
      bob?.dedupKey,
      `reminder:${ITEM_ID}@${REGISTRY}-0-1:challenger:12h`,
    )
    assert.match(bob?.title ?? '', /12 h left to defend/)
    assert.ok(!notes.some((n) => n.userId === users.alice.id))
  })

  it('respects silenced categories and channel levels', async () => {
    const users = await seedUsers()
    await store.setPreferences(db, users.dave.id, {
      channels: { email: 'urgent', telegram: 'important', push: 'urgent' },
      categories: {
        periods: true,
        funding: true,
        receipts: true,
        rewards: true,
        follows: false,
      },
    })
    const notes = await planWindow(1500, 2500)
    assert.ok(!notes.some((n) => n.userId === users.dave.id))
    const alice = notes.find((n) => n.userId === users.alice.id)
    await store.setPreferences(db, users.alice.id, {
      channels: { email: 'off', telegram: 'important', push: 'urgent' },
      categories: {
        periods: true,
        funding: true,
        receipts: true,
        rewards: true,
        follows: true,
      },
    })
    const again = await planWindow(1500, 2500)
    assert.deepEqual(alice?.channels, ['email'])
    assert.deepEqual(
      again.find((n) => n.userId === users.alice.id)?.channels,
      [],
    )
  })

  it('also notifies watched addresses (e.g. a second wallet of the user)', async () => {
    const erin = await store.upsertUser(db, `0x${'66'.repeat(20)}`)
    await store.addWatchedAddress(db, erin.id, ALICE)
    const notes = await planWindow(1500, 2500)
    assert.equal(notes.find((n) => n.userId === erin.id)?.kind, 'challenged')
  })
})

describe('third-party text', () => {
  const EVE = `0x${'77'.repeat(20)}` // a stranger to the item
  const PHISH = 'Your deposit is frozen, recover it at https://kleros-refund.example'
  const evidence = (id: string, party: string, timestamp: number, txHash = `0xe${id}`) => ({
    id,
    party,
    number: id,
    timestamp: String(timestamp),
    title: PHISH,
    description: PHISH,
    txHash,
  })
  const withEvidence = (...evidences: ReturnType<typeof evidence>[]) =>
    item(request({ evidenceGroup: { evidences } }))
  const planFor = async (snapshot: IndexedItem, from: number, to: number) =>
    plan(
      detectItemEvents(snapshot, from, to),
      [],
      planContext(service(), to),
    )

  it('never goes out by email, Telegram or push: only in the bell', async () => {
    const users = await seedUsers()
    const snapshot = withEvidence(
      evidence('c', BOB, 2000, '0xc1'), // the challenge reason
      evidence('s', EVE, 3000),
    )
    const notes = [
      ...(await planFor(snapshot, 1500, 2500)),
      ...(await planFor(snapshot, 3500, 3700)),
    ]
    assert.ok(notes.length > 4)
    for (const note of notes) {
      assert.doesNotMatch(`${note.title} ${note.body}`, /kleros-refund|deposit is frozen/)
      assert.ok(!note.url?.includes('kleros-refund'))
    }
    assert.ok(notes.some((note) => note.detail?.includes(PHISH)))

    await store.insertNotifications(db, notes)
    const sent: string[] = []
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      sent.push(`${String(input)} ${String(init?.body)}`)
      return new Response('{"id":"1","ok":true}', { status: 200 })
    }) as typeof fetch
    const totals = await deliverDue(service(), 5_000)
    assert.ok(totals.sent >= 3, JSON.stringify(totals))
    assert.ok(sent.some((request) => request.includes('resend')))
    assert.ok(sent.some((request) => request.includes('telegram')))
    for (const request of sent) assert.doesNotMatch(request, /kleros-refund|deposit is frozen/)

    // The bell shows the quote.
    const bell = await store.listNotifications(db, users.alice.id, { limit: 10 })
    assert.ok(bell.some((n) => n.detail?.includes(PHISH)))

    // Push renders what the delivery worker claims, which has no quote.
    await store.insertNotifications(db, [
      {
        userId: users.alice.id,
        dedupKey: 'push-check',
        kind: 'challenged',
        urgency: 'urgent',
        title: 'Challenged',
        body: 'Read it on Scout.',
        detail: PHISH,
        channels: ['push'],
      },
    ])
    const [claimed] = await store.claimDueDeliveries(db, 10)
    assert.equal(claimed.channel, 'push')
    assert.ok(!('detail' in claimed))
    assert.doesNotMatch(
      JSON.stringify(renderPush({ ...claimed, id: claimed.notificationId })),
      /kleros-refund/,
    )
  })

  it('is not announced on a resolved request', () => {
    const settled = item(
      request({
        resolved: true,
        resolutionTime: '3100',
        disputeOutcome: 'Reject',
        evidenceGroup: {
          evidences: [evidence('c', BOB, 2000, '0xc1'), evidence('s', EVE, 3000)],
        },
      }),
    )
    assert.deepEqual(
      detectItemEvents(settled, 3500, 3700).map((e) => e.kind),
      [],
    )
    assert.deepEqual(
      detectItemEvents(withEvidence(evidence('s', EVE, 3000)), 3500, 3700).map(
        (e) => e.kind,
      ),
      ['evidence'],
    )
  })

  it('is urgent only for the parties, and only when the other side posted it', async () => {
    const users = await seedUsers()
    const urgency = async (author: string) => {
      const notes = await planFor(
        withEvidence(evidence('c', BOB, 2000, '0xc1'), evidence('x', author, 3000)),
        3500,
        3700,
      )
      const of = (userId: number) => notes.find((n) => n.userId === userId)
      return {
        alice: of(users.alice.id)?.urgency,
        bob: of(users.bob.id)?.urgency,
        dave: of(users.dave.id)?.urgency,
        bobBody: of(users.bob.id)?.body,
      }
    }
    // A stranger: news for everyone.
    assert.deepEqual(await urgency(EVE), {
      alice: 'important',
      bob: 'important',
      dave: 'important',
      bobBody: 'Someone posted evidence. Read it on Scout.',
    })
    // Carol crowdfunds Alice's side: Bob, on the other side, can answer.
    assert.deepEqual(await urgency(CAROL), {
      alice: 'important',
      bob: 'urgent',
      dave: 'important',
      bobBody:
        "Someone on the submitter's side posted evidence. Read it and answer on the item page.",
    })
  })

  it('goes out at most three times a day per item and recipient; the rest stays in the bell', async () => {
    const { alice } = await seedUsers()
    const itemId = `${ITEM_ID}@${REGISTRY}`
    const alert = (dedupKey: string, kind = 'evidence', item = itemId) => ({
      userId: alice.id,
      dedupKey,
      kind,
      urgency: 'important' as const,
      title: 'New evidence',
      body: 'Someone posted evidence. Read it on Scout.',
      itemId: item,
      channels: ['email' as const],
    })
    await store.insertNotifications(db, [
      alert('e1'),
      alert('e2'),
      alert('e3'),
      alert('e4'),
    ])
    await store.insertNotifications(db, [
      alert('e5'),
      alert('other-item', 'evidence', `0x${'cd'.repeat(32)}@${REGISTRY}`),
      alert('ruling', 'ruling'),
    ])
    const queued = await db.query<{ dedup_key: string }>(
      `select n.dedup_key from notifications n join deliveries d on d.notification_id = n.id order by n.id`,
    )
    assert.deepEqual(
      queued.map((row) => row.dedup_key),
      ['e1', 'e2', 'e3', 'other-item', 'ruling'],
    )
    assert.equal(await store.unreadCount(db, alice.id), 7)
  })
})

describe('store', () => {
  it('deduplicates notifications and queues one delivery per channel', async () => {
    const { alice } = await seedUsers()
    const note = {
      userId: alice.id,
      dedupKey: 'k1',
      kind: 'test',
      urgency: 'urgent' as const,
      title: 't',
      body: 'b',
      channels: ['email' as const, 'telegram' as const],
    }
    assert.equal(await store.insertNotifications(db, [note, note]), 1)
    const [{ count }] = await db.query<{ count: number }>(
      `select count(*)::int as count from deliveries`,
    )
    assert.equal(count, 2)
    assert.equal(await store.unreadCount(db, alice.id), 1)
    await store.markRead(db, alice.id)
    assert.equal(await store.unreadCount(db, alice.id), 0)
  })

  // Fails the `nth` query matching `pattern`, including inside transactions.
  const interrupted = (inner: Db, pattern: RegExp, nth = 1): Db => {
    let seen = 0
    const wrap = (conn: Db): Db => ({
      query: async (text, params) => {
        if (pattern.test(text) && ++seen === nth) throw new Error('interrupted')
        return conn.query(text, params)
      },
      exec: (script) => conn.exec(script),
      transaction: (fn) => conn.transaction((tx) => fn(wrap(tx))),
    })
    return wrap(inner)
  }

  it('never keeps a notification without its deliveries, however a run is cut short', async () => {
    const { alice, bob } = await seedUsers()
    const note = (userId: number, dedupKey: string) => ({
      userId,
      dedupKey,
      kind: 'evidence',
      urgency: 'urgent' as const,
      title: 't',
      body: 'b',
      channels: ['email' as const, 'telegram' as const, 'push' as const],
    })
    const batch = [note(alice.id, 'a'), note(bob.id, 'b')]
    const counts = async () =>
      (
        await db.query<{ notifications: number; deliveries: number }>(
          `select (select count(*)::int from notifications) as notifications,
                  (select count(*)::int from deliveries) as deliveries`,
        )
      )[0]
    for (const [pattern, nth] of [
      [/insert into deliveries/, 1], // right after the first notification
      [/insert into deliveries/, 2], // after one notification is complete
      [/insert into notifications/, 2], // between notifications
    ] as const) {
      await db.query(
        `truncate notifications, deliveries restart identity cascade`,
      )
      await assert.rejects(
        store.insertNotifications(interrupted(db, pattern, nth), batch),
        /interrupted/,
      )
      assert.deepEqual(await counts(), { notifications: 0, deliveries: 0 })
      // The replay queues everything, once.
      assert.equal(await store.insertNotifications(db, batch), 2)
      assert.equal(await store.insertNotifications(db, batch), 0)
      assert.deepEqual(await counts(), { notifications: 2, deliveries: 6 })
    }
  })

  it('reads only the alerts about evidence up to the position read', async () => {
    const { alice } = await seedUsers()
    const itemId = `${ITEM_ID}@${REGISTRY}`
    const alert = (dedupKey: string, kind: string, evidenceAt?: number) => ({
      userId: alice.id,
      dedupKey,
      kind,
      urgency: 'urgent' as const,
      title: dedupKey,
      body: 'b',
      itemId,
      evidenceAt,
      channels: [],
    })
    await store.insertNotifications(db, [
      alert('challenge', 'challenged', 2000),
      alert('burst', 'evidence', 3000),
      // Announced once the author paused, but about pieces up to 5000.
      alert('late-burst', 'evidence', 5000),
      // Rows from before evidence times were kept: only the bell reads them.
      alert('legacy', 'evidence'),
      alert('ruling', 'ruling', 1000),
    ])
    const unread = async () =>
      (await store.listNotifications(db, alice.id, { limit: 10 }))
        .filter((n) => !n.read)
        .map((n) => n.title)
        .sort()
    // A device that read the item before any of it clears nothing.
    assert.equal(
      await store.setEvidenceReads(db, alice.id, { [itemId]: 1500 }),
      0,
    )
    assert.equal((await unread()).length, 5)
    assert.equal(
      await store.setEvidenceReads(db, alice.id, { [itemId]: 3000 }),
      2,
    )
    assert.deepEqual(await unread(), ['late-burst', 'legacy', 'ruling'])
    // A stale upload afterwards neither clears more nor moves the position back.
    assert.equal(
      await store.setEvidenceReads(db, alice.id, { [itemId]: 2500 }),
      0,
    )
    assert.deepEqual(await store.listEvidenceReads(db, alice.id), {
      [itemId]: 3000,
    })
    assert.equal(
      await store.setEvidenceReads(db, alice.id, { [itemId]: 5000 }),
      1,
    )
    assert.deepEqual(await unread(), ['legacy', 'ruling'])
  })

  it("keeps each user's most recent evidence reads only", async () => {
    const { alice } = await seedUsers()
    await db.query(
      `insert into evidence_reads (user_id, item_id, seen_until, updated_at)
       select $1, 'old-' || i, 1, now() - interval '1 day' from generate_series(1, $2) as i`,
      [alice.id, store.MAX_EVIDENCE_READS],
    )
    const itemId = `${ITEM_ID}@${REGISTRY}`
    await store.setEvidenceReads(db, alice.id, { [itemId]: 5 })
    const reads = await store.listEvidenceReads(db, alice.id)
    assert.equal(reads[itemId], 5)
    const [{ count }] = await db.query<{ count: number }>(
      `select count(*)::int as count from evidence_reads where user_id = $1`,
      [alice.id],
    )
    assert.equal(count, store.MAX_EVIDENCE_READS)
  })

  it('rate-limits verification emails', async () => {
    const { carol } = await seedUsers()
    const expires = new Date(Date.now() + 60_000)
    assert.equal(
      await store.setPendingEmail(db, carol.id, 'carol@test', 'h1', expires),
      'ok',
    )
    assert.equal(
      await store.setPendingEmail(db, carol.id, 'carol@test', 'h2', expires),
      'rate-limited',
    )
    assert.equal(await store.verifyEmailToken(db, 'h1'), carol.id)
    assert.equal((await store.getEmail(db, carol.id))?.verified, true)
  })

  it('limits verification emails per inbox, domain, network and overall, whichever wallets ask', async () => {
    const users = await seedUsers()
    const { alice, bob, carol, dave } = users
    const expires = new Date(Date.now() + 60_000)
    const send = (
      user: { id: number },
      address: string,
      options: Parameters<typeof store.setPendingEmail>[5] = {},
    ) =>
      store.setPendingEmail(db, user.id, address, `t${Math.random()}`, expires, options)
    // One Gmail inbox, however its address is spelled.
    assert.deepEqual(
      [
        await send(alice, 'Victim+1@Gmail.com'),
        await send(bob, 'v.i.c.t.i.m@googlemail.com'),
        await send(carol, 'victim+scout@gmail.com'),
        await send(dave, 'VICTIM@gmail.com'),
      ],
      ['ok', 'ok', 'ok', 'rate-limited'],
    )
    // Each limit on its own (fresh per-wallet state every time).
    const each = async (
      limits: Partial<typeof store.EMAIL_SEND_LIMITS>,
      sends: [{ id: number }, string, string | null][],
    ) => {
      await db.query(`truncate email_sends, emails`)
      const results: string[] = []
      for (const [user, address, ipHash] of sends)
        results.push(
          await send(user, address, {
            ipHash,
            limits: { ...store.EMAIL_SEND_LIMITS, ...limits },
          }),
        )
      return results
    }
    assert.deepEqual(
      await each({ perDomainPerHour: 2 }, [
        [alice, 'a@corp.test', null],
        [bob, 'b@corp.test', null],
        [carol, 'c@corp.test', null],
        [dave, 'd@other.test', null],
      ]),
      ['ok', 'ok', 'rate-limited', 'ok'],
    )
    assert.deepEqual(
      await each({ perIpPerDay: 2 }, [
        [alice, 'a@one.test', 'net-1'],
        [bob, 'b@two.test', 'net-1'],
        [carol, 'c@three.test', 'net-1'],
        [dave, 'd@four.test', 'net-2'],
      ]),
      ['ok', 'ok', 'rate-limited', 'ok'],
    )
    assert.deepEqual(
      await each({ perHour: 2 }, [
        [alice, 'a@one.test', 'net-1'],
        [bob, 'b@two.test', 'net-2'],
        [carol, 'c@three.test', 'net-3'],
      ]),
      ['ok', 'ok', 'rate-limited'],
    )
  })

  it('counts addresses by inbox, and networks by IPv4 address or IPv6 /64', () => {
    assert.deepEqual(store.canonicalEmail(' A.B+tag@GoogleMail.com '), {
      address: 'ab@gmail.com',
      domain: 'gmail.com',
    })
    assert.equal(
      store.canonicalEmail('a.b+tag@example.com').address,
      'a.b@example.com',
    )
    assert.equal(ipBucket('203.0.113.7'), '203.0.113.7')
    assert.equal(ipBucket('::ffff:203.0.113.7'), '203.0.113.7')
    assert.equal(ipBucket('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64')
    assert.equal(ipBucket('2001:0db8:0001:0002::9'), '2001:db8:1:2::/64')
    assert.equal(ipBucket('2001:db8::1'), '2001:db8:0:0::/64')
    assert.equal(ipKey('s', '2001:db8:1:2::1'), ipKey('s', '2001:db8:1:2:ffff::'))
    assert.notEqual(ipKey('s', '203.0.113.7'), ipKey('s', '203.0.113.8'))
    assert.notEqual(ipKey('s', '203.0.113.7'), ipKey('other', '203.0.113.7'))
    assert.equal(ipKey('s', undefined), null)
  })

  it('prunes what is no longer needed', async () => {
    const { alice, bob, carol, dave } = await seedUsers()
    await db.query(`truncate emails, telegram_links`)
    await db.query(
      `insert into emails (user_id, email, verified_at, token_hash, token_expires_at) values
         ($1, 'expired@test', null, 'h1', now() - interval '1 hour'),
         ($2, 'pending@test', null, 'h2', now() + interval '1 hour'),
         ($3, 'confirmed@test', now(), null, null)`,
      [alice.id, bob.id, carol.id],
    )
    await db.query(
      `insert into telegram_links (user_id, chat_id, token_hash, token_expires_at) values
         ($1, null, 't1', now() - interval '1 hour'),
         ($2, null, 't2', now() + interval '1 hour'),
         ($3, '42', null, null),
         ($4, null, null, null)`,
      [alice.id, bob.id, carol.id, dave.id],
    )
    await db.query(
      `insert into signups (ip_hash, created_at) values ('old', now() - interval '3 days'), ('new', now())`,
    )
    await store.pruneOldNotifications(db)
    const left = async (sql: string) =>
      (await db.query<{ v: string }>(sql)).map((row) => row.v).sort()
    assert.deepEqual(await left(`select email as v from emails`), [
      'confirmed@test',
      'pending@test',
    ])
    assert.deepEqual(
      await left(`select coalesce(chat_id, token_hash) as v from telegram_links`),
      ['42', 't2'],
    )
    assert.deepEqual(await left(`select ip_hash as v from signups`), ['new'])
  })

  it("keeps each user's most recent browsers only", async () => {
    const { alice } = await seedUsers()
    const add = (id: number) =>
      store.addPushSubscription(db, alice.id, {
        endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
        p256dh: 'k',
        auth: 'a',
      })
    for (let i = 0; i < store.MAX_PUSH_DEVICES + 2; i++) await add(i)
    // Re-registering the oldest browser makes it recent again.
    await add(2)
    await add(12)
    const kept = (await store.listPushSubscriptions(db, alice.id)).map((s) =>
      s.endpoint.split('/').pop(),
    )
    assert.equal(kept.length, store.MAX_PUSH_DEVICES)
    assert.deepEqual(kept.slice(0, 2), ['12', '2'])
    assert.ok(!kept.includes('3') && kept.includes('4'))
  })
})

describe('delivery', () => {
  const itemId = `${ITEM_ID}@${REGISTRY}`
  const evidenceAlert = (
    userId: number,
    dedupKey: string,
    evidenceAt: number,
    channels: ('email' | 'telegram' | 'push')[],
  ) => ({
    userId,
    dedupKey,
    kind: 'evidence',
    urgency: 'urgent' as const,
    title: 'New evidence',
    body: 'Body',
    itemId,
    evidenceAt,
    channels,
  })
  const deliveries = async () =>
    db.query<{ channel: string; status: string; last_error: string | null }>(
      `select channel, status, last_error from deliveries order by id`,
    )

  it('does not send alerts about evidence read in the app while they were queued', async () => {
    const { alice } = await seedUsers()
    await db.query(
      `insert into telegram_links (user_id, chat_id, linked_at) values ($1, '555', now())`,
      [alice.id],
    )
    await store.addPushSubscription(db, alice.id, {
      endpoint: 'https://fcm.googleapis.com/fcm/send/alice',
      p256dh: 'k',
      auth: 'a',
    })
    await store.insertNotifications(db, [
      evidenceAlert(alice.id, 'e', 3000, ['email', 'telegram', 'push']),
    ])
    await store.setEvidenceReads(db, alice.id, { [itemId]: 3000 })
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    // Push is configured, with keys no push service would accept: were it
    // attempted, it would fail and be retried, not skipped.
    const withPush = createService(
      {
        ...env,
        push: {
          publicKey: 'pub',
          privateKey: 'priv',
          subject: 'mailto:x@test',
        },
      },
      db,
      { chain: fakeChain },
    )
    const totals = await deliverDue(withPush)
    assert.equal(calls, 0)
    assert.deepEqual(totals, { sent: 0, skipped: 3, retried: 0 })
    assert.deepEqual(
      (await deliveries()).map((d) => [d.channel, d.status, d.last_error]),
      ['email', 'telegram', 'push'].map((channel) => [
        channel,
        'skipped',
        'Read in the app before delivery.',
      ]),
    )
  })

  it('does not retry an alert whose evidence was read after a failed attempt', async () => {
    const { alice } = await seedUsers()
    await store.insertNotifications(db, [
      evidenceAlert(alice.id, 'e', 3000, ['email']),
    ])
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('{"message":"unavailable"}', { status: 503 })
    }) as typeof fetch
    await deliverDue(service())
    assert.equal(calls, 1)
    assert.equal((await deliveries())[0].status, 'pending')
    await store.setEvidenceReads(db, alice.id, { [itemId]: 3000 })
    await db.query(`update deliveries set next_attempt_at = now()`)
    await deliverDue(service())
    assert.equal(calls, 1)
    assert.equal((await deliveries())[0].status, 'skipped')
  })

  it('still sends appeal alerts, and evidence newer than what was read', async () => {
    const { alice } = await seedUsers()
    await store.insertNotifications(db, [
      evidenceAlert(alice.id, 'newer', 5000, ['email']),
      {
        userId: alice.id,
        dedupKey: 'funded',
        kind: 'opponent_funded',
        urgency: 'urgent',
        title: 'Fund now',
        body: 'Body',
        itemId,
        channels: ['email'],
      },
    ])
    await store.setEvidenceReads(db, alice.id, { [itemId]: 3000 })
    await store.markRead(db, alice.id)
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('{"id":"1"}', { status: 200 })
    }) as typeof fetch
    const totals = await deliverDue(service())
    assert.deepEqual([calls, totals.sent], [2, 2])
  })

  it('sends email and Telegram, and unlinks chats that blocked the bot', async () => {
    const { alice, bob } = await seedUsers()
    await store.insertNotifications(db, [
      {
        userId: alice.id,
        dedupKey: 'a',
        kind: 'challenged',
        urgency: 'urgent',
        title: 'Challenged',
        body: 'Body',
        url: 'https://scout.test/x',
        channels: ['email'],
      },
      {
        userId: bob.id,
        dedupKey: 'b',
        kind: 'opponent_funded',
        urgency: 'urgent',
        title: 'Fund now',
        body: 'Body',
        channels: ['telegram'],
      },
    ])
    const sent: string[] = []
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      const url = String(input)
      sent.push(url)
      if (url.includes('resend')) {
        const body = JSON.parse(String(init?.body))
        assert.equal(body.to[0], 'alice@test')
        assert.match(body.headers['List-Unsubscribe'], /unsubscribe\?token=/)
        return new Response('{"id":"1"}', { status: 200 })
      }
      return new Response(
        JSON.stringify({
          ok: false,
          description: 'Forbidden: bot was blocked by the user',
        }),
        { status: 403 },
      )
    }) as typeof fetch
    const totals = await deliverDue(service(), 5_000)
    assert.deepEqual(totals, { sent: 1, skipped: 1, retried: 0 })
    assert.equal((await store.getTelegram(db, bob.id))?.chatId ?? null, null)
    assert.equal(sent.length, 2)
  })

  it('backs off and retries on provider errors', async () => {
    const { alice } = await seedUsers()
    await store.insertNotifications(db, [
      {
        userId: alice.id,
        dedupKey: 'c',
        kind: 'x',
        urgency: 'important',
        title: 't',
        body: 'b',
        channels: ['email'],
      },
    ])
    globalThis.fetch = (async () =>
      new Response('down', { status: 503 })) as unknown as typeof fetch
    assert.deepEqual(await deliverDue(service(), 5_000), {
      sent: 0,
      skipped: 0,
      retried: 1,
    })
    const [row] = await db.query<{ status: string; attempts: number }>(
      `select status, attempts from deliveries`,
    )
    assert.deepEqual([row.status, row.attempts], ['pending', 1])
  })
})

describe('watcher', () => {
  it('starts at the head, then processes each new window exactly once', async () => {
    await seedUsers()
    let head = { number: 100, timestamp: 1_500 }
    const indexer: Partial<Indexer> = {
      headBlock: async () => head.number,
      changesBetween: async () => ({
        itemIds: [`${ITEM_ID}@${REGISTRY}`],
        truncated: false,
      }),
      openAppealItemIds: async () => [],
      itemIdsForDisputes: async () => [],
      items: async () => [item()],
    }
    const chain: Partial<Chain> = {
      finalizedBlock: async () => head,
      blockAt: async (number: number) => ({
        number,
        timestamp: head.timestamp,
      }),
      periodChanges: async () => [],
      rewardsPaid: async () => [],
    }
    const svc = service({ indexer, chain })
    assert.deepEqual(await runWatcherTick(svc, 1_600), {
      initialized: true,
      block: 100,
    })
    head = { number: 112, timestamp: 2_500 }
    const first = await runWatcherTick(svc, 2_600)
    // Alice (submitter), Carol (on Alice's side in this snapshot), Bob (receipt), Dave (follower).
    assert.equal((first as { created: number }).created, 4)
    assert.deepEqual(await runWatcherTick(svc, 2_700), {
      idle: true,
      block: 112,
    })
    // Replaying the same window (e.g. after a crash) creates nothing new.
    await store.setWatcherState(db, { cursorTs: 1_500, cursorBlock: 100 })
    assert.equal(
      ((await runWatcherTick(svc, 2_800)) as { created: number }).created,
      0,
    )
  })
})

describe('API', () => {
  const account = privateKeyToAccount(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  )
  const summaries = [
    {
      id: `${ITEM_ID}@${REGISTRY}`,
      itemID: ITEM_ID,
      registryAddress: REGISTRY,
      status: 'Registered',
      key0: null,
      key1: null,
      key2: null,
      props: [{ label: 'Public Name Tag', value: 'Router' }],
    },
  ]
  const api = () =>
    createApi(
      service({
        indexer: { itemSummaries: async () => summaries } as Partial<Indexer>,
      }),
    )

  type Handle = (r: Request, client?: { ip?: string }) => Promise<Response>
  const call = async (
    handle: Handle,
    method: string,
    path: string,
    {
      body,
      form,
      cookie,
      origin = 'https://scout.test',
      account: meant,
      ip,
    }: {
      body?: unknown
      /** A form post's fields, instead of a JSON body. */
      form?: Record<string, string>
      cookie?: string
      origin?: string
      /** The account the app means the request for. */
      account?: string
      /** The client's IP, as Netlify gives it. */
      ip?: string
    } = {},
  ) => {
    const headers = new Headers({
      'Content-Type': form
        ? 'application/x-www-form-urlencoded'
        : 'application/json',
    })
    if (cookie) headers.set('Cookie', cookie)
    if (meant) headers.set('X-Notify-Account', meant)
    if (origin && method !== 'GET') headers.set('Origin', origin)
    const response = await handle(
      new Request(`https://scout.test${path}`, {
        method,
        headers,
        body: form
          ? new URLSearchParams(form).toString()
          : body === undefined
            ? undefined
            : JSON.stringify(body),
      }),
      { ip },
    )
    const setCookies = response.headers.getSetCookie?.() ?? []
    return {
      response,
      data: response.headers.get('content-type')?.includes('json')
        ? await response.json()
        : await response.text(),
      setCookies,
    }
  }
  const cookieJar = (setCookies: string[]) =>
    setCookies.map((c) => c.split(';')[0]).join('; ')

  const signIn = async (
    handle: Handle,
    { as = account, ip }: { as?: typeof account; ip?: string } = {},
  ) => {
    const nonce = await call(handle, 'GET', '/api/notify/auth/nonce')
    const message = createSiweMessage({
      domain: 'scout.test',
      address: as.address,
      uri: 'https://scout.test',
      version: '1',
      chainId: 100,
      nonce: nonce.data.nonce,
      issuedAt: new Date(),
      statement: 'Sign in to manage Scout notifications.',
    })
    const signature = await as.signMessage({ message })
    const verified = await call(handle, 'POST', '/api/notify/auth/verify', {
      body: { message, signature },
      cookie: cookieJar(nonce.setCookies),
      ip,
    })
    return { verified, cookie: cookieJar(verified.setCookies) }
  }

  /** Gives the signed-in account a confirmed email: somewhere to be notified. */
  const confirmEmail = async (email = 'me@test') => {
    const me = await store.upsertUser(db, account.address)
    await db.query(
      `insert into emails (user_id, email, verified_at) values ($1, $2, now())
       on conflict (user_id) do update set email = excluded.email, verified_at = now(), unsubscribed_at = null`,
      [me.id, email],
    )
    return me
  }

  it('signs in with Ethereum and manages preferences, follows and the inbox', async () => {
    const handle = api()
    const { verified, cookie } = await signIn(handle)
    assert.equal(verified.response.status, 200)
    assert.equal(verified.data.address, account.address.toLowerCase())
    assert.match(verified.setCookies.join(), /HttpOnly; SameSite=Lax/)

    const me = await call(handle, 'GET', '/api/notify/me', { cookie })
    assert.equal(me.data.signedIn, true)
    assert.equal(me.data.preferences.channels.email, 'important')

    const prefs = await call(handle, 'PUT', '/api/notify/me/preferences', {
      cookie,
      body: { channels: { push: 'all', email: 'bogus' } },
    })
    assert.equal(prefs.data.preferences.channels.push, 'all')
    assert.equal(prefs.data.preferences.channels.email, 'important')

    const itemPath = encodeURIComponent(`${ITEM_ID}@${REGISTRY}`)
    assert.equal(
      (
        await call(handle, 'PUT', `/api/notify/me/follows/${itemPath}`, {
          cookie,
        })
      ).data.following,
      true,
    )
    const follows = await call(handle, 'GET', '/api/notify/me/follows', {
      cookie,
    })
    assert.equal(
      follows.data.follows[0].url,
      `https://scout.test/single-tags/${ITEM_ID}`,
    )

    const user = (await store.usersByAddress(db, [account.address])).get(
      account.address.toLowerCase(),
    )![0]
    await store.insertNotifications(db, [
      {
        userId: user.id,
        dedupKey: 'n1',
        kind: 'evidence',
        urgency: 'important',
        title: 'New evidence',
        body: 'b',
        detail: '“It is a contract”',
        channels: [],
      },
    ])
    const inbox = await call(handle, 'GET', '/api/notify/me/notifications', {
      cookie,
    })
    assert.equal(inbox.data.unread, 1)
    assert.equal(inbox.data.notifications[0].title, 'New evidence')
    // The bell gets the quote.
    assert.equal(inbox.data.notifications[0].detail, '“It is a contract”')
    const read = await call(
      handle,
      'POST',
      '/api/notify/me/notifications/read',
      { cookie, body: {} },
    )
    assert.equal(read.data.unread, 0)

    assert.equal(
      (await call(handle, 'DELETE', '/api/notify/me', { cookie })).response
        .status,
      200,
    )
    assert.equal(
      (await call(handle, 'GET', '/api/notify/me', { cookie })).data.signedIn,
      false,
    )
  })

  it('syncs evidence reads across devices and reads the matching alerts', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    const me = await confirmEmail()
    const itemId = `${ITEM_ID}@${REGISTRY}`
    await store.insertNotifications(db, [
      {
        userId: me.id,
        dedupKey: 'ev',
        kind: 'evidence',
        urgency: 'urgent',
        title: 'New evidence',
        body: '…',
        itemId,
        evidenceAt: 2_500,
        channels: [],
      },
      {
        userId: me.id,
        dedupKey: 'rule',
        kind: 'ruling',
        urgency: 'important',
        title: 'Ruling',
        body: '…',
        itemId,
        channels: [],
      },
    ])
    const saved = await call(handle, 'POST', '/api/notify/me/reads', {
      cookie,
      body: { reads: { [itemId]: 3_000 } },
    })
    assert.equal(saved.response.status, 200)
    assert.deepEqual(saved.data.reads, { [itemId]: 3_000 })
    assert.equal(saved.data.alertsRead, 1)
    assert.equal(await store.unreadCount(db, me.id), 1)
    // Never moves back; another device sees the same.
    await call(handle, 'POST', '/api/notify/me/reads', {
      cookie,
      body: { reads: { [itemId]: 2_000 } },
    })
    const other = await call(handle, 'GET', '/api/notify/me/reads', { cookie })
    assert.deepEqual(other.data.reads, { [itemId]: 3_000 })
    for (const reads of [
      { 'not-an-item': 1 },
      { [itemId]: -1 },
      { [itemId]: Math.floor(Date.now() / 1000) + 86_400 },
    ]) {
      const bad = await call(handle, 'POST', '/api/notify/me/reads', {
        cookie,
        body: { reads },
      })
      assert.equal(bad.response.status, 400, JSON.stringify(reads))
    }
  })

  it('refuses requests the app meant for another account than the signed-in one', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    await confirmEmail()
    const itemId = `${ITEM_ID}@${REGISTRY}`
    const reads = { [itemId]: 3_000 }
    const elsewhere = await call(handle, 'POST', '/api/notify/me/reads', {
      cookie,
      body: { reads },
      account: BOB,
    })
    assert.equal(elsewhere.response.status, 409)
    for (const path of ['/api/notify/me/reads', '/api/notify/me/notifications'])
      assert.equal(
        (await call(handle, 'GET', path, { cookie, account: BOB })).response
          .status,
        409,
      )
    assert.deepEqual(
      (await call(handle, 'GET', '/api/notify/me/reads', { cookie })).data
        .reads,
      {},
    )
    // The same account, however it is spelled, goes through.
    const mine = await call(handle, 'POST', '/api/notify/me/reads', {
      cookie,
      body: { reads },
      account: account.address,
    })
    assert.equal(mine.response.status, 200)
    assert.deepEqual(mine.data.reads, reads)
  })

  it('takes reads in uploads within the body limit, and a failed upload loses nothing', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    await confirmEmail()
    const local = Object.fromEntries(
      Array.from({ length: 250 }, (_, i) => [
        `0x${i.toString(16).padStart(64, '0')}@${REGISTRY}`,
        1_700_000_000 + i,
      ]),
    )
    const post = async (reads: Record<string, number>) => {
      const saved = await call(handle, 'POST', '/api/notify/me/reads', {
        cookie,
        body: { reads },
      })
      if (saved.response.status !== 200)
        throw new Error(`HTTP ${saved.response.status}`)
    }
    const remote = async (): Promise<Record<string, number>> =>
      (await call(handle, 'GET', '/api/notify/me/reads', { cookie })).data.reads
    await assert.rejects(
      post(
        Object.fromEntries(
          Object.entries(local).slice(0, READS_PER_REQUEST + 1),
        ),
      ),
      /HTTP 400/,
    )

    let uploads = 0
    const flaky = async (reads: Record<string, number>) => {
      uploads += 1
      if (uploads === 2) throw new Error('offline')
      await post(reads)
    }
    const first = readsAhead(local, await remote())
    assert.equal(first.length, 3)
    await assert.rejects(uploadReads(first, flaky), /offline/)
    assert.equal(Object.keys(await remote()).length, READS_PER_REQUEST)
    // The next run sends only what the server still lacks.
    const rest = readsAhead(local, await remote())
    assert.deepEqual(
      rest.map((upload) => Object.keys(upload).length),
      [READS_PER_REQUEST, 250 - 2 * READS_PER_REQUEST],
    )
    await uploadReads(rest, flaky)
    assert.deepEqual(await remote(), local)
    assert.deepEqual(readsAhead(local, await remote()), [])
  })

  it('uploads only the reads the server keeps, so none go up again on every visit', () => {
    const local = Object.fromEntries(
      Array.from({ length: READS_KEPT + 100 }, (_, i) => [
        `0x${i.toString(16).padStart(64, '0')}@${REGISTRY}`,
        1_700_000_000 + i,
      ]),
    )
    const uploads = readsAhead(local, {})
    const sent = Object.assign({}, ...uploads)
    assert.equal(Object.keys(sent).length, READS_KEPT)
    // The most recent ones.
    assert.equal(Math.min(...Object.values<number>(sent)), 1_700_000_100)
    assert.deepEqual(readsAhead(local, sent), [])
  })

  it('never resolves a session to another user, even if ids are reused', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    // Simulate a restored database where id 1 now belongs to someone else.
    await db.query(`update users set address = $1 where id = 1`, [BOB])
    const me = await call(handle, 'GET', '/api/notify/me', { cookie })
    assert.equal(me.data.signedIn, false)
    const inbox = await call(handle, 'GET', '/api/notify/me/notifications', {
      cookie,
    })
    assert.equal(inbox.response.status, 401)
  })

  it('rejects sign-ins for another domain or without the nonce cookie, and cross-site writes', async () => {
    const handle = api()
    const nonce = await call(handle, 'GET', '/api/notify/auth/nonce')
    const message = createSiweMessage({
      domain: 'evil.test',
      address: account.address,
      uri: 'https://evil.test',
      version: '1',
      chainId: 100,
      nonce: nonce.data.nonce,
      issuedAt: new Date(),
    })
    const signature = await account.signMessage({ message })
    const wrongDomain = await call(handle, 'POST', '/api/notify/auth/verify', {
      body: { message, signature },
      cookie: cookieJar(nonce.setCookies),
    })
    assert.equal(wrongDomain.response.status, 401)
    const noNonce = await call(handle, 'POST', '/api/notify/auth/verify', {
      body: { message, signature },
    })
    assert.equal(noNonce.response.status, 401)
    const { cookie } = await signIn(handle)
    const crossSite = await call(handle, 'PUT', '/api/notify/me/preferences', {
      cookie,
      body: {},
      origin: 'https://evil.test',
    })
    assert.equal(crossSite.response.status, 403)
  })

  it('checks smart accounts on Gnosis only, with one RPC call and no retries', async () => {
    const handle = api()
    const rpc: string[] = []
    globalThis.fetch = (async (input: string | URL) => {
      rpc.push(String(input))
      return new Response('{"jsonrpc":"2.0","id":0,"error":{"code":-32000,"message":"down"}}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch
    // Signed by a key that isn't the address's own: only a smart account could pass.
    const attempt = async (chainId: number) => {
      const nonce = await call(handle, 'GET', '/api/notify/auth/nonce')
      const message = createSiweMessage({
        domain: 'scout.test',
        address: `0x${'5a'.repeat(20)}`,
        uri: 'https://scout.test',
        version: '1',
        chainId,
        nonce: nonce.data.nonce,
        issuedAt: new Date(),
      })
      return call(handle, 'POST', '/api/notify/auth/verify', {
        body: { message, signature: await account.signMessage({ message }) },
        cookie: cookieJar(nonce.setCookies),
      })
    }
    const mainnet = await attempt(1)
    assert.equal(mainnet.response.status, 401)
    assert.match(mainnet.data.error, /switch your wallet to Gnosis/)
    assert.deepEqual(rpc, [])
    const gnosis = await attempt(100)
    assert.equal(gnosis.response.status, 401)
    assert.deepEqual(
      rpc.map((url) => new URL(url).host),
      ['rpc.test'],
    )
  })

  it('refuses sign-in messages dated in the future, allowing for clock skew', async () => {
    const handle = api()
    const signAt = async (issuedAt: Date) => {
      const nonce = await call(handle, 'GET', '/api/notify/auth/nonce')
      const message = createSiweMessage({
        domain: 'scout.test',
        address: account.address,
        uri: 'https://scout.test',
        version: '1',
        chainId: 100,
        nonce: nonce.data.nonce,
        issuedAt,
      })
      return call(handle, 'POST', '/api/notify/auth/verify', {
        body: { message, signature: await account.signMessage({ message }) },
        cookie: cookieJar(nonce.setCookies),
      })
    }
    const future = await signAt(new Date(Date.now() + 24 * 3600_000))
    assert.equal(future.response.status, 401)
    assert.match(future.data.error, /dated in the future/)
    const skewed = await signAt(new Date(Date.now() + 2 * 60_000))
    assert.equal(skewed.response.status, 200)
  })

  it('ends every session of the account on sign-out', async () => {
    const handle = api()
    const first = await signIn(handle)
    const second = await signIn(handle) // another device
    const signedIn = async (cookie: string) =>
      (await call(handle, 'GET', '/api/notify/me', { cookie })).data.signedIn
    assert.equal(await signedIn(first.cookie), true)
    const out = await call(handle, 'POST', '/api/notify/auth/logout', {
      cookie: first.cookie,
      body: {},
    })
    assert.match(out.setCookies.join(), /scout_notify_session=;[^,]*Max-Age=0/)
    // A copy of the cookie no longer works, nor does the other device's.
    assert.equal(await signedIn(first.cookie), false)
    assert.equal(await signedIn(second.cookie), false)
    assert.equal(
      (
        await call(handle, 'PUT', '/api/notify/me/preferences', {
          cookie: first.cookie,
          body: {},
        })
      ).response.status,
      401,
    )
    // Signing in again works.
    assert.equal(await signedIn((await signIn(handle)).cookie), true)
  })

  it('answers malformed requests with 4xx, not 5xx', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    const status = async (
      method: string,
      path: string,
      options: Parameters<typeof call>[3] = {},
    ) => (await call(handle, method, path, { cookie, ...options })).response.status
    // A malformed escape in a path parameter, with or without a session.
    assert.equal(await status('DELETE', '/api/notify/me/watched/%E0%A4%A'), 400)
    assert.equal(
      await status('DELETE', '/api/notify/me/watched/%E0%A4%A', { cookie: '' }),
      400,
    )
    assert.equal(
      await status('PUT', '/api/notify/me/preferences', { body: {}, origin: 'null' }),
      403,
    )
    assert.equal(
      await status('PUT', '/api/notify/me/preferences', { body: {}, origin: 'not a url' }),
      403,
    )
    for (const body of [null, [], 'text', 42])
      assert.equal(
        await status('PUT', '/api/notify/me/preferences', { body }),
        400,
        JSON.stringify(body),
      )
    for (const before of ['1e300', '-1', '1.5', '99999999999999999999'])
      assert.equal(
        await status('GET', `/api/notify/me/notifications?before=${before}`),
        400,
        before,
      )
    assert.equal(await status('GET', '/api/notify/me/notifications?before=5'), 200)
    // Someone else's malformed cookie on the same site doesn't break ours.
    const me = await call(handle, 'GET', '/api/notify/me', {
      cookie: `${cookie}; other=%E0%A4%A`,
    })
    assert.equal(me.data.signedIn, true)
  })

  it('signs in once per signed message, even when it is replayed or raced', async () => {
    const handle = api()
    const signed = async () => {
      const nonce = await call(handle, 'GET', '/api/notify/auth/nonce')
      const message = createSiweMessage({
        domain: 'scout.test',
        address: account.address,
        uri: 'https://scout.test',
        version: '1',
        chainId: 100,
        nonce: nonce.data.nonce,
        issuedAt: new Date(),
      })
      const signature = await account.signMessage({ message })
      return () =>
        call(handle, 'POST', '/api/notify/auth/verify', {
          body: { message, signature },
          cookie: cookieJar(nonce.setCookies),
        })
    }
    const verify = await signed()
    const first = await verify()
    assert.equal(first.response.status, 200)
    // The browser drops its nonce cookie…
    assert.match(first.setCookies.join(), /scout_notify_nonce=;[^,]*Max-Age=0/)
    // …but a copy of the same request, cookie included, gets nowhere.
    const replay = await verify()
    assert.equal(replay.response.status, 401)
    assert.match(replay.data.error, /already used/)

    const race = await signed()
    const statuses = (await Promise.all([race(), race()])).map(
      (r) => r.response.status,
    )
    assert.deepEqual(statuses.sort(), [200, 401])
  })

  it('verifies email addresses and honours one-click unsubscribe', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    let verifyUrl = ''
    globalThis.fetch = (async (_: string, init?: RequestInit) => {
      verifyUrl =
        /https:\/\/scout\.test\/api\/notify\/email\/verify\?token=\S+/.exec(
          JSON.parse(String(init?.body)).text,
        )?.[0] ?? ''
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    const put = await call(handle, 'PUT', '/api/notify/me/email', {
      cookie,
      body: { email: 'me@example.com' },
    })
    assert.equal(put.data.email.verified, false)
    const verified = async () =>
      (await call(handle, 'GET', '/api/notify/me', { cookie })).data.email
        .verified
    // Opening the link (as a mail scanner would) only shows a button.
    const path = verifyUrl.replace('https://scout.test', '')
    const page = await call(handle, 'GET', path)
    assert.equal(page.response.status, 200)
    assert.match(page.data, /<form method="post">/)
    assert.match(page.data, /me@example\.com/)
    assert.equal(await verified(), false)
    // Pressing it, from another site, does nothing.
    const token = new URL(verifyUrl).searchParams.get('token') ?? ''
    assert.equal(
      (
        await call(handle, 'POST', path, {
          form: { token },
          origin: 'https://evil.test',
        })
      ).response.status,
      403,
    )
    assert.equal(await verified(), false)
    // Pressing it on the page confirms.
    const verify = await call(handle, 'POST', path, { form: { token } })
    assert.equal(verify.response.status, 303)
    assert.match(
      verify.response.headers.get('location') ?? '',
      /notify=email-verified#notifications/,
    )
    assert.equal(await verified(), true)
    // The link is single-use.
    assert.match(
      (await call(handle, 'GET', path)).data,
      /invalid or expired/,
    )

    const user = (await store.usersByAddress(db, [account.address])).get(
      account.address.toLowerCase(),
    )![0]
    const { unsubscribeUrl } = await import('./service')
    const oneClick = await call(
      handle,
      'POST',
      unsubscribeUrl(env, user.id, 'me@example.com').replace(
        'https://scout.test',
        '',
      ),
      { origin: 'https://mail.example' },
    )
    assert.equal(oneClick.response.status, 200)
    assert.equal((await store.getEmail(db, user.id))?.unsubscribed, true)
  })

  it('applies an unsubscribe link only to the address it was sent to', async () => {
    const handle = api()
    await signIn(handle)
    const me = await confirmEmail('old@example.com')
    const { unsubscribeUrl } = await import('./service')
    const old = unsubscribeUrl(env, me.id, 'old@example.com').replace(
      'https://scout.test',
      '',
    )
    await confirmEmail('new@example.com')
    assert.match((await call(handle, 'GET', old)).data, /invalid or expired/)
    const stale = await call(handle, 'POST', old, {
      origin: 'https://mail.example',
    })
    assert.equal(stale.response.status, 400)
    assert.equal((await store.getEmail(db, me.id))?.unsubscribed, false)
    const current = unsubscribeUrl(env, me.id, 'New@Example.com').replace(
      'https://scout.test',
      '',
    )
    assert.match((await call(handle, 'GET', current)).data, /Stop Scout emails/)
    assert.equal(
      (await call(handle, 'POST', current, { origin: 'https://mail.example' }))
        .response.status,
      200,
    )
    assert.equal((await store.getEmail(db, me.id))?.unsubscribed, true)
  })

  it('keeps evidence reads only for accounts with somewhere to be notified', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    const me = await store.upsertUser(db, account.address)
    const itemId = `${ITEM_ID}@${REGISTRY}`
    await store.insertNotifications(db, [
      {
        userId: me.id,
        dedupKey: 'ev',
        kind: 'evidence',
        urgency: 'important',
        title: 'New evidence',
        body: '…',
        itemId,
        evidenceAt: 2_500,
        channels: [],
      },
    ])
    const save = () =>
      call(handle, 'POST', '/api/notify/me/reads', {
        cookie,
        body: { reads: { [itemId]: 3_000 } },
      })
    // The bell alone: the alert is read, nothing is stored.
    const bellOnly = await save()
    assert.equal(bellOnly.response.status, 200)
    assert.deepEqual(
      [bellOnly.data.reads, bellOnly.data.alertsRead, bellOnly.data.synced],
      [{}, 1, false],
    )
    assert.equal(await store.unreadCount(db, me.id), 0)
    assert.deepEqual(
      (await call(handle, 'GET', '/api/notify/me/reads', { cookie })).data,
      { reads: {}, synced: false },
    )
    // With a confirmed email, reads are kept.
    await confirmEmail()
    const kept = await save()
    assert.deepEqual([kept.data.reads, kept.data.synced], [{ [itemId]: 3_000 }, true])
  })

  it('limits new accounts per network and overall, never existing ones', async () => {
    const handle = api()
    const status = async (as: typeof account, ip: string) =>
      (await signIn(handle, { as, ip })).verified.response.status
    const fresh = () => privateKeyToAccount(generatePrivateKey())
    // An account made earlier, elsewhere.
    assert.equal(await status(account, '198.51.100.1'), 200)
    // New wallets from one IPv6 /64, each from its own address in it.
    const statuses: number[] = []
    for (let i = 1; i <= store.SIGNUP_LIMITS.perIpPerDay + 1; i++)
      statuses.push(await status(fresh(), `2001:db8:1:2::${i}`))
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429])
    // The existing account still signs in from there; other networks are fine.
    assert.equal(await status(account, '2001:db8:1:2::99'), 200)
    assert.equal(await status(fresh(), '198.51.100.7'), 200)
    // The service-wide limit: 7 accounts so far.
    const limits = { perIpPerDay: 5, perDay: 8 }
    assert.equal(await store.recordSignup(db, 'net-a', limits), 'ok')
    assert.equal(await store.recordSignup(db, 'net-b', limits), 'service')
  })

  it('links Telegram through a one-time deep link', async () => {
    const handle = api()
    const { cookie } = await signIn(handle)
    const link = await call(handle, 'POST', '/api/notify/me/telegram', {
      cookie,
    })
    const token = new URL(link.data.url).searchParams.get('start') ?? ''
    assert.match(link.data.url, /^https:\/\/t\.me\/ScoutTestBot\?start=/)
    const replies: string[] = []
    globalThis.fetch = (async (_: string, init?: RequestInit) => {
      replies.push(JSON.parse(String(init?.body)).text)
      return new Response('{"ok":true}', { status: 200 })
    }) as unknown as typeof fetch
    const update = {
      message: {
        chat: { id: 4242, type: 'private' },
        from: { username: 'alice' },
        text: `/start ${token}`,
      },
    }
    const unauthorized = await call(
      handle,
      'POST',
      '/api/notify/telegram/webhook',
      { body: update, origin: '' },
    )
    assert.equal(unauthorized.response.status, 401)
    for (const secret of ['hook-secreT', 'hook', 'hook-secret-and-more']) {
      const wrong = await handle(
        new Request('https://scout.test/api/notify/telegram/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Bot-Api-Secret-Token': secret,
          },
          body: JSON.stringify(update),
        }),
      )
      assert.equal(wrong.status, 401, secret)
    }
    const webhook = await handle(
      new Request('https://scout.test/api/notify/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': 'hook-secret',
        },
        body: JSON.stringify(update),
      }),
    )
    assert.equal(webhook.status, 200)
    assert.match(replies[0], /^Connected/)
    const me = await call(handle, 'GET', '/api/notify/me', { cookie })
    assert.deepEqual(me.data.telegram, { connected: true, username: 'alice' })
    // The token is single-use.
    const tokenRow = await db.query(
      `select 1 from telegram_links where token_hash = $1`,
      [sha256Hex(token)],
    )
    assert.equal(tokenRow.length, 0)
  })
})

describe('push subscriptions API', () => {
  const account = privateKeyToAccount(
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  )
  const key = (bytes: number, first = 4) =>
    Buffer.from([first, ...new Array(bytes - 1).fill(7)]).toString('base64url')

  it('only accepts real push services and well-formed keys', async () => {
    const handle = createApi(
      createService(
        {
          ...env,
          push: {
            publicKey: 'pub',
            privateKey: 'priv',
            subject: 'mailto:x@test',
          },
        },
        db,
        { chain: fakeChain },
      ),
    )
    const request = (path: string, init: RequestInit = {}, cookie = '') =>
      handle(
        new Request(`https://scout.test${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://scout.test',
            Cookie: cookie,
          },
        }),
      )
    const nonce = await request('/api/notify/auth/nonce')
    const nonceCookie = nonce.headers.getSetCookie()[0].split(';')[0]
    const message = createSiweMessage({
      domain: 'scout.test',
      address: account.address,
      uri: 'https://scout.test',
      version: '1',
      chainId: 100,
      nonce: (await nonce.json()).nonce,
      issuedAt: new Date(),
    })
    const verified = await request(
      '/api/notify/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          signature: await account.signMessage({ message }),
        }),
      },
      nonceCookie,
    )
    const cookie = verified.headers.getSetCookie()[0].split(';')[0]
    const subscribe = (endpoint: string, p256dh = key(65), auth = key(16, 1)) =>
      request(
        '/api/notify/me/push',
        {
          method: 'POST',
          body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
        },
        cookie,
      ).then((r) => r.status)

    assert.equal(
      await subscribe('https://fcm.googleapis.com/fcm/send/abc'),
      200,
    )
    assert.equal(await subscribe('https://web.push.apple.com/QGx'), 200)
    assert.equal(
      await subscribe('https://updates.push.services.mozilla.com/wpush/v2/x'),
      200,
    )
    for (const endpoint of [
      'https://attacker.test/collect',
      'https://fcm.googleapis.com.attacker.test/x',
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://fcm.googleapis.com:8443/fcm/send/abc',
    ])
      assert.equal(await subscribe(endpoint), 400, endpoint)
    const endpoint = 'https://fcm.googleapis.com/fcm/send/def'
    assert.equal(await subscribe(endpoint, key(64)), 400)
    assert.equal(await subscribe(endpoint, key(65, 2)), 400)
    assert.equal(await subscribe(endpoint, key(65), key(32)), 400)
    assert.equal(await subscribe(endpoint, 'not base64!', key(16)), 400)
  })
})

describe('message rendering', () => {
  const message = {
    id: 1,
    kind: 'opponent_funded',
    urgency: 'urgent' as const,
    title: 'Action needed: the other side appealed Router on Base',
    body: 'Fund 101 xDAI or you lose the case.',
    url: 'https://scout.test/single-tags/0x1',
    deadline: '2026-09-27T18:27:12.000Z',
  }
  const email = (m: typeof message) =>
    renderEmail(m, {
      siteUrl: 'https://scout.test',
      unsubscribeUrl: 'https://scout.test/u',
      address: '0xabc',
    })

  it('flags urgent emails once in the subject', () => {
    assert.equal(email(message).subject, message.title)
    assert.equal(
      email({ ...message, title: 'Your token was challenged' }).subject,
      'Action needed: Your token was challenged',
    )
  })

  it('prints deadlines to the minute in UTC, never later than the real one', () => {
    const line = 'Deadline: Sun, Sep 27, 2026, 18:27 UTC'
    assert.match(email(message).text, new RegExp(line))
    assert.match(renderTelegram(message), new RegExp(`<i>${line}</i>`))
  })

  it('rounds the time left down', () => {
    const now = 1_800_000_000
    assert.match(formatDeadline(now + 43.9 * 3600, now), /\(in 43 h\)$/)
    assert.match(formatDeadline(now + 84 * 3600, now), /\(in 3 days\)$/)
    assert.match(formatDeadline(now + 90, now), /\(in 1 min\)$/)
  })
})
