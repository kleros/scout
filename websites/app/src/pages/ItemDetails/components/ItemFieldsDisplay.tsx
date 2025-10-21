import React, { useMemo } from 'react'
import styled from 'styled-components'
import { registryMap } from 'utils/items'

const FieldsContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 24px;
  margin: 0;
  padding: 0 0 16px 0;
  background: transparent;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  margin-bottom: 16px;
`

const FieldItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const FieldLabel = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
`

const FieldValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  word-break: break-word;
`

interface ItemFieldsDisplayProps {
  detailsData: any
  registryParsedFromItemId: string
}

const ItemFieldsDisplay: React.FC<ItemFieldsDisplayProps> = ({
  detailsData,
  registryParsedFromItemId,
}) => {
  const fieldsToDisplay = useMemo(() => {
    const getPropValue = (label: string) => {
      return detailsData?.props?.find((prop: any) => prop.label === label)?.value || ''
    }

    const fields: { label: string; value: string }[] = []

    if (registryParsedFromItemId === registryMap.Tokens) {
      // Tokens: Show Decimals (not shown in card)
      const decimals = getPropValue('Decimals')
      if (decimals) {
        fields.push({ label: 'Decimals', value: decimals })
      }
    } else if (registryParsedFromItemId === registryMap.Single_Tags) {
      // Address Tags: Show Public Note (not shown in card)
      const publicNote = getPropValue('Public Note')
      if (publicNote) {
        fields.push({ label: 'Public Note', value: publicNote })
      }
    } else if (registryParsedFromItemId === registryMap.Tags_Queries) {
      // Tags Queries: Show Commit hash (not shown in card)
      const commitHash = getPropValue('Commit hash')
      if (commitHash) {
        fields.push({ label: 'Commit Hash', value: commitHash })
      }
    }
    // CDN has all fields shown in card, so nothing to add

    return fields
  }, [detailsData, registryParsedFromItemId])

  // Don't render if there are no fields to display
  if (fieldsToDisplay.length === 0) {
    return null
  }

  return (
    <FieldsContainer>
      {fieldsToDisplay.map((field) => (
        <FieldItem key={field.label}>
          <FieldLabel>{field.label}:</FieldLabel>
          <FieldValue>{field.value}</FieldValue>
        </FieldItem>
      ))}
    </FieldsContainer>
  )
}

export default ItemFieldsDisplay
