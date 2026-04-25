import { toFunctionSelector, type AbiFunction } from 'viem'
import { klerosCurateAbi } from 'hooks/contracts/generated'
import { revRegistryMap, registryDisplayNames } from './items'

export interface DecodedOperation {
  operationType: string
  /** True if the tx triggers a challenge/waiting period that's worth surfacing. */
  showPeriod: boolean
  /** True if the tx was sent to a known LightGTCR registry. */
  isKnownRegistry: boolean
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

export const decodeTxOperation = (
  input: `0x${string}` | undefined,
  to: string | null,
): DecodedOperation => {
  const selector = input && input.length >= 10
    ? (input.slice(0, 10).toLowerCase() as `0x${string}`)
    : undefined
  const registryKey = to ? revRegistryMap[to.toLowerCase()] : undefined
  const registryDisplayName = registryKey ? registryDisplayNames[registryKey] : undefined
  const isKnownRegistry = Boolean(registryKey)

  let operationType = 'Contract Interaction'
  let showPeriod = false

  if (isKnownRegistry) {
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
  }

  return { operationType, showPeriod, isKnownRegistry, registryKey, registryDisplayName }
}
