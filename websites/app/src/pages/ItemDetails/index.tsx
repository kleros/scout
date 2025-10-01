import React, { useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { formatEther } from 'ethers';
import { useQuery } from '@tanstack/react-query';
import { landscapeStyle } from 'styles/landscapeStyle';
import { responsiveSize } from 'styles/responsiveSize';
import ReactMarkdown from 'react-markdown';
import { renderValue, StyledWebsiteAnchor } from 'utils/renderValue';
import { fetchArbitrationCost } from 'utils/fetchArbitrationCost';
import { revRegistryMap } from 'utils/items';
import { useItemDetailsQuery, useItemCountsQuery } from 'hooks/queries';
import { formatTimestamp } from 'utils/formatTimestamp';
import { getStatusLabel } from 'utils/getStatusLabel';
import LoadingItems from '../Registries/LoadingItems';
import ConfirmationBox from 'components/ConfirmationBox';
import { SubmitButton } from '../Registries/SubmitEntries/AddEntryModal';
import AttachmentIcon from "assets/svgs/icons/attachment.svg";
import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown';
import { useChallengePeriodDuration } from 'hooks/countdown';
import AddressDisplay from 'components/AddressDisplay';
import SubmittedByLink from 'components/SubmittedByLink';
import { useScrollTop } from 'hooks/useScrollTop';
import ArrowLeftIcon from "assets/svgs/icons/arrow-left.svg";
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  min-height: 100vh;
  padding: 32px 16px 64px;
  font-family: "Inter", sans-serif;
  background: ${({ theme }) => theme.lightBackground};

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `
  )}
`;

const Header = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primaryText};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
  flex: 1;
`;

const TabsWrapper = styled.div`
  display: flex;
  gap: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.lightGrey};
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme, selected }) => (selected ? theme.primaryText : theme.secondaryText)};
  border-bottom: 3px solid ${({ theme, selected }) => (selected ? theme.primaryText : "transparent")};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  padding: ${responsiveSize(16, 24)};
  word-break: break-word;
`;

const StatusButton = styled.button<{ status?: string; }>`
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
`;

const StatusSpan = styled.span<{ status: string; }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ status }) => {
    const colors = {
      'Registered': '#48BB78',
      'RegistrationRequested': '#ED8936', 
      'ClearingRequested': '#D69E2E',
      'Absent': '#718096',
    };
    return colors[status] || '#718096';
  }};
  border-radius: 20px;
  border: 2px solid ${({ status }) => {
    const colors = {
      'Registered': '#48BB78',
      'RegistrationRequested': '#ED8936', 
      'ClearingRequested': '#D69E2E',
      'Absent': '#718096',
    };
    return colors[status] || '#718096';
  }};
  background: transparent;

  &:after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ status }) => {
      const colors = {
        'Registered': '#48BB78',
        'RegistrationRequested': '#ED8936', 
        'ClearingRequested': '#D69E2E',
        'Absent': '#718096',
      };
      return colors[status] || '#718096';
    }};
  }
`;

const ItemHeader = styled.div`
  display: flex;
  font-size: 20px;
  font-weight: 600;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${responsiveSize(32, 16)};
`;

const EntryDetailsContainer = styled.div`
  display: flex;
  padding: 20px 0;
  flex-direction: row;
  margin-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.lightGrey};
  gap: 16px;
  flex-wrap: wrap;

  button img,
  img {
    width: 100px !important;
    cursor: pointer;
  }

  button {
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }
`;

const LabelAndValue = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  width: 100%;
`;

const EvidenceSection = styled.div`
  gap: 16px;
`;

const EvidenceSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const EvidenceHeader = styled.h2`
  font-size: 20px;
  margin: 0;
`;

const Evidence = styled.div`
  padding: 12px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  font-family: serif;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.05);
`;

const EvidenceField = styled.div`
  margin: 8px 0;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex-direction: row;
  word-break: break-all;
`;

const EvidenceDescription = styled(EvidenceField)`
  flex-direction: column;
  word-break: break-word;
`;

const NoEvidenceText = styled.div`
  color: ${({ theme }) => theme.secondaryText};
  font-style: italic;
`;

const StyledReactMarkdown = styled(ReactMarkdown)`
  p {
    margin: 4px 0;
  }
`;

const StyledButton = styled.button`
  height: fit-content;
  display: flex;
  cursor: pointer;
  color: ${({ theme }) => theme.primaryText};
  background: none;
  text-decoration: underline;
  border: none;
  padding: 0;
  gap: ${responsiveSize(5, 6)};
  ${landscapeStyle(
    () => css`
      > svg {
        width: 16px;
        fill: ${({ theme }) => theme.primaryText};
      }
    `
  )}
`;

export const StyledGitpodLink = styled.a`
  color: ${({ theme }) => theme.primaryText};
  text-decoration: none;
  background-color: dimgrey;
  padding: 2px 6px;
  border-radius: 6px;

  &:hover {
    text-decoration: underline;
  }
`;

const ItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [evidenceConfirmationType, setEvidenceConfirmationType] = useState('');

  const scrollTop = useScrollTop();

  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams]
  );

  const { isLoading: detailsLoading, data: detailsData } = useItemDetailsQuery({
    itemId: itemId || '',
    enabled: !!itemId,
  });

  const registryParsedFromItemId = useMemo(() => itemId ? itemId.split('@')[1] : '', [itemId]);

  const challengePeriodDuration = useChallengePeriodDuration(registryParsedFromItemId);
  const challengeRemainingTime = useChallengeRemainingTime(detailsData?.requests[0]?.submissionTime, detailsData?.disputed, challengePeriodDuration);
  const formattedChallengeRemainingTime = useHumanizedCountdown(challengeRemainingTime, 2);

  const { data: countsData } = useItemCountsQuery();

  const deposits = useMemo(() => {
    if (!countsData) return undefined;
    return countsData[revRegistryMap[registryParsedFromItemId]].deposits;
  }, [countsData, registryParsedFromItemId]);

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
  });

  const evidences = useMemo(() => {
    if (!detailsData) return [];
    return detailsData.requests
      .map((r) => r.evidenceGroup.evidences)
      .flat(1)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  }, [detailsData]);

  const formattedDepositCost = useMemo(() => {
    if (!detailsData || !deposits || arbitrationCostData === undefined) return '??? xDAI';
    let sum = 0n;
    if (detailsData.status === 'Registered') {
      sum = arbitrationCostData + deposits.removalBaseDeposit;
    } else if (detailsData.status === 'RegistrationRequested') {
      sum = arbitrationCostData + deposits.submissionChallengeBaseDeposit;
    } else if (detailsData.status === 'ClearingRequested') {
      sum = arbitrationCostData + deposits.removalChallengeBaseDeposit;
    }
    return `${Number(formatEther(sum))} xDAI`;
  }, [detailsData, deposits, arbitrationCostData]);

  const AppealButton = () => {
    if (!itemId) return null;
    const [itemIdPart, contractAddress] = itemId.split('@');
    const redirectUrl = `https://curate.kleros.io/tcr/100/${contractAddress}/${itemIdPart}`;
    return (
      <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
        <StatusButton>Appeal decision on Curate</StatusButton>
      </a>
    );
  };

  const isTagsQueries = useMemo(() => {
    const registry = searchParams.get('registry');
    return registry === 'Tags_Queries';
  }, [searchParams]);

  const getPropValue = (label: string) => {
    return detailsData?.metadata?.props?.find((prop) => prop.label === label)?.value || '';
  };

  const tabs = [
    { key: 'details', label: 'Item Details' },
    { key: 'evidence', label: 'Evidence' },
  ];

  const handleBackClick = () => {
    navigate(-1);
  };

  if (detailsLoading || !detailsData) {
    return (
      <Container>
        <LoadingItems />
      </Container>
    );
  }

  return (
    <Container>
      {isAttachmentOpen ? (
        <EvidenceAttachmentDisplay />
      ) : (
        <>
          {isConfirmationOpen && (
            <ConfirmationBox
              {...{ evidenceConfirmationType, isConfirmationOpen, setIsConfirmationOpen, detailsData, deposits, arbitrationCostData }}
            />
          )}

          <Header>
        <BackButton onClick={handleBackClick}>
          <ArrowLeftIcon />
          Return
        </BackButton>
        <Title>
          {detailsData?.metadata?.props?.find(p => p.label === 'Name')?.value || 
           detailsData?.metadata?.props?.find(p => p.label === 'Description')?.value ||
           'Item Details'}
        </Title>
      </Header>

      <TabsWrapper>
        {tabs.map((tab, i) => (
          <TabButton key={tab.key} selected={i === currentTab} onClick={() => setCurrentTab(i)}>
            {tab.label}
          </TabButton>
        ))}
      </TabsWrapper>

      <ContentWrapper>
        {currentTab === 0 ? (
          // Item Details Tab
          <>
            <ItemHeader>
              <span>Entry Details</span>
              <StatusSpan status={detailsData.status}>
                {detailsData?.disputed ? 'Challenged' : getStatusLabel(detailsData.status)}
              </StatusSpan>
              {!detailsData.disputed ? (
                <StatusButton
                  onClick={() => {
                    setIsConfirmationOpen(true);
                    setEvidenceConfirmationType(detailsData.status);
                  }}
                  status={detailsData.status}
                >
                  {detailsData.status === 'Registered' && `Remove entry`}
                  {detailsData.status === 'RegistrationRequested' && 'Challenge entry'}
                  {detailsData.status === 'ClearingRequested' && 'Challenge removal'}
                  {' — ' + formattedDepositCost}
                </StatusButton>
              ) : (
                <AppealButton />
              )}
            </ItemHeader>
            <EntryDetailsContainer>
              {detailsData?.metadata?.props && !isTagsQueries &&
                detailsData?.metadata?.props.map(({ label, value }) => (
                  <LabelAndValue key={label}>
                    <strong>{label}:</strong> {renderValue(label, value)}
                  </LabelAndValue>
                ))}
              {isTagsQueries && (
                <>
                  <LabelAndValue>
                    <strong>Description:</strong> {getPropValue('Description')}
                  </LabelAndValue>
                  <LabelAndValue>
                    <strong>Github Repository URL:</strong>
                    <StyledWebsiteAnchor
                      href={`${getPropValue('Github Repository URL').replace('.git', '')}/commit/${getPropValue('Commit hash')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {getPropValue('Github Repository URL')}
                    </StyledWebsiteAnchor>
                    <StyledGitpodLink
                      href="https://gitpod.io/#https://github.com/gmkung/kleros-atq-trustless-retrieval.git"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Test on Gitpod
                    </StyledGitpodLink>
                  </LabelAndValue>
                  <LabelAndValue>
                    <strong>Commit hash:</strong> {getPropValue('Commit hash')}
                  </LabelAndValue>
                  <LabelAndValue>
                    <strong>EVM Chain ID:</strong> {getPropValue('EVM Chain ID')} <AddressDisplay address={`eip155:${getPropValue('EVM Chain ID')}`} />
                  </LabelAndValue>
                </>
              )}
              <LabelAndValue style={{ color: '#CD9DFF' }}>
                <strong>Submitted by:</strong> <SubmittedByLink address={detailsData?.requests[0].requester} />
              </LabelAndValue>
              <LabelAndValue style={{ color: '#CD9DFF' }}>
                <strong>Submitted on:</strong> {formatTimestamp(Number(detailsData?.requests[0].submissionTime), true)}
              </LabelAndValue>
              {detailsData?.status === "Registered" ?
                <LabelAndValue style={{ color: '#CD9DFF' }}>
                  <strong>Included on:</strong> {formatTimestamp(Number(detailsData?.requests[0].resolutionTime), true)}
                </LabelAndValue> : null}
              {formattedChallengeRemainingTime && (
                <LabelAndValue style={{ color: '#CD9DFF' }}>
                  <strong>Challenge Period ends in:</strong> {formattedChallengeRemainingTime}
                </LabelAndValue>
              )}
            </EntryDetailsContainer>
          </>
        ) : (
          // Evidence Tab
          <EvidenceSection>
            <EvidenceSectionHeader>
              <EvidenceHeader>Evidence</EvidenceHeader>
              <SubmitButton
                onClick={() => {
                  setIsConfirmationOpen(true);
                  setEvidenceConfirmationType('Evidence');
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
                    <StyledReactMarkdown>{evidence?.metadata?.description || ''}</StyledReactMarkdown>
                  </EvidenceDescription>
                  {evidence?.metadata?.fileURI ? (
                    <StyledButton
                      onClick={() => {
                        if (evidence.metadata?.fileURI) {
                          setSearchParams({ attachment: `https://cdn.kleros.link${evidence.metadata.fileURI}` });
                          scrollTop();
                        }
                      }}
                    >
                      <AttachmentIcon />
                      View Attached File
                    </StyledButton>
                  ) : null}
                  <EvidenceField>
                    <strong>Time:</strong> {formatTimestamp(Number(evidence.timestamp), true)}
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
        )}
      </ContentWrapper>
        </>
      )}
    </Container>
  );
};

export default ItemDetails;