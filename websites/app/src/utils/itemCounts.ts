import { DepositParams } from './fetchRegistryDeposits'

export interface RegistryMetadata {
  address: string
  tcrTitle: string
  tcrDescription: string
  policyURI: string
  logoURI: string
}

export interface FocusedRegistry {
  numberOfAbsent: number
  numberOfRegistered: number
  numberOfClearingRequested: number
  numberOfChallengedClearing: number
  numberOfRegistrationRequested: number
  numberOfChallengedRegistrations: number
  metadata: RegistryMetadata
  deposits: DepositParams
}

export interface ItemCounts {
  Single_Tags: FocusedRegistry
  Tags_Queries: FocusedRegistry
  CDN: FocusedRegistry
  Tokens: FocusedRegistry
}
