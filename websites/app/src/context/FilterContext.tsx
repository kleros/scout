import React, { createContext, useContext, useState, useCallback } from 'react'

export type DateRangeOption = 'all' | '7d' | '30d' | '90d' | '1y'

export interface FilterState {
  status: string[]
  disputed: string[]
  hasEverBeenDisputed: boolean
  page: number
  orderDirection: string
  text: string
  dateRange: DateRangeOption
}

export interface FilterActions {
  setStatus: (status: string[]) => void
  toggleStatus: (status: string) => void
  setDisputed: (disputed: string[]) => void
  toggleDisputed: (disputed: string) => void
  toggleHasEverBeenDisputed: () => void
  setPage: (page: number) => void
  setOrderDirection: (dir: string) => void
  setText: (text: string) => void
  setDateRange: (range: DateRangeOption) => void
}

export type FilterSlice = FilterState & FilterActions

const REGISTRY_DEFAULTS: FilterState = {
  status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
  disputed: ['true', 'false'],
  hasEverBeenDisputed: false,
  page: 1,
  orderDirection: 'desc',
  text: '',
  dateRange: 'all',
}

const PROFILE_DEFAULTS: FilterState = {
  status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
  disputed: ['true', 'false'],
  hasEverBeenDisputed: false,
  page: 1,
  orderDirection: 'desc',
  text: '',
  dateRange: 'all',
}

function useFilterSlice(defaults: FilterState): FilterSlice {
  const [state, setState] = useState<FilterState>(defaults)

  const setStatus = useCallback((status: string[]) => {
    setState(prev => ({ ...prev, status, page: 1 }))
  }, [])

  const toggleStatus = useCallback((s: string) => {
    setState(prev => ({
      ...prev,
      status: prev.status.includes(s) ? prev.status.filter(x => x !== s) : [...prev.status, s],
      page: 1,
    }))
  }, [])

  const setDisputed = useCallback((disputed: string[]) => {
    setState(prev => ({ ...prev, disputed, page: 1 }))
  }, [])

  const toggleDisputed = useCallback((d: string) => {
    setState(prev => ({
      ...prev,
      disputed: prev.disputed.includes(d) ? prev.disputed.filter(x => x !== d) : [...prev.disputed, d],
      page: 1,
    }))
  }, [])

  const toggleHasEverBeenDisputed = useCallback(() => {
    setState(prev => ({ ...prev, hasEverBeenDisputed: !prev.hasEverBeenDisputed, page: 1 }))
  }, [])

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }))
  }, [])

  const setOrderDirection = useCallback((orderDirection: string) => {
    setState(prev => ({ ...prev, orderDirection, page: 1 }))
  }, [])

  const setText = useCallback((text: string) => {
    setState(prev => ({ ...prev, text, page: 1 }))
  }, [])

  const setDateRange = useCallback((dateRange: DateRangeOption) => {
    setState(prev => ({ ...prev, dateRange, page: 1 }))
  }, [])

  return {
    ...state,
    setStatus, toggleStatus,
    setDisputed, toggleDisputed,
    toggleHasEverBeenDisputed,
    setPage, setOrderDirection, setText,
    setDateRange,
  }
}

interface FilterContextValue {
  registry: FilterSlice
  profile: FilterSlice
}

const FilterContext = createContext<FilterContextValue | null>(null)

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const registry = useFilterSlice(REGISTRY_DEFAULTS)
  const profile = useFilterSlice(PROFILE_DEFAULTS)

  return (
    <FilterContext.Provider value={{ registry, profile }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = (scope: 'registry' | 'profile'): FilterSlice => {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider')
  return scope === 'registry' ? ctx.registry : ctx.profile
}

export const useRegistryFilters = (): FilterSlice => useFilters('registry')
export const useProfileFilters = (): FilterSlice => useFilters('profile')

/** Returns a Unix timestamp (seconds) for the start of the given date range, or 0 for 'all'. */
export const getDateRangeTimestamp = (range: DateRangeOption): number => {
  if (range === 'all') return 0
  const now = Date.now()
  const msMap: Record<string, number> = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  }
  return Math.floor((now - msMap[range]) / 1000)
}
