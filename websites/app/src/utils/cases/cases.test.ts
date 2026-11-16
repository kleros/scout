import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  decodeFunctionData,
  encodeFunctionResult,
  parseAbi,
  type Abi,
  type Hex,
} from 'viem'
import {
  attentionFor,
  evidenceStatus,
  withEvidence,
  type Attention,
} from './attention'
import { createCaseChain } from './chain'
import { createCaseIndexer, REGISTRY_ADDRESSES } from './indexer'
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

describe('reads', () => {
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    })

  it("reads a wallet's open cases in one request to the indexer", async (t) => {
    const bodies: { query: string; variables: Record<string, unknown> }[] = []
    t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)))
      return json({ data: { LItem: [item()] } })
    })
    const items = await createCaseIndexer('https://indexer.test/graphql').openCases(
      ALICE.toUpperCase().replace('0X', '0x'),
    )
    assert.deepEqual(items, [item()])
    assert.equal(bodies.length, 1)
    assert.deepEqual(bodies[0].variables, {
      address: ALICE,
      registries: REGISTRY_ADDRESSES,
    })
    // Requester or challenger, crowdfunder, or submitter of an item under removal.
    for (const part of [
      '{ requester: { _eq: $address } }, { challenger: { _eq: $address } }',
      'rounds: { contributions: { contributor: { _eq: $address } } }',
      'status: { _eq: "ClearingRequested" }',
    ])
      assert.ok(bodies[0].query.includes(part), part)
  })

  it("reads the court and appeal costs from the request's arbitrator", async (t) => {
    const OTHER_ARBITRATOR = `0x${'9a'.repeat(20)}`
    const abi: Abi = parseAbi([
      'function appealCost(uint256 _disputeID, bytes _extraData) view returns (uint256)',
      'function disputes(uint256) view returns (uint96 subcourtID, address arbitrated, uint256 numberOfChoices, uint8 period, uint256 lastPeriodChange, uint256 drawsInRound, uint256 commitsInRound, bool ruled)',
      'function getSubcourt(uint96 _subcourtID) view returns (uint256[] children, uint256[4] timesPerPeriod)',
      'function winnerStakeMultiplier() view returns (uint256)',
      'function loserStakeMultiplier() view returns (uint256)',
      'function sharedStakeMultiplier() view returns (uint256)',
      'function MULTIPLIER_DIVISOR() view returns (uint256)',
    ])
    const results: Record<string, unknown> = {
      appealCost: 10n ** 18n,
      disputes: [3n, REGISTRY, 2n, 2, 1_000n, 3n, 0n, false],
      getSubcourt: [[], [100n, 200n, 600n, 900n]],
      winnerStakeMultiplier: 5_000n,
      loserStakeMultiplier: 10_000n,
      sharedStakeMultiplier: 5_000n,
      MULTIPLIER_DIVISOR: 10_000n,
    }
    const calls: string[] = []
    t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      const { to, data } = body.params[0] as { to: string; data: Hex }
      const { functionName } = decodeFunctionData({ abi, data })
      calls.push(`${functionName} ${to.toLowerCase()}`)
      return json({
        jsonrpc: '2.0',
        id: body.id,
        result: encodeFunctionResult({
          abi,
          functionName,
          result: results[functionName],
        }),
      })
    })
    const chain = createCaseChain(['https://rpc.test'])
    assert.deepEqual(await chain.disputePeriod(OTHER_ARBITRATOR, '7'), {
      period: 'vote',
      deadline: 1_000 + 600,
    })
    assert.deepEqual(
      await chain.appealFunding(REGISTRY, OTHER_ARBITRATOR, '7', '0x'),
      { winner: 15n * 10n ** 17n, loser: 2n * 10n ** 18n, shared: 15n * 10n ** 17n },
    )
    assert.deepEqual(calls.filter((c) => !c.includes(REGISTRY)).sort(), [
      `appealCost ${OTHER_ARBITRATOR}`,
      `disputes ${OTHER_ARBITRATOR}`,
      `getSubcourt ${OTHER_ARBITRATOR}`,
    ])
  })
})
