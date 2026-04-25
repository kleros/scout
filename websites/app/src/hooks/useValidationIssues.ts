import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import getAddressValidationIssue, { Issue } from 'utils/validateAddress'
import { RegistryKey } from 'utils/items'
import { useDebouncedValue } from './useDebouncedValue'

export interface ValidationParams {
  chainId: string
  registry: RegistryKey
  address?: string
  domain?: string
  projectName?: string
  publicNameTag?: string
  link?: string
  symbol?: string
}

export const useValidationIssues = (params: ValidationParams) => {
  const { chainId, registry } = params
  const address = useDebouncedValue(params.address ?? '')
  const domain = useDebouncedValue(params.domain ?? '')
  const projectName = useDebouncedValue(params.projectName ?? '')
  const publicNameTag = useDebouncedValue(params.publicNameTag ?? '')
  const link = useDebouncedValue(params.link ?? '')
  const symbol = useDebouncedValue(params.symbol ?? '')

  const cacheKey = `addressIssues:${chainId}:${address}:${registry}:${domain}:${projectName}:${publicNameTag}:${link}:${symbol}`

  const cachedIssues = useMemo<Issue | null>(() => {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    try {
      return JSON.parse(cached)
    } catch {
      localStorage.removeItem(cacheKey)
      return null
    }
  }, [cacheKey])

  return useQuery({
    queryKey: [
      'addressissues',
      chainId,
      registry,
      address,
      domain,
      projectName,
      publicNameTag,
      link,
      symbol,
    ],
    queryFn: async () => {
      const res = await getAddressValidationIssue(
        chainId,
        registry,
        address,
        domain,
        projectName,
        publicNameTag,
        link,
        symbol,
      )
      localStorage.setItem(cacheKey, JSON.stringify(res))
      return res
    },
    enabled: Boolean(
      address || domain || projectName || publicNameTag || link || symbol,
    ),
    placeholderData: cachedIssues,
  })
}
