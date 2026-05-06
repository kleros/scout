import { toFunctionSelector, decodeEventLog, type AbiFunction } from 'viem'
import { klerosCurateAbi } from 'hooks/contracts/generated'
import { revRegistryMap, registryDisplayNames } from './items'

export interface DecodedOperation {
  operationType: string
  /** True if the tx triggers a challenge/waiting period that's worth surfacing. */
  showPeriod: boolean
  /** True if we resolved the tx to a registry (either directly or via emitted logs). */
  isKnownRegistry: boolean
  /**
   * True only when `tx.to` itself is a registry. False for the resolution-via-arbitrator case
   * where the registry was inferred from event logs — in that case `tx.to` is the arbitrator,
   * not the registry, so labeling `tx.to` as "{Registry} Registry" would be misleading.
   */
  isDirectRegistryCall: boolean
  registryKey?: string
  registryDisplayName?: string
}

// Read selectors straight from the ABI so they can't drift if the contract is
// regenerated. Using hand-written signatures previously caused bugs (e.g.
// addItem is addItem(string) on LightGTCR, not addItem(bytes)).
const selectorFor = (name: string): `0x${string}` => {
  const item = (klerosCurateAbi as readonly unknown[]).find(
    (i): i is AbiFunction =>
      typeof i === 'object' && i !== null && (i as AbiFunction).type === 'function' &&
      (i as AbiFunction).name === name,
  )
  if (!item) throw new Error(`decodeTxOperation: ABI entry missing for ${name}`)
  return toFunctionSelector(item)
}

const selectors = {
  addItem: selectorFor('addItem'),
  removeItem: selectorFor('removeItem'),
  challengeRequest: selectorFor('challengeRequest'),
  submitEvidence: selectorFor('submitEvidence'),
  fundAppeal: selectorFor('fundAppeal'),
  executeRequest: selectorFor('executeRequest'),
} as const

// Pre-computed event topic0 hashes (keccak256 of the canonical signature).
// Used to identify Scout-related events emitted in a tx, even when the user called a
// helper/router contract (so `tx.to` isn't a registry).
const TOPIC_ITEM_STATUS_CHANGE =
  '0xd768d67a683a3f5110d48ee5af827e22f4f36d017d764d3bfb11982492b19536'
const TOPIC_CONTRIBUTION =
  '0x0388febb25c47b8b6fc7ecbe1dd210dfab59161d1d25992a642333d0792ab776'
const TOPIC_NEW_ITEM =
  '0x93e4d3e9542ddd9eea8962241d920b12b96bce26749667189fd06ed3549019e1'
const TOPIC_EVIDENCE =
  '0xdccf2f8b2cc26eafcd61905cba744cff4b81d14740725f6376390dc6298a6a3c'
const TOPIC_REQUEST_SUBMITTED =
  '0x73057048557c37c893f346985dc1d461cf12b00f09397bb275613203124c2be1'
const TOPIC_APPEAL_POSSIBLE =
  '0xa5d41b970d849372be1da1481ffd78d162bfe57a7aa2fe4e5fb73481fa5ac24f'
const TOPIC_APPEAL_DECISION =
  '0x9c9b64db9e130f48381bf697abf638e73117dbfbfd7a4484f2da3ba188f4187d'

/** Extract a 20-byte address from an indexed event topic (32 bytes, last 20 are the address). */
const addressFromTopic = (topic: string | undefined): string | undefined => {
  if (!topic || topic.length !== 66) return undefined
  return ('0x' + topic.slice(26)).toLowerCase()
}

const buildIndirectOp = (
  operationType: string,
  registryKey: string,
  showPeriod = false,
): DecodedOperation => ({
  operationType,
  showPeriod,
  isKnownRegistry: true,
  isDirectRegistryCall: false,
  registryKey,
  registryDisplayName: registryDisplayNames[registryKey],
})

interface EventLog {
  address: string
  topics: readonly `0x${string}`[]
  data: `0x${string}`
}

export const decodeTxOperation = (
  input: `0x${string}` | undefined,
  to: string | null,
  logs?: readonly EventLog[],
): DecodedOperation => {
  const selector = input && input.length >= 10
    ? (input.slice(0, 10).toLowerCase() as `0x${string}`)
    : undefined
  const directRegistryKey = to ? revRegistryMap[to.toLowerCase()] : undefined

  // ── Path A: tx.to is a registry — use the function selector, the most reliable signal.
  if (directRegistryKey) {
    let operationType = 'Contract Interaction'
    let showPeriod = false

    switch (selector) {
      case selectors.addItem:
        operationType = 'Item Submission'
        showPeriod = true
        break
      case selectors.removeItem:
        operationType = 'Removal Request'
        showPeriod = true
        break
      case selectors.challengeRequest:
        operationType = 'Request Challenge'
        break
      case selectors.submitEvidence:
        operationType = 'Evidence Submission'
        break
      case selectors.fundAppeal:
        operationType = 'Appeal Contribution'
        break
      case selectors.executeRequest:
        operationType = 'Request Execution'
        break
    }

    return {
      operationType,
      showPeriod,
      isKnownRegistry: true,
      isDirectRegistryCall: true,
      registryKey: directRegistryKey,
      registryDisplayName: registryDisplayNames[directRegistryKey],
    }
  }

  // ── Path B: tx.to is NOT a registry, but the receipt may carry events that tell us
  // exactly what happened. Two sources to check:
  //   1) Events emitted by a known registry (Contribution, NewItem, ItemStatusChange, …) —
  //      means a helper/router called the registry on the user's behalf.
  //   2) Arbitrator events (AppealPossible / AppealDecision) whose `_arbitrable` topic
  //      matches a known registry — these fire on jury rulings, no registry log involved.
  //
  // We collect every signal in one pass and decide at the end so priority handling is
  // explicit (e.g. ItemStatusChange beats Contribution if both somehow appear).
  if (logs) {
    let registryFromRegistryLog: string | undefined
    let registryFromArbitrableTopic: string | undefined
    let sawItemStatusChange = false
    let sawNewItem = false
    let sawEvidence = false
    let sawRequestSubmitted = false
    let sawAppealPossible = false
    let sawAppealDecision = false
    let contribution: { roundID: bigint; side: number } | undefined

    for (const log of logs) {
      const topic0 = (log.topics[0] ?? '').toLowerCase()
      const logAddr = log.address.toLowerCase()
      const registryAtLog = revRegistryMap[logAddr]

      if (registryAtLog) {
        registryFromRegistryLog = registryFromRegistryLog ?? registryAtLog

        if (topic0 === TOPIC_ITEM_STATUS_CHANGE) sawItemStatusChange = true
        else if (topic0 === TOPIC_NEW_ITEM) sawNewItem = true
        else if (topic0 === TOPIC_REQUEST_SUBMITTED) sawRequestSubmitted = true
        else if (topic0 === TOPIC_EVIDENCE) sawEvidence = true
        else if (topic0 === TOPIC_CONTRIBUTION && !contribution) {
          try {
            const decoded = decodeEventLog({
              abi: klerosCurateAbi,
              topics: log.topics,
              data: log.data,
            })
            if (decoded.eventName === 'Contribution') {
              const args = decoded.args as { _roundID?: bigint; _side?: number }
              if (typeof args._roundID === 'bigint' && typeof args._side === 'number') {
                contribution = { roundID: args._roundID, side: args._side }
              }
            }
          } catch {
            // Not a Contribution log shape we can decode — ignore.
          }
        }
      } else if (
        topic0 === TOPIC_APPEAL_POSSIBLE ||
        topic0 === TOPIC_APPEAL_DECISION
      ) {
        const arbitrable = addressFromTopic(log.topics[2])
        const arbRegistryKey = arbitrable ? revRegistryMap[arbitrable] : undefined
        if (arbRegistryKey) {
          registryFromArbitrableTopic = registryFromArbitrableTopic ?? arbRegistryKey
          if (topic0 === TOPIC_APPEAL_POSSIBLE) sawAppealPossible = true
          else sawAppealDecision = true
        }
      }
    }

    const registry = registryFromRegistryLog ?? registryFromArbitrableTopic
    if (registry) {
      // Priority order (most-specific outcome first):
      // 1. ItemStatusChange — item moved to a final state (resolution).
      if (sawItemStatusChange) return buildIndirectOp('Item Resolution', registry)
      // 2. NewItem — addItem via helper (NewItem fires only on addItem, never removeItem).
      if (sawNewItem) return buildIndirectOp('Item Submission', registry, true)
      // 3. Contribution — disambiguates by round + side.
      if (contribution) {
        if (contribution.roundID > 0n) {
          return buildIndirectOp('Appeal Contribution', registry)
        }
        // Round 0 = initial deposit. side=1 is requester (could be addItem OR removeItem,
        // but addItem case is already caught above by NewItem). side=2 is challenger.
        if (contribution.side === 2) {
          return buildIndirectOp('Request Challenge', registry)
        }
        // side=1, no NewItem: must be a removal request via helper.
        return buildIndirectOp('Removal Request', registry, true)
      }
      // 4. Evidence — evidence submission via helper.
      if (sawEvidence) return buildIndirectOp('Evidence Submission', registry)
      // 5. RequestSubmitted alone (no NewItem, no Contribution decoded) — best-guess
      // submission/removal context. Rare in practice.
      if (sawRequestSubmitted) return buildIndirectOp('Item Submission', registry, true)
      // 6. AppealPossible — arbitrator just announced a ruling on this registry's dispute.
      if (sawAppealPossible) return buildIndirectOp('Jury Decision', registry)
      // 7. AppealDecision — arbitrator moved a dispute to the next round.
      if (sawAppealDecision) return buildIndirectOp('Appeal Decision', registry)
    }
  }

  return {
    operationType: 'Contract Interaction',
    showPeriod: false,
    isKnownRegistry: false,
    isDirectRegistryCall: false,
  }
}
