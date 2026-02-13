export const registryMap: Record<string, string> = {
  'single-tags': '0x66260c69d03837016d88c9877e61e08ef74c59f2',
  'tags-queries': '0xae6aaed5434244be3699c56e7ebc828194f26dc3',
  'cdn': '0x957a53a994860be4750810131d9c876b2f52d6e1',
  'tokens': '0xee1502e29795ef6c2d60f8d7120596abe3bad990',
}

export const revRegistryMap: Record<string, string> = {
  '0x66260c69d03837016d88c9877e61e08ef74c59f2': 'single-tags',
  '0xae6aaed5434244be3699c56e7ebc828194f26dc3': 'tags-queries',
  '0x957a53a994860be4750810131d9c876b2f52d6e1': 'cdn',
  '0xee1502e29795ef6c2d60f8d7120596abe3bad990': 'tokens',
}

/** Human-readable display names for registry keys */
export const registryDisplayNames: Record<string, string> = {
  'single-tags': 'Single Tags',
  'tags-queries': 'Tag Queries',
  'cdn': 'CDN',
  'tokens': 'Tokens',
}

/** Converts a composite subgraph ID (itemID@registryAddress) into a clean URL path.
 *  Also accepts a bare itemID + separate registryAddress for cases where `id` isn't available. */
export const buildItemPath = (compositeId: string, registryAddr?: string) => {
  if (compositeId?.includes('@')) {
    const [itemID, registryAddress] = compositeId.split('@')
    const name = revRegistryMap[registryAddress] || registryAddress
    return `/${name}/${itemID}`
  }
  const name = registryAddr ? (revRegistryMap[registryAddr] || registryAddr) : 'unknown'
  return `/${name}/${compositeId}`
}

/** Navigation menu options for registry selection */
export const registryNavOptions = [
  { label: 'Tokens', value: 'tokens' },
  { label: 'Contract Domain Name', value: 'cdn' },
  { label: 'Address Tags - Single Tags', value: 'single-tags' },
  { label: 'Address Tags - Query Tags', value: 'tags-queries' },
]

/** Maps subgraph status values to human-readable display strings */
export const readableStatusMap: Record<string, string> = {
  Registered: 'Included',
  Absent: 'Removed',
  RegistrationRequested: 'Registration Requested',
  ClearingRequested: 'Removal Requested',
}

export const challengedStatusMap: Record<string, string> = {
  RegistrationRequested: 'Challenged Submission',
  ClearingRequested: 'Challenged Removal',
}

/** Returns the display status string for an item */
export const getDisplayStatus = (status: string, disputed: boolean): string => {
  if (disputed) return challengedStatusMap[status] || 'Challenged'
  return readableStatusMap[status] || status
}

/** Tooltip descriptions for each display status */
export const statusDescriptionMap: Record<string, string> = {
  'Included': 'The item is in the registry and considered valid under the list policy.',
  'Registration Requested': 'Pending registration. Can be challenged if it breaks the policy.',
  'Removal Requested': 'Pending removal. Can be challenged if it complies with the policy and still belongs to the registry.',
  'Removed': 'The item is not in the registry and does not comply with the policy.',
  'Challenged Submission': 'This request has been challenged. It is waiting for evidence and an arbitrator\'s final decision.',
  'Challenged Removal': 'This removal request has been challenged. It is waiting for evidence and an arbitrator\'s final decision.',
}

/** Tooltip descriptions for the bounty/reward amount next to status */
export const bountyDescriptionMap: Record<string, string> = {
  'ClearingRequested': 'Reward for successfully challenging this pending removal if the item complies with the list policy.',
  'RegistrationRequested': 'Reward for successfully challenging this pending submission if it does not comply with the list policy.',
}

/** Resolves a registry address to its registry key */
export const getRegistryKey = (registryAddress: string): string | undefined =>
  revRegistryMap[registryAddress]

/** Gets a prop value from an item by label */
export const getPropValue = (item: { props?: Array<{ label: string; value: string }> }, label: string): string =>
  item.props?.find((p) => p.label === label)?.value ?? ''

/** Gets the contract/token address from an item based on its registry type */
export const getItemAddress = (item: { props?: Array<{ label: string; value: string }> }, registryKey: string): string | undefined => {
  const addressLabels: Record<string, string> = {
    'single-tags': 'Contract Address',
    'tokens': 'Address',
    'cdn': 'Contract address',
  }
  const label = addressLabels[registryKey]
  return label ? getPropValue(item, label) || undefined : undefined
}

/** Gets the display name for an item based on its registry type */
export const getItemDisplayName = (item: { props?: Array<{ label: string; value: string }>; itemID?: string }, registryKey: string): string => {
  if (registryKey === 'tokens') return getPropValue(item, 'Symbol') || getPropValue(item, 'Name') || 'Unnamed'
  if (registryKey === 'cdn') return getPropValue(item, 'Domain name') || 'Unnamed'
  if (registryKey === 'single-tags') return getPropValue(item, 'Project Name') || getPropValue(item, 'Public Name Tag') || 'Unnamed'
  if (registryKey === 'tags-queries') return getPropValue(item, 'Description') || 'Unnamed'
  return 'Unnamed'
}

/** Extracts the chain ID from an item's key0 field (format: "eip155:chainId:0x...") */
export const getChainId = (item: { key0?: string }): string | undefined => {
  const parts = item?.key0?.split(':')
  return parts?.[1]
}

export interface GraphItem {
  id: string
  latestRequestSubmissionTime: string
  registryAddress: string
  itemID: string
  status:
    | 'Registered'
    | 'Absent'
    | 'RegistrationRequested'
    | 'ClearingRequested'
  disputed: boolean
  data: string
  key0: string
  key1: string
  key2: string
  key3: string
  key4: string
  props: Prop[]
  requests: Request[]
}

export interface Prop {
  value: string
  type: string
  label: string
  description: string
  isIdentifier: boolean
}

export interface Request {
  requestType?: string
  disputed: boolean
  disputeID: string
  submissionTime: string
  resolved: boolean
  requester: string
  challenger: string
  resolutionTime: string
  deposit: string
  creationTx: string
  rounds: Round[]
}

export interface Round {
  appealPeriodStart: string
  appealPeriodEnd: string
  ruling: string
  hasPaidRequester: boolean
  hasPaidChallenger: boolean
  amountPaidRequester: string
  amountPaidChallenger: string
}
