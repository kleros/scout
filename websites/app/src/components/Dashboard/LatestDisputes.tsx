import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useKlerosDisputes, getDisputePeriodName, formatDisputeDeadline } from 'hooks/useKlerosDisputes';

import DisputeResolverIcon from 'assets/svgs/icons/dispute-resolver.svg';
import HourglassIcon from 'assets/svgs/icons/hourglass.svg';

const DOT_COLORS = {
  active: '#C5ABFF',
  inactive: '#2A2A2A',
} as const;

const Container = styled.div`
  padding: clamp(16px, 3vw, 24px);
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0px 8px 32px rgba(231, 123, 53, 0.1);
  }

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin: 0;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, #E87B35 0%, #D45A42 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const DisputesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DisputeCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.primary};
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0; /* Allow text truncation */
`;

const ScalesIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.primaryText};
    opacity: 0.8;
  }
`;

const CaseInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const CaseNumber = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin-bottom: 2px;
  line-height: 1.2;
`;

const CourtName = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  font-weight: 500;
  line-height: 1.2;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
`;

const DeadlineSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

const FollowUpButton = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.primaryText};
  border-radius: 20px;
  padding: 8px 16px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background: ${({ theme }) => theme.primaryText};
    color: ${({ theme }) => theme.lightBackground};
  }
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
`;

const Dot = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ active }) => active ? DOT_COLORS.active : DOT_COLORS.inactive};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${DOT_COLORS.active};
  }
`;

const LoadingCard = styled.div`
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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

const CAROUSEL_INTERVAL = 8000;
const ITEMS_PER_GROUP = 3;
const MAX_ITEMS = 9;

const EmptyState = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
`;

export const LatestDisputes: React.FC = () => {
  const [currentGroup, setCurrentGroup] = useState<number>(0);

  const { data: disputes = [], isLoading, error } = useKlerosDisputes(9);

  console.log('📈 LatestDisputes render:', { 
    disputesCount: disputes.length, 
    isLoading, 
    error, 
    disputes: disputes.slice(0, 3) // Log first 3 for debugging
  });

  const disputeGroups = useMemo(() => {
    if (!disputes.length) return [];
    
    const groups: KlerosDispute[][] = [];
    const maxItems = Math.min(disputes.length, MAX_ITEMS);
    
    for (let i = 0; i < maxItems; i += ITEMS_PER_GROUP) {
      groups.push(disputes.slice(i, i + ITEMS_PER_GROUP));
    }
    return groups;
  }, [disputes]);

  useEffect(() => {
    if (disputeGroups.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentGroup((prev) => (prev + 1) % disputeGroups.length);
    }, CAROUSEL_INTERVAL);

    return () => clearInterval(interval);
  }, [disputeGroups.length]);

  const handleCardClick = useCallback((dispute: KlerosDispute) => {
    // Open Klerosboard interface for this dispute
    const klerosboardUrl = `https://klerosboard.com/100/cases/${dispute.disputeIDNumber}`;
    window.open(klerosboardUrl, '_blank');
  }, []);

  const handleDotClick = useCallback((index: number) => {
    setCurrentGroup(index);
  }, []);


  if (isLoading) {
    return (
      <Container>
        <Header>
          <Title>Latest Disputes</Title>
        </Header>
        <DisputesList>
          {[1, 2, 3].map((i) => (
            <LoadingCard key={i} />
          ))}
        </DisputesList>
      </Container>
    );
  }

  if (error) {
    console.error('❌ Error loading disputes:', error);
    return (
      <Container>
        <Header>
          <Title>Latest Disputes</Title>
        </Header>
        <DisputesList>
          <EmptyState>
            Error loading disputes: {error.message}
          </EmptyState>
        </DisputesList>
      </Container>
    );
  }

  if (!disputeGroups.length) {
    console.warn('⚠️ No dispute groups to display. Raw disputes:', disputes);
    return (
      <Container>
        <Header>
          <Title>Latest Disputes</Title>
        </Header>
        <DisputesList>
          <EmptyState>
            No active disputes found in xDAI Curation Court
            {disputes.length > 0 && (
              <div>({disputes.length} disputes received but not grouped)</div>
            )}
          </EmptyState>
        </DisputesList>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Header>
          <Title>Latest Disputes</Title>
        </Header>
        <DisputesList>
          {disputeGroups[currentGroup]?.map((dispute) => {
            const periodName = getDisputePeriodName(dispute.period);
            const timeAgo = formatDisputeDeadline(dispute.lastPeriodChangeTs);
            
            return (
              <DisputeCard key={dispute.id} onClick={() => handleCardClick(dispute)}>
                <LeftSection>
                  <ScalesIconWrapper>
                    <DisputeResolverIcon />
                  </ScalesIconWrapper>
                  <CaseInfo>
                    <CaseNumber>Case #{dispute.disputeIDNumber}</CaseNumber>
                  </CaseInfo>
                </LeftSection>
                <RightSection>
                  <DeadlineSection>
                    <HourglassIcon />
                    <span>{periodName}: {timeAgo}</span>
                  </DeadlineSection>
                  <FollowUpButton>
                    View Case
                  </FollowUpButton>
                </RightSection>
              </DisputeCard>
            );
          })}
        </DisputesList>
      </Container>
      {disputeGroups.length > 1 && (
        <DotsContainer>
          {disputeGroups.map((_, index) => (
            <Dot
              key={index}
              active={index === currentGroup}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </DotsContainer>
      )}
    </>
  );
};