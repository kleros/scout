import React, { useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { usePolicyHistory } from 'hooks/usePolicyHistory'
import { registryMap } from 'utils/items'
import { formatUpdatedAgo, POLICY_RECENT_THRESHOLD_DAYS } from 'utils/date'

const Suffix = styled.span<{ $recent: boolean }>`
  margin-left: 6px;
  color: ${({ theme, $recent }) => ($recent ? theme.warning : theme.tertiaryText)};
  font-weight: ${({ $recent }) => ($recent ? 600 : 400)};
`

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`

const LoadingSuffix = styled.span`
  margin-left: 6px;
  color: ${({ theme }) => theme.tertiaryText};
  font-style: italic;
  animation: ${pulse} 1.4s ease-in-out infinite;
`

interface PolicyUpdatedBadgeProps {
  registryName?: string | null
}

const PolicyUpdatedBadge: React.FC<PolicyUpdatedBadgeProps> = ({ registryName }) => {
  const registryAddress = registryName ? registryMap[registryName] : undefined
  const { data: historyData, isLoading, isFetching } = usePolicyHistory(
    registryAddress,
    'latest',
  )

  const updatedInfo = useMemo(() => {
    const current = historyData?.[0]
    if (!current) return null
    return formatUpdatedAgo(current.startDate)
  }, [historyData])

  if (!registryAddress) return null

  if (updatedInfo) {
    return (
      <Suffix $recent={updatedInfo.days < POLICY_RECENT_THRESHOLD_DAYS}>
        ({updatedInfo.text})
      </Suffix>
    )
  }

  // No cached data yet — show a subtle status while we fetch it.
  if (isLoading || isFetching) {
    return <LoadingSuffix>(fetching update…)</LoadingSuffix>
  }

  return null
}

export default PolicyUpdatedBadge
