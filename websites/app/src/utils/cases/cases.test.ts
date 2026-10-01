import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  attentionFor,
  evidenceStatus,
  withEvidence,
  type Attention,
} from './attention'
import type { IndexedItem, IndexedRequest, IndexedRound } from './indexer'

// An Address Tags item that gets challenged and appealed.
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

describe('attention', () => {
  const summary = (entries: Attention[]) =>
    entries.map((e) => [e.kind, e.level, e.deadline])
  const appealRound = (fields: Partial<IndexedRound> = {}) =>
    round(1, {
      ruling: 'Reject',
      appealPeriodStart: String(APPEAL_START),
      appealPeriodEnd: String(APPEAL_END),
      ...fields,
    })

  it('keeps fund-or-lose in view for the side that won the ruling', () => {
    const items = [item()]
    assert.deepEqual(
      summary(
        attentionFor(items, BOB.toUpperCase().replace('0X', '0x'), 50_000),
      ),
      [['defend', 'urgent', APPEAL_END]],
    )
    assert.deepEqual(summary(attentionFor(items, ALICE, 50_000)), [
      ['appeal-funded', 'waiting', APPEAL_END],
    ])
    const carol = attentionFor(items, CAROL, 50_000)
    assert.deepEqual([carol[0].kind, carol[0].party], ['appeal-funded', false])
    assert.deepEqual(attentionFor(items, DAVE, 50_000), [])
    assert.deepEqual(summary(attentionFor(items, BOB, APPEAL_END)), [
      ['ruling-final', 'waiting', undefined],
    ])
  })

  it('lets the losing side appeal until the midpoint', () => {
    const items = [item(request({ rounds: [round(0), appealRound()] }))]
    assert.deepEqual(summary(attentionFor(items, ALICE, 50_000)), [
      ['appeal', 'action', LOSER_DEADLINE],
    ])
    assert.deepEqual(summary(attentionFor(items, BOB, 50_000)), [
      ['ruling-won', 'waiting', LOSER_DEADLINE],
    ])
    for (const who of [ALICE, BOB])
      assert.deepEqual(summary(attentionFor(items, who, LOSER_DEADLINE)), [
        ['ruling-final', 'waiting', undefined],
      ])
  })

  it('makes a round without ruling urgent once the other side is funded', () => {
    const open = [
      item(request({ rounds: [round(0), appealRound({ ruling: 'None' })] })),
    ]
    assert.deepEqual(summary(attentionFor(open, BOB, 50_000)), [
      ['fund-undecided', 'action', APPEAL_END],
    ])
    const funded = [
      item(
        request({
          rounds: [
            round(0),
            appealRound({ ruling: 'None', hasPaidRequester: true }),
          ],
        }),
      ),
    ]
    assert.deepEqual(summary(attentionFor(funded, BOB, 50_000)), [
      ['fund-undecided', 'urgent', APPEAL_END],
    ])
  })

  it('covers disputes before a ruling, pending requests and removals', () => {
    const voting = [item(request({ rounds: [round(0), round(1)] }))]
    assert.deepEqual(summary(attentionFor(voting, ALICE, 50_000)), [
      ['challenged', 'action', undefined],
    ])
    assert.deepEqual(summary(attentionFor(voting, BOB, 50_000)), [
      ['dispute', 'waiting', undefined],
    ])
    // Once jurors vote, there is nothing left for the submitter to add.
    assert.deepEqual(
      summary(
        attentionFor(voting, ALICE, 50_000, undefined, (id) =>
          id === '1013' ? 'vote' : undefined,
        ),
      ),
      [['dispute', 'waiting', undefined]],
    )

    const period = () => 302_400
    const pending = [item(request({ disputed: false, rounds: [round(0)] }))]
    assert.deepEqual(summary(attentionFor(pending, ALICE, 1_100, period)), [
      ['challenge-period', 'waiting', 1_000 + 302_400],
    ])
    assert.deepEqual(summary(attentionFor(pending, ALICE, 303_400, period)), [
      ['executable', 'waiting', undefined],
    ])

    const removal = {
      ...item(),
      requests: [
        request({ disputed: false, resolved: true, rounds: [round(0)] }),
        request({
          id: `${ITEM_ID}@${REGISTRY}-1`,
          requestType: 'ClearingRequested',
          requester: BOB,
          disputed: false,
          submissionTime: '5000',
          rounds: [round(0)],
        }),
      ],
    }
    assert.deepEqual(summary(attentionFor([removal], ALICE, 6_000, period)), [
      ['removal-requested', 'action', 5_000 + 302_400],
    ])
    assert.deepEqual(summary(attentionFor([removal], BOB, 6_000, period)), [
      ['challenge-period', 'waiting', 5_000 + 302_400],
    ])
    assert.deepEqual(
      attentionFor([item(request({ resolved: true }))], BOB, 50_000),
      [],
    )
  })

  it('counts evidence and keeps unread evidence from others in view', () => {
    const req = request()
    // Alice answered Bob's challenge, so she has read it.
    const alice = evidenceStatus(req, ALICE)
    assert.deepEqual(
      [alice.total, alice.unread, alice.latest?.id],
      [2, 0, 'e0'],
    )
    const bob = evidenceStatus(req, BOB)
    assert.deepEqual([bob.unread, bob.latest?.id], [1, 'e1'])
    assert.equal(evidenceStatus(req, BOB, 3_000).unread, 0)
    // Bob replies again: new for Alice until she reads it.
    const replied = request({
      evidenceGroup: {
        evidences: [
          ...req.evidenceGroup!.evidences,
          {
            id: 'e2',
            party: BOB,
            number: '2',
            timestamp: '4000',
            title: 'Still an EOA',
            description: 'See the code at the address.',
            txHash: '0xe3',
          },
        ],
      },
    })
    assert.equal(evidenceStatus(replied, ALICE).unread, 1)
    assert.equal(evidenceStatus(replied, ALICE, 4_000).unread, 0)

    // Bob's case waits on the jurors, but Alice's answer is unread.
    const voting = attentionFor(
      [item(request({ rounds: [round(0), round(1)] }))],
      BOB,
      50_000,
    )
    const unread = withEvidence(voting, BOB, () => 0)[0]
    assert.deepEqual(
      [unread.kind, unread.level, unread.newEvidence, unread.evidence.unread],
      ['dispute', 'action', true, 1],
    )
    const read = withEvidence(voting, BOB, () => 3_000)[0]
    assert.deepEqual([read.level, read.newEvidence], ['waiting', false])
  })

  it('puts the most pressing first', () => {
    const other = (n: number, req: IndexedRequest): IndexedItem => ({
      ...item(req),
      id: `0x${String(n).repeat(64)}@${REGISTRY}`,
    })
    const entries = attentionFor(
      [
        other(
          1,
          request({ disputed: false, requester: BOB, rounds: [round(0)] }),
        ),
        other(
          2,
          request({
            rounds: [round(0), appealRound()],
            requester: BOB,
            challenger: ALICE,
          }),
        ),
        item(),
      ],
      BOB,
      50_000,
      () => 302_400,
    )
    assert.deepEqual(
      entries.map((e) => e.kind),
      ['defend', 'appeal', 'challenge-period'],
    )
    // Disputes in progress come before routine pending submissions.
    const waiting = attentionFor(
      [
        other(3, request({ disputed: false, rounds: [round(0)] })),
        item(request({ rounds: [round(0), round(1)] })),
      ],
      ALICE,
      50_000,
      () => 302_400,
      () => 'vote',
    )
    assert.deepEqual(
      waiting.map((e) => e.kind),
      ['dispute', 'challenge-period'],
    )
  })
})
