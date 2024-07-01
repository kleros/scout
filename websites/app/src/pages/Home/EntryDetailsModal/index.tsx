import React, { Suspense, lazy, useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import ReactMarkdown from 'react-markdown'
import { useSearchParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import { useFocusOutside } from 'hooks/useFocusOutside'
import { useQuery } from '@tanstack/react-query'
import { renderValue } from 'utils/renderValue'
import { statusColorMap } from 'utils/colorMappings'
import { fetchArbitrationCost } from 'utils/fetchArbitrationCost'
import { fetchItemCounts } from 'utils/itemCounts'
import { revRegistryMap } from 'utils/fetchItems'
import { fetchItemDetails } from 'utils/itemDetails'
import { formatTimestamp } from 'utils/formatTimestamp'
import { getStatusLabel } from 'utils/getStatusLabel'
import LoadingItems from '../LoadingItems'
import ConfirmationBox from './ConfirmationBox'
import { SubmitButton } from '../SubmitEntries/AddEntryModal'
import Loader from '~src/components/Loader'

const FileViewer = lazy(() => import("components/FileViewer"));

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 0;
`

const ModalContainer = styled.div`
  display: flex;
  background-color: #3a2154;
  border-radius: 12px;
  width: 84vw;
  flex-direction: column;
  max-height: 85vh;
  overflow-y: auto;
  color: #fff;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      width: 52%;
    `
  )}
`

const EntryDetailsHeader = styled.h1`
  margin: 0;
`

const StatusButton = styled.button<{ status?: string }>`
  background-color: #cd9dff;
  color: #380c65;
  padding: 12px 24px;
  font-family: 'Oxanium', sans-serif;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #6f42c1;
  }

  &:disabled {
    background-color: #c7c7c7;
    cursor: not-allowed;
  }

  ${landscapeStyle(
    () => css`
      padding: 12px 20px;
    `
  )}
`

const DetailsContent = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${responsiveSize(16, 24)};
`

const EvidenceSection = styled.div`
  gap: 16px;
`

const StatusSpan = styled.span<{ status: string }>`
  display: flex;
  padding: 4px 12px;
  font-size: 16px;
  color: white;
  border-radius: 4px;
  background-color: ${({ status }) => statusColorMap[status]};
  height: 20px;
`
const Header = styled.div`
  display: flex;
  font-size: 20px;
  font-weight: 600;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${responsiveSize(32, 16)};
`

const EntryDetailsContainer = styled.div`
  display: flex;
  padding: 20px 0;
  flex-direction: row;
  margin-bottom: 16px;
  border-bottom: 2px solid #edf2f7;
  gap: 16px;
  flex-wrap: wrap;

  img {
    width: 100px !important;
  }
`

const EvidenceSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`

const EvidenceHeader = styled.h2`
  font-size: 20px;
  margin: 0;
`

const Evidence = styled.div`
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #edf2f7;
  font-family: serif;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
`

const EvidenceField = styled.div`
  margin-bottom: 8px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex-direction: row;
  word-break: break-all;
`

const EvidenceDescription = styled(EvidenceField)`
  flex-direction: column;
  word-break: break-word;
`

const NoEvidenceText = styled.div`
  color: #a0aec0;
  font-style: italic;
`

const StyledReactMarkdown = styled(ReactMarkdown)`
  p {
    margin: 4px 0;
  }
`

const LabelAndValue = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  align-items: center;
`
const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LoaderContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`;

const NewTabInfo = styled.a`
  align-self: flex-end;
  display: flex;
  gap: 8px;
  align-items: center;
`;

const DetailsModal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [evidenceConfirmationType, setEvidenceConfirmationType] = useState('')

  const itemDetailsId = useMemo(
    () => searchParams.get('itemdetails'),
    [searchParams]
  )

  const { isLoading: detailsLoading, data: detailsData } = useQuery({
    queryKey: ['details', itemDetailsId || ''],
    queryFn: () => fetchItemDetails(itemDetailsId || ''),
    staleTime: Infinity,
  })

  // the registry can be fetched directly from itemDetailsId.
  const registryParsedFromItemId = itemDetailsId
    ? itemDetailsId.split('@')[1]
    : ''

  const { data: countsData } = useQuery({
    queryKey: ['counts'],
    queryFn: () => fetchItemCounts(),
    staleTime: Infinity,
  })

  const deposits = useMemo(() => {
    if (!countsData) return undefined
    return countsData[revRegistryMap[registryParsedFromItemId]].deposits
  }, [countsData, registryParsedFromItemId])

  // get arbitrationCost, keyed by arbitrator and arbitratorExtraData
  const { data: arbitrationCostData } = useQuery({
    queryKey: [
      'arbitrationCost',
      detailsData?.requests?.[0].arbitrator || '',
      detailsData?.requests?.[0].arbitratorExtraData || '',
    ],
    queryFn: () =>
      fetchArbitrationCost(
        detailsData?.requests?.[0].arbitrator || '',
        detailsData?.requests?.[0].arbitratorExtraData || ''
      ),
    staleTime: Infinity,
  })

  const evidences = useMemo(() => {
    if (!detailsData) return []
    return detailsData.requests
      .map((r) => r.evidenceGroup.evidences)
      .flat(1)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [detailsData])

  const closeModal = () => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.delete('itemdetails')
      return newParams
    })
    setIsConfirmationOpen(false)
  }
  console.log(detailsData)

  const containerRef = useRef(null)
  useFocusOutside(containerRef, () => closeModal())

  const formattedDepositCost = useMemo(() => {
    if (!detailsData || !deposits || arbitrationCostData === undefined)
      return '??? xDAI'
    let sum = 0n
    if (detailsData.status === 'Registered') {
      sum = arbitrationCostData + deposits.removalBaseDeposit
    } else if (detailsData.status === 'RegistrationRequested') {
      sum = arbitrationCostData + deposits.submissionChallengeBaseDeposit
    } else if (detailsData.status === 'ClearingRequested') {
      sum = arbitrationCostData + deposits.removalChallengeBaseDeposit
    }
    return `${Number(formatEther(sum))} xDAI`
  }, [detailsData, deposits, arbitrationCostData])

  const AppealButton = () => {
    const [searchParams] = useSearchParams()
    const itemDetails = searchParams.get('itemdetails')

    if (!itemDetails) return null

    const [itemId, contractAddress] = itemDetails.split('@')

    const redirectUrl = `https://curate.kleros.io/tcr/100/${contractAddress}/${itemId}`

    return (
      <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
        <StatusButton>Appeal decision on Curate</StatusButton>
      </a>
    )
  }

  return (
    <ModalOverlay>
      <ModalContainer ref={containerRef}>
        {detailsLoading || !detailsData ? (
          <LoadingItems />
        ) : (
          <>
            {/* ConfirmationBox Modal */}
            {isConfirmationOpen && (
              <ConfirmationBox
                evidenceConfirmationType={evidenceConfirmationType}
                isConfirmationOpen={isConfirmationOpen}
                setIsConfirmationOpen={setIsConfirmationOpen}
                detailsData={detailsData}
                deposits={deposits}
                arbitrationCostData={arbitrationCostData}
              />
            )}

            {/* DETAILS */}
            <DetailsContent>
              <Header>
                <EntryDetailsHeader>Entry details</EntryDetailsHeader>
                <StatusSpan status={detailsData.status}>
                  {detailsData?.disputed
                    ? 'Challenged'
                    : getStatusLabel(detailsData.status)}
                </StatusSpan>
                {!detailsData.disputed ? (
                  <StatusButton
                    onClick={() => {
                      setIsConfirmationOpen(true)
                      setEvidenceConfirmationType(detailsData.status)
                    }}
                    status={detailsData.status}
                  >
                    {detailsData.status === 'Registered' && `Remove entry`}
                    {detailsData.status === 'RegistrationRequested' &&
                      'Challenge entry'}
                    {detailsData.status === 'ClearingRequested' &&
                      'Challenge removal'}
                    {' — ' + formattedDepositCost}
                  </StatusButton>
                ) : (
                  <AppealButton />
                )}
              </Header>
              <EntryDetailsContainer>
                {detailsData?.metadata?.props &&
                  detailsData?.metadata?.props.map(({ label, value }) => (
                    <LabelAndValue key={label}>
                      <strong>{label}:</strong> {renderValue(label, value)}
                    </LabelAndValue>
                  ))}
              </EntryDetailsContainer>
              {/* EVIDENCES */}
              <EvidenceSection>
                <EvidenceSectionHeader>
                  <EvidenceHeader>Evidences</EvidenceHeader>
                  <SubmitButton
                    onClick={() => {
                      setIsConfirmationOpen(true)
                      setEvidenceConfirmationType('Evidence')
                    }}
                  >
                    Submit Evidence
                  </SubmitButton>
                </EvidenceSectionHeader>

                {evidences.length > 0 ? (
                  evidences.map((evidence, idx) => (
                    <Evidence key={idx}>
                      <EvidenceField>
                        <strong>Title:</strong> {evidence?.metadata?.title}
                      </EvidenceField>
                      <EvidenceDescription>
                        <strong>Description:</strong>
                        <StyledReactMarkdown>
                          {evidence?.metadata?.description || ''}
                        </StyledReactMarkdown>
                      </EvidenceDescription>
                      {evidence?.metadata?.fileURI ? (
                        <>
                          <NewTabInfo href={`https://cdn.kleros.link${evidence?.metadata?.fileURI}`} rel="noreferrer" target="_blank">
                            Open in new tab
                          </NewTabInfo>
                          <Suspense
                            fallback={
                              <LoaderContainer>
                                <Loader width={"48px"} height={"48px"} />
                              </LoaderContainer>
                            }
                          >
                            <FileViewer url={`https://cdn.kleros.link${evidence?.metadata?.fileURI}`} />
                          </Suspense>
                        </>
                      ) : null}
                      <EvidenceField>
                        <strong>Time:</strong>{' '}
                        {formatTimestamp(evidence.timestamp)}
                      </EvidenceField>
                      <EvidenceField>
                        <strong>Party:</strong> {evidence.party}
                      </EvidenceField>
                    </Evidence>
                  ))
                ) : (
                  <NoEvidenceText>No evidence submitted yet...</NoEvidenceText>
                )}
              </EvidenceSection>
            </DetailsContent>
          </>
        )}
      </ModalContainer>
    </ModalOverlay>
  )
}

export default DetailsModal
