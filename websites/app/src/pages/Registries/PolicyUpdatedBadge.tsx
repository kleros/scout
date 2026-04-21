import React, { useMemo } from 'react'
import styled from 'styled-components'
import { usePolicyHistory } from 'hooks/usePolicyHistory'
import { registryMap } from 'utils/items'
import { formatUpdatedAgo, POLICY_RECENT_THRESHOLD_DAYS } from 'utils/date'

const Suffix = styled.span<{ $recent: boolean }>`
  margin-left: 6px;
  color: ${({ theme, $recent }) => ($recent ? theme.warning : theme.tertiaryText)};
  font-weight: ${({ $recent }) => ($recent ? 600 : 400)};
`

interface PolicyUpdatedBadgeProps {
  registryName?: string | null
}

const PolicyUpdatedBadge: React.FC<PolicyUpdatedBadgeProps> = ({ registryName }) => {
  const registryAddress = registryName ? registryMap[registryName] : undefined
  const { data: historyData } = usePolicyHistory(registryAddress)

  const updatedInfo = useMemo(() => {
    const current = historyData?.find((entry) => entry.endDate === null)
    if (!current) return null
    return formatUpdatedAgo(current.startDate)
  }, [historyData])

  if (!updatedInfo) return null

  return (
    <Suffix $recent={updatedInfo.days < POLICY_RECENT_THRESHOLD_DAYS}>
      ({updatedInfo.text})
    </Suffix>
  )
}

export default PolicyUpdatedBadge
