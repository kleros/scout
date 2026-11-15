import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { chains } from 'utils/chains'

export type DateRangeOption = 'all' | '7d' | '30d' | '90d' | '1y' | 'custom'

export interface FilterState {
  status: string[]
  disputed: string[]
  hasEverBeenDisputed: boolean
  page: number
  orderDirection: string
  text: string
  dateRange: DateRangeOption
  customDateFrom: string | null
  customDateTo: string | null
  /** Chain ids to show, plus 'unknown' for addresses on chains Scout does not list. */
  chainFilters: string[]
}

export interface FilterActions {
  setStatus: (status: string[]) => void
  toggleStatus: (status: string) => void
  setDisputed: (disputed: string[]) => void
  toggleDisputed: (disputed: string) => void
  toggleHasEverBeenDisputed: () => void
  setChallengeFilters: (disputed: string[], hasEverBeenDisputed: boolean) => void
  setPage: (page: number) => void
  setOrderDirection: (dir: string) => void
  setText: (text: string) => void
  setDateRange: (range: DateRangeOption) => void
  setCustomDateRange: (from: string | null, to: string | null) => void
  setChainFilters: (chainFilters: string[]) => void
  /** Restores every filter, the sort and the networks to their defaults. Keeps the search text. */
  resetFilters: () => void
}

export type FilterSlice = FilterState & FilterActions

/** Every network the Filters dialog offers: the chains in use, and "Unknown chains". */
export const ALL_NETWORK_FILTERS: string[] = [
  ...chains.filter((c) => !c.deprecated).map((c) => c.id),
  'unknown',
]

const REGISTRY_DEFAULTS: FilterState = {
  status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
  disputed: ['true', 'false'],
  hasEverBeenDisputed: false,
  page: 1,
  orderDirection: 'desc',
  text: '',
  dateRange: 'all',
  customDateFrom: null,
  customDateTo: null,
  chainFilters: ALL_NETWORK_FILTERS,
}

const PROFILE_DEFAULTS: FilterState = {
  status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
  disputed: ['true', 'false'],
  hasEverBeenDisputed: false,
  page: 1,
  orderDirection: 'desc',
  text: '',
  dateRange: 'all',
  customDateFrom: null,
  customDateTo: null,
  chainFilters: ALL_NETWORK_FILTERS,
}

type Update = (fn: (prev: FilterState) => FilterState) => void

function useFilterActions(update: Update, defaults: FilterState): FilterActions {
  const setStatus = useCallback((status: string[]) => {
    update(prev => ({ ...prev, status, page: 1 }))
  }, [update])

  const toggleStatus = useCallback((s: string) => {
    update(prev => ({
      ...prev,
      status: prev.status.includes(s) ? prev.status.filter(x => x !== s) : [...prev.status, s],
      page: 1,
    }))
  }, [update])

  const setDisputed = useCallback((disputed: string[]) => {
    update(prev => ({
      ...prev,
      // Prevent removing 'false' (Unchallenged) while "Previously Disputed" is active
      disputed: prev.hasEverBeenDisputed && !disputed.includes('false')
        ? [...disputed, 'false']
        : disputed,
      page: 1,
    }))
  }, [update])

  const toggleDisputed = useCallback((d: string) => {
    update(prev => {
      // Prevent unchecking 'false' (Unchallenged) while "Previously Disputed" is active
      if (d === 'false' && prev.hasEverBeenDisputed && prev.disputed.includes('false')) {
        return prev
      }
      return {
        ...prev,
        disputed: prev.disputed.includes(d) ? prev.disputed.filter(x => x !== d) : [...prev.disputed, d],
        page: 1,
      }
    })
  }, [update])

  const toggleHasEverBeenDisputed = useCallback(() => {
    update(prev => {
      const next = !prev.hasEverBeenDisputed
      return {
        ...prev,
        hasEverBeenDisputed: next,
        // When enabling "Previously Disputed", ensure "Unchallenged" is selected
        // since resolved disputes have disputed=false
        disputed: next && !prev.disputed.includes('false')
          ? [...prev.disputed, 'false']
          : prev.disputed,
        // When enabling, also ensure "Absent" (Removed/Rejected) is selected
        // since many previously challenged items end up removed
        status: next && !prev.status.includes('Absent')
          ? [...prev.status, 'Absent']
          : prev.status,
        page: 1,
      }
    })
  }, [update])

  const setChallengeFilters = useCallback((disputed: string[], hasEverBeenDisputed: boolean) => {
    update(prev => ({
      ...prev,
      disputed: hasEverBeenDisputed && !disputed.includes('false')
        ? [...disputed, 'false']
        : disputed,
      hasEverBeenDisputed,
      // When enabling previously disputed, ensure "Absent" (Removed/Rejected) is selected
      status: hasEverBeenDisputed && !prev.status.includes('Absent')
        ? [...prev.status, 'Absent']
        : prev.status,
      page: 1,
    }))
  }, [update])

  const setPage = useCallback((page: number) => {
    update(prev => ({ ...prev, page }))
  }, [update])

  const setOrderDirection = useCallback((orderDirection: string) => {
    update(prev => ({ ...prev, orderDirection, page: 1 }))
  }, [update])

  const setText = useCallback((text: string) => {
    update(prev => ({ ...prev, text, page: 1 }))
  }, [update])

  const setDateRange = useCallback((dateRange: DateRangeOption) => {
    update(prev => ({
      ...prev,
      dateRange,
      // Clear custom dates when switching to a preset
      customDateFrom: dateRange === 'custom' ? prev.customDateFrom : null,
      customDateTo: dateRange === 'custom' ? prev.customDateTo : null,
      page: 1,
    }))
  }, [update])

  const setCustomDateRange = useCallback((from: string | null, to: string | null) => {
    update(prev => ({ ...prev, dateRange: 'custom' as DateRangeOption, customDateFrom: from, customDateTo: to, page: 1 }))
  }, [update])

  const setChainFilters = useCallback((chainFilters: string[]) => {
    update(prev => ({ ...prev, chainFilters, page: 1 }))
  }, [update])

  const resetFilters = useCallback(() => {
    update(prev => ({ ...defaults, text: prev.text }))
  }, [update, defaults])

  return useMemo(() => ({
    setStatus, toggleStatus,
    setDisputed, toggleDisputed,
    toggleHasEverBeenDisputed, setChallengeFilters,
    setPage, setOrderDirection, setText,
    setDateRange, setCustomDateRange,
    setChainFilters, resetFilters,
  }), [
    setStatus, toggleStatus, setDisputed, toggleDisputed, toggleHasEverBeenDisputed,
    setChallengeFilters, setPage, setOrderDirection, setText, setDateRange,
    setCustomDateRange, setChainFilters, resetFilters,
  ])
}

/** Filters kept in component state (the profile page). */
function useLocalFilterSlice(defaults: FilterState): FilterSlice {
  const [state, setState] = useState<FilterState>(defaults)
  const actions = useFilterActions(setState, defaults)
  return useMemo(() => ({ ...state, ...actions }), [state, actions])
}

/*
 * Registry list filters live in the address bar, so a reload keeps them, a filtered view can be
 * shared, and Back from an item returns to the same page. The names are the ones the app used
 * before the filters moved into memory (status, disputed, text, page, orderDirection), so links
 * made then still work; defaults are left out, so /tokens stays /tokens. Other parameters
 * (attachment, isPolicy, policyTx...) are kept as they are.
 */
const STATUS_VALUES = ['Registered', 'RegistrationRequested', 'ClearingRequested', 'Absent']
const DISPUTED_VALUES = ['true', 'false']
const DATE_RANGE_VALUES: DateRangeOption[] = ['all', '7d', '30d', '90d', '1y', 'custom']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const FILTER_PARAMS = [
  'text', 'status', 'disputed', 'hasEverBeenDisputed', 'orderDirection',
  'dateRange', 'dateFrom', 'dateTo', 'network', 'page',
]

/** The allowed values a repeated (or comma-separated) parameter names, in their usual order. */
const readList = (params: URLSearchParams, key: string, allowed: string[], fallback: string[]): string[] => {
  if (!params.has(key)) return fallback
  const given = params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return allowed.filter((value) => given.includes(value.toLowerCase()))
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value) => b.includes(value))

export const readFilterParams = (params: URLSearchParams, defaults: FilterState = REGISTRY_DEFAULTS): FilterState => {
  const hasEverBeenDisputed = params.get('hasEverBeenDisputed') === 'true'
  const disputed = readList(params, 'disputed', DISPUTED_VALUES, defaults.disputed)
  const requestedRange = params.get('dateRange') as DateRangeOption | null
  const dateRange = requestedRange && DATE_RANGE_VALUES.includes(requestedRange) ? requestedRange : defaults.dateRange
  const dateFrom = params.get('dateFrom')
  const dateTo = params.get('dateTo')
  const page = Number(params.get('page'))

  return {
    text: params.get('text') ?? defaults.text,
    status: readList(params, 'status', STATUS_VALUES, defaults.status),
    // "Previously challenged" items are unchallenged now, so that box stays ticked with it.
    disputed: hasEverBeenDisputed && !disputed.includes('false') ? [...disputed, 'false'] : disputed,
    hasEverBeenDisputed,
    orderDirection: params.get('orderDirection') === 'asc' ? 'asc' : 'desc',
    dateRange,
    customDateFrom: dateRange === 'custom' && dateFrom && ISO_DATE.test(dateFrom) ? dateFrom : null,
    customDateTo: dateRange === 'custom' && dateTo && ISO_DATE.test(dateTo) ? dateTo : null,
    chainFilters: readList(params, 'network', ALL_NETWORK_FILTERS, defaults.chainFilters),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export const writeFilterParams = (
  current: URLSearchParams,
  state: FilterState,
  defaults: FilterState = REGISTRY_DEFAULTS,
): URLSearchParams => {
  const next = new URLSearchParams(current)
  FILTER_PARAMS.forEach((key) => next.delete(key))

  // An empty selection is kept as "status=" so it survives a reload (absent means the default).
  const writeList = (key: string, values: string[], fallback: string[]) => {
    if (sameSet(values, fallback)) return
    if (values.length === 0) next.set(key, '')
    else values.forEach((value) => next.append(key, value))
  }

  if (state.text) next.set('text', state.text)
  writeList('status', state.status, defaults.status)
  writeList('disputed', state.disputed, defaults.disputed)
  if (state.hasEverBeenDisputed) next.set('hasEverBeenDisputed', 'true')
  if (state.orderDirection === 'asc') next.set('orderDirection', 'asc')
  if (state.dateRange !== 'all') next.set('dateRange', state.dateRange)
  if (state.dateRange === 'custom' && state.customDateFrom) next.set('dateFrom', state.customDateFrom)
  if (state.dateRange === 'custom' && state.customDateTo) next.set('dateTo', state.customDateTo)
  writeList('network', state.chainFilters, defaults.chainFilters)
  if (state.page > 1) next.set('page', String(state.page))
  return next
}

/** Filters kept in the URL query string (the registry lists). */
function useUrlFilterSlice(defaults: FilterState): FilterSlice {
  const { search } = useLocation()
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const state = useMemo(
    () => readFilterParams(new URLSearchParams(search), defaults),
    [search, defaults],
  )

  const update = useCallback<Update>((fn) => {
    // Read the address bar, not the last render: several changes made in one event (Reset, then
    // the networks) then build on each other instead of the last one winning.
    const current = new URLSearchParams(window.location.search)
    const next = writeFilterParams(current, fn(readFilterParams(current, defaults)), defaults)
    const nextSearch = next.toString()
    if (nextSearch === current.toString()) return
    // Replace, so Back leaves the list instead of stepping through every tick of a checkbox.
    navigateRef.current({ search: nextSearch ? `?${nextSearch}` : '' }, { replace: true })
  }, [defaults])

  const actions = useFilterActions(update, defaults)
  return useMemo(() => ({ ...state, ...actions }), [state, actions])
}

/**
 * How many groups of the Filters dialog narrow the list compared with their defaults (statuses,
 * challenge, date, networks), for the count on the Filters button. The sort order is not a filter.
 */
export const getActiveFilterCount = (
  filters: Pick<FilterState, 'status' | 'disputed' | 'hasEverBeenDisputed' | 'dateRange'>,
  chainFilters: string[],
): number => {
  const defaults = REGISTRY_DEFAULTS
  return [
    !sameSet(filters.status, defaults.status),
    !sameSet(filters.disputed, defaults.disputed) || filters.hasEverBeenDisputed !== defaults.hasEverBeenDisputed,
    filters.dateRange !== defaults.dateRange,
    !sameSet(chainFilters, defaults.chainFilters),
  ].filter(Boolean).length
}

interface FilterContextValue {
  registry: FilterSlice
  profile: FilterSlice
}

const FilterContext = createContext<FilterContextValue | null>(null)

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const registry = useUrlFilterSlice(REGISTRY_DEFAULTS)
  const profile = useLocalFilterSlice(PROFILE_DEFAULTS)
  const value = useMemo(() => ({ registry, profile }), [registry, profile])

  return (
    <FilterContext.Provider value={value}>
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

export const DATE_RANGE_PRESETS: { value: DateRangeOption; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'custom', label: 'Custom' },
]

const DATE_RANGE_MS: Record<string, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
}

/** Returns ISO date strings (e.g. '2025-01-15') for a preset range, or null for 'all'/'custom'. */
export const getPresetDates = (preset: DateRangeOption): { from: string | null; to: string | null } => {
  if (preset === 'all' || preset === 'custom') return { from: null, to: null }
  const fromDate = new Date(Date.now() - DATE_RANGE_MS[preset])
  return { from: fromDate.toISOString().split('T')[0], to: null }
}

/** Returns a Unix timestamp (seconds) for the start of the given date range, or 0 for 'all'/'custom'. */
export const getDateRangeTimestamp = (range: DateRangeOption): number => {
  if (range === 'all' || range === 'custom') return 0
  return Math.floor((Date.now() - DATE_RANGE_MS[range]) / 1000)
}

/** Returns Unix timestamps (seconds) for custom date range boundaries. */
export const getCustomDateTimestamps = (from: string | null, to: string | null): { fromTs: number; toTs: number } => {
  const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : 0
  // Set "to" to end of day (23:59:59) so the selected date is inclusive
  const toTs = to ? Math.floor((new Date(to).getTime() + 86400000 - 1000) / 1000) : 0
  return { fromTs, toTs }
}
