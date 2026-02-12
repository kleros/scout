import React from 'react';
import styled from 'styled-components';
import { useKlerosDisputes, getDisputePeriodName, formatDisputeDeadline } from 'hooks/useKlerosDisputes';
import LawBalanceIcon from 'assets/svgs/icons/law-balance.svg';
import HourglassIcon from 'assets/svgs/icons/hourglass.svg';

const Container = styled.div`
  padding: 24px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: transparent;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0px 8px 32px rgba(231, 123, 53, 0.1);
  }
`;

const Title = styled.h3`
  color: var(--Secondary-blue, #7186FF);
  font-family: "Open Sans";
  font-size: 16px;
  font-style: italic;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: transparent;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.primary};
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
`;

const LoadingCard = styled.div`
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: transparent;
  height: 60px;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
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
  font-family: "Open Sans", sans-serif;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border-color: ${({ theme }) => theme.buttonSecondaryBorder};
  flex-shrink: 0;
  text-decoration: none;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:active {
    background: rgba(255, 255, 255, 0.15);
  }
`;

interface KlerosDispute {
  id: string;
  disputeIDNumber: string;
  court: {
    id: string;
  };
  period: string;
  lastPeriodChangeTs: string;
  ruled: boolean;
  ruling: string;
  arbitrated: string;
}

export const HomeLatestDisputes: React.FC = () => {
  const { data: disputes = [], isLoading, error } = useKlerosDisputes(9);

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

  if (error) {
    return (
      <Container>
        <Title>Latest Disputes</Title>
        <EmptyState>Error loading disputes</EmptyState>
      </Container>
    );
  }

  if (!disputes.length) {
    return (
      <Container>
        <Title>Latest Disputes</Title>
        <EmptyState>No active disputes found</EmptyState>
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
          const periodName = getDisputePeriodName(dispute.period);
          const timeAgo = formatDisputeDeadline(dispute.lastPeriodChangeTs);

          return (
            <DisputeRow key={dispute.id}>
              <DisputeInfo>
                <DisputeHeader>
                  <StyledDisputeIcon />
                  <CaseNumber>Case #{dispute.disputeIDNumber}</CaseNumber>
                </DisputeHeader>
                <TimeInfo>
                  <HourglassIcon />
                  <span>{periodName}: {timeAgo}</span>
                </TimeInfo>
              </DisputeInfo>
              <ViewButton
                href={`https://klerosboard.com/100/cases/${dispute.disputeIDNumber}`}
                target="_blank"
                rel="noopener noreferrer"
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
