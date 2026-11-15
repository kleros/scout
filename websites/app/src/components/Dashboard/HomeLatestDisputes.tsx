import React from 'react';
import styled from 'styled-components';
import { pulse } from 'styles/commonStyles';
import { useKlerosDisputes, getDisputePeriodLead, formatElapsed } from 'hooks/useKlerosDisputes';
import { revRegistryMap, registryDisplayNames } from 'utils/items';
import { formatTimestamp } from 'utils/formatTimestamp';
import ErrorState from 'components/ErrorState';
import LawBalanceIcon from 'assets/svgs/icons/law-balance.svg';
import HourglassIcon from 'assets/svgs/icons/hourglass.svg';

const Container = styled.div`
  padding: 24px 0;
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.secondaryBlue};
  font-size: 16px;
  font-weight: 400;
  line-height: normal;
  margin: 0 0 20px 0;
`;

const DisputesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DisputeRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: transparent;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.secondaryBlue};
  }
`;

const DisputeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
`;

const DisputeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledDisputeIcon = styled(LawBalanceIcon)`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`;

const CaseNumber = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`;

const RegistryName = styled.span`
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
  white-space: nowrap;
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.8;
  }

  /* Above the card-wide link, so hovering the time still shows the absolute date. */
  time {
    position: relative;
    z-index: 1;
  }
`;

const LoadingCard = styled.div`
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: transparent;
  height: 60px;
  animation: ${pulse} 2s infinite;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
`;

const ViewButton = styled.a`
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  font-family: "Manrope", sans-serif;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border-color: ${({ theme }) => theme.buttonSecondaryBorder};
  flex-shrink: 0;
  text-decoration: none;

  /* The whole card opens the case, not only the pill. */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
  }

  &:hover,
  ${DisputeRow}:hover & {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:active {
    background: ${({ theme }) => theme.activeBackground};
  }
`;

export const HomeLatestDisputes: React.FC = () => {
  const { data: disputes = [], isLoading, isError, refetch, isFetching } = useKlerosDisputes(9);

  if (isLoading) {
    return (
      <Container>
        <Title>Latest Disputes</Title>
        <DisputesList>
          {Array.from({ length: 9 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </DisputesList>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container>
        <Title>Latest Disputes</Title>
        <ErrorState
          compact
          title="The disputes did not load."
          message="The Kleros court data service did not answer. Check your connection and try again."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      </Container>
    );
  }

  if (!disputes.length) {
    return (
      <Container>
        <Title>Latest Disputes</Title>
        <EmptyState>No disputes yet.</EmptyState>
      </Container>
    );
  }

  // Show latest 9 disputes
  const displayDisputes = disputes.slice(0, 9);

  return (
    <Container>
      <Title>Latest Disputes</Title>
      <DisputesList>
        {displayDisputes.map((dispute) => {
          const registryKey = revRegistryMap[dispute.arbitrated?.toLowerCase()];
          const registryName = registryKey ? registryDisplayNames[registryKey] : undefined;
          const elapsed = formatElapsed(dispute.lastPeriodChangeTs);
          const periodStart = Number(dispute.lastPeriodChangeTs);

          return (
            <DisputeRow key={dispute.id}>
              <DisputeInfo>
                <DisputeHeader>
                  <StyledDisputeIcon aria-hidden="true" />
                  <CaseNumber>
                    Case #{dispute.disputeIDNumber}
                    {registryName ? <RegistryName> · {registryName}</RegistryName> : null}
                  </CaseNumber>
                </DisputeHeader>
                <TimeInfo>
                  <HourglassIcon aria-hidden="true" />
                  <span>
                    {getDisputePeriodLead(dispute.period)}{' '}
                    {elapsed ? (
                      <time
                        dateTime={new Date(periodStart * 1000).toISOString()}
                        title={formatTimestamp(periodStart, true)}
                      >
                        {elapsed} ago
                      </time>
                    ) : (
                      'recently'
                    )}
                  </span>
                </TimeInfo>
              </DisputeInfo>
              <ViewButton
                href={`https://klerosboard.com/100/cases/${dispute.disputeIDNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View case #${dispute.disputeIDNumber} on Klerosboard (opens in a new tab)`}
              >
                View Case
              </ViewButton>
            </DisputeRow>
          );
        })}
      </DisputesList>
    </Container>
  );
};
