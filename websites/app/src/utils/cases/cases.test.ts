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
import {
  courtDeadline,
  describeAttention,
} from '../../components/Attention/describe'

// An Address Tags item that gets challenged and appealed.
const REGISTRY = '0x66260c69d03837016d88c9877e61e08ef74c59f2'
const ITEM_ID = `0x${'ab'.repeat(32)}`
const ALICE = `0x${'11'.repeat(20)}` // submitter
const BOB = `0x${'22'.repeat(20)}` // challenger
const CAROL = `0x${'33'.repeat(20)}` // crowdfunds Alice's appeal
const DAVE = `0x${'44'.repeat(20)}` // follows the item
const ARBITRATOR = '0x9c1da9a04925bdfdedf0f6421bc7eea8305f9002'

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
  arbitrator: ARBITRATOR,
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

const summary = (entries: Attention[]) =>
  entries.map((e) => [e.kind, e.level, e.deadline])

const appealRound = (fields: Partial<IndexedRound> = {}) =>
  round(1, {
    ruling: 'Reject',
    appealPeriodStart: String(APPEAL_START),
    appealPeriodEnd: String(APPEAL_END),
    ...fields,
  })

describe('attention', () => {
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
  })

  it('gives the case to the only funded side once the appeal period is over', () => {
    // Bob won the vote, but only Alice's side funded the appeal: `rule`
    // gives Alice the case, whatever the jurors said.
    const items = [item()]
    for (const who of [ALICE, BOB, CAROL]) {
      const [entry] = attentionFor(items, who, APPEAL_END)
      assert.deepEqual(
        [entry.kind, entry.level, entry.deadline, entry.winner],
        ['funded-side-wins', 'waiting', undefined, 'requester'],
      )
    }
    const title = (who: string) =>
      describeAttention(attentionFor(items, who, APPEAL_END)[0]).title
    assert.equal(title(ALICE), 'Only your side was fully funded, so it wins')
    assert.equal(title(CAROL), 'Only your side was fully funded, so it wins')
    assert.equal(title(BOB), 'Only the other side was fully funded, so it wins')
    assert.match(
      describeAttention(attentionFor(items, BOB, APPEAL_END)[0]).body,
      /whatever the jurors ruled: the address tag is added to the list once the ruling is executed\.$/,
    )

    // Settled before the end: the loser can no longer fund, and the winner
    // already did. Nothing can change it, and it takes effect at the end.
    const early = [
      item(
        request({
          rounds: [round(0), appealRound({ hasPaidChallenger: true })],
        }),
      ),
    ]
    const [bob] = attentionFor(early, BOB, LOSER_DEADLINE)
    assert.deepEqual(
      [bob.kind, bob.deadline, bob.winner],
      ['funded-side-wins', APPEAL_END, 'challenger'],
    )
    assert.match(
      describeAttention(bob).body,
      /the address tag is not added to the list when the appeal period ends\.$/,
    )
  })

  it('lets the losing side appeal until the midpoint', () => {
    const items = [item(request({ rounds: [round(0), appealRound()] }))]
    assert.deepEqual(summary(attentionFor(items, ALICE, 50_000)), [
      ['appeal', 'action', LOSER_DEADLINE],
    ])
    assert.deepEqual(summary(attentionFor(items, BOB, 50_000)), [
      ['ruling-won', 'waiting', LOSER_DEADLINE],
    ])
    // After the midpoint the loser can no longer appeal: the ruling stands,
    // and is enforced once the appeal period is over.
    for (const who of [ALICE, BOB]) {
      const entries = attentionFor(items, who, LOSER_DEADLINE)
      assert.deepEqual(summary(entries), [
        ['ruling-final', 'waiting', APPEAL_END],
      ])
      assert.deepEqual(describeAttention(entries[0]), {
        title: 'The ruling is final',
        body: 'The losing side can no longer appeal: the address tag is not added to the list when the appeal period ends.',
      })
      const [over] = attentionFor(items, who, APPEAL_END)
      assert.deepEqual(
        [over.kind, over.deadline, describeAttention(over).body],
        [
          'ruling-final',
          undefined,
          'The appeal period is over: the address tag is not added to the list once the ruling is executed.',
        ],
      )
    }
  })

  it('makes a round without ruling urgent once the other side is funded', () => {
    const open = [
      item(request({ rounds: [round(0), appealRound({ ruling: 'None' })] })),
    ]
    assert.deepEqual(summary(attentionFor(open, BOB, 50_000)), [
      ['fund-undecided', 'action', APPEAL_END],
    ])
    // Neither side funded by the end: the request fails and the deposits
    // are split (`rule` with no winner).
    assert.equal(
      describeAttention(attentionFor(open, BOB, 50_000)[0]).body,
      'If only one side is fully funded when the appeal period ends, that side wins. If neither is, the request is rejected and the deposits are split between both sides.',
    )
    const [over] = attentionFor(open, BOB, APPEAL_END)
    assert.deepEqual(
      [over.kind, over.winner, describeAttention(over)],
      [
        'ruling-final',
        null,
        {
          title: 'Jurors could not decide',
          body: 'Neither side funded an appeal, so the request is rejected (the address tag is not added to the list) and the deposits are split between both sides once the ruling is executed.',
        },
      ],
    )

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

  it('does not take a side for someone who challenged their own request', () => {
    const self = [
      item(
        request({
          challenger: ALICE,
          rounds: [
            round(0, {
              contributions: [
                { contributor: ALICE, side: '1' },
                { contributor: ALICE, side: '2' },
              ],
            }),
            appealRound(),
          ],
        }),
      ),
    ]
    const entries = attentionFor(self, ALICE, 50_000)
    assert.deepEqual(summary(entries), [['dispute', 'waiting', undefined]])
    assert.deepEqual([entries[0].side, entries[0].party], [undefined, true])
    // Not "the ruling went against you": it went for them as well.
    assert.equal(
      describeAttention(entries[0], { period: 'appeal' }).body,
      'The ruling is in; the appeal period is open.',
    )
    const [over] = attentionFor(self, ALICE, APPEAL_END)
    assert.deepEqual(
      [over.kind, describeAttention(over).title],
      ['ruling-final', 'The ruling is final'],
    )
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
    // Court periods are read from the request's own arbitrator.
    assert.deepEqual(
      summary(
        attentionFor(voting, ALICE, 50_000, undefined, (id, arbitrator) =>
          id === '1013' && arbitrator === ARBITRATOR ? 'vote' : undefined,
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

  it('tells only the submitter whose registration went through about a removal', () => {
    const removal = (earlier: IndexedRequest[]) => ({
      ...item(),
      status: 'ClearingRequested',
      requests: [
        ...earlier,
        request({
          id: `${ITEM_ID}@${REGISTRY}-${earlier.length}`,
          requestType: 'ClearingRequested',
          requester: BOB,
          disputed: false,
          submissionTime: '9000',
          rounds: [round(0)],
        }),
      ],
    })
    const registration = (
      requester: string,
      index: number,
      fields: Partial<IndexedRequest>,
    ) =>
      request({
        id: `${ITEM_ID}@${REGISTRY}-${index}`,
        requester,
        resolved: true,
        rounds: [round(0)],
        ...fields,
      })
    const period = () => 302_400
    // Alice's registration was rejected in a dispute; Dave's went through.
    const item1 = removal([
      registration(ALICE, 0, { disputed: true, disputeOutcome: 'Reject' }),
      registration(DAVE, 1, { disputed: false }),
    ])
    assert.deepEqual(attentionFor([item1], ALICE, 10_000, period), [])
    assert.deepEqual(summary(attentionFor([item1], DAVE, 10_000, period)), [
      ['removal-requested', 'action', 9_000 + 302_400],
    ])
    // Accepted in a dispute, then an earlier removal failed: still Carol's.
    const item2 = removal([
      registration(CAROL, 0, { disputed: true, disputeOutcome: 'Accept' }),
      request({
        id: `${ITEM_ID}@${REGISTRY}-1`,
        requestType: 'ClearingRequested',
        requester: DAVE,
        resolved: true,
        disputeOutcome: 'Reject',
        rounds: [round(0)],
      }),
    ])
    assert.deepEqual(summary(attentionFor([item2], CAROL, 10_000, period)), [
      ['removal-requested', 'action', 9_000 + 302_400],
    ])
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

describe('court periods', () => {
  // A first round, and an appeal round (the first appeal was funded).
  const firstRound = request({ rounds: [round(0), round(1)] })
  const appealed = request({
    rounds: [
      round(0),
      appealRound({ appealed: true, hasPaidRequester: true, hasPaidChallenger: true }),
      round(2),
    ],
  })
  const court = (period: string) => ({ period, deadline: 90_000 })

  it('gives an evidence deadline in the first round only', () => {
    assert.deepEqual(courtDeadline(firstRound, court('evidence')), {
      label: 'Evidence period ends',
      at: 90_000,
      latest: false,
    })
    // In an appeal round anyone can start voting once jurors are drawn.
    assert.equal(courtDeadline(appealed, court('evidence')), undefined)
    const [entry] = attentionFor([item(appealed)], ALICE, 50_000)
    assert.equal(entry.kind, 'challenged')
    assert.equal(
      describeAttention(entry).body,
      "It is dispute #1013 in the Kleros court, in an appeal round: voting can start as soon as jurors are drawn, so add your side's evidence on the item page now.",
    )
    assert.equal(
      describeAttention(attentionFor([item(appealed)], BOB, 50_000)[0], {
        period: 'evidence',
      }).body,
      'Both sides can add evidence. Voting can start as soon as jurors are drawn.',
    )
    // The first round keeps its evidence period.
    assert.match(
      describeAttention(attentionFor([item(firstRound)], ALICE, 50_000)[0])
        .body,
      /before voting starts\.$/,
    )
  })

  it('marks commit and vote ends as the latest, and the appeal end as exact', () => {
    assert.deepEqual(courtDeadline(appealed, court('commit')), {
      label: 'Commit period ends',
      at: 90_000,
      latest: true,
    })
    assert.deepEqual(courtDeadline(firstRound, court('vote')), {
      label: 'Voting ends',
      at: 90_000,
      latest: true,
    })
    assert.deepEqual(courtDeadline(firstRound, court('appeal')), {
      label: 'Appeal period ends',
      at: 90_000,
      latest: false,
    })
    assert.equal(courtDeadline(firstRound, court('execution')), undefined)
  })

  it('says the appeal period is open while it is', () => {
    // E.g. the submitter of an item whose removal is disputed.
    const entry = attentionFor([item(firstRound)], BOB, 50_000)[0]
    assert.equal(
      describeAttention(entry, { period: 'appeal' }).body,
      'The ruling is in; the appeal period is open.',
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
