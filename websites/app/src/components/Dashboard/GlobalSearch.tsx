import React, { useEffect, useState, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { useDebounce } from 'react-use';
import { useNavigate } from 'react-router-dom';
import { useItemsQuery } from 'hooks/queries/useItemsQuery';
import { revRegistryMap } from 'utils/items';
import SearchIcon from 'svgs/icons/search.svg';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import { getChainIcon } from 'utils/chainIcons';
import useHumanizedCountdown, { useChallengeRemainingTime, useChallengePeriodDuration } from 'hooks/countdown';
import Skeleton from 'react-loading-skeleton';
import HourglassIcon from 'svgs/icons/hourglass.svg';
import { SubmissionSelectionModal } from 'components/SubmissionSelectionModal';

const Overlay = styled.div<{ $isActive: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.lightBackground};
  z-index: 999;
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0)};
  pointer-events: ${({ $isActive }) => ($isActive ? 'auto' : 'none')};
  transition: opacity 0.3s ease;
`;

const SearchContainer = styled.div<{ $isActive: boolean }>`
  position: relative;
  width: 100%;
  margin: 0 auto;
  z-index: ${({ $isActive }) => ($isActive ? 1000 : 1)};

  ${({ $isActive }) => $isActive && css`
    position: fixed;
    top: 120px;
    left: 50%;
    transform: translateX(-50%);
    padding: 0 16px;
    max-width: 630px;
  `}
`;

const Container = styled.div`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  background-color: transparent;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding-left: 16px;
  width: 100%;
  height: 48px;

  svg {
    flex-shrink: 0;
  }

  :hover {
    background-color: #FFFFFF1D;
  }
`;

const StyledInput = styled.input`
  flex-grow: 1;
  padding: 8px;
  background: transparent;
  font-size: 16px;
  outline: none;
  border: none;
  color: ${({ theme }) => theme.primaryText};
  border-radius: 12px;

  ::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }
`;

const ResultsDropdown = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.lightBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 16px;
  max-height: 500px;
  overflow-y: auto;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  pointer-events: ${({ $isVisible }) => ($isVisible ? 'auto' : 'none')};
  transition: opacity 0.2s ease;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1001;
`;

const ResultItem = styled.div`
  ${hoverLongTransitionTiming}
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

const ResultName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;

  @media (min-width: 768px) {
    max-width: none;
  }
`;

const ResultRegistry = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
`;

const StatusBadge = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.primaryText};
  white-space: nowrap;

  &:before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    background-color: ${({ status }) =>
    ({
      'Included': '#90EE90',
      'Registration Requested': '#FFEA00',
      'Challenged Submission': '#E87B35',
      'Challenged Removal': '#E87B35',
      'Removal Requested': '#E87B35',
      'Removed': 'red',
    })[status] || 'gray'};
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

const ChainInfo = styled.div`
  display: flex;
  align-items: center;

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.secondaryText};
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const LoadingMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
`;

const EmptyMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const SubmitButton = styled.button`
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  border: none;
  border-radius: 9999px;
  padding: 10px 20px;
  font-size: 14px;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }
`;

const ModalWrapper = styled.div`
  position: relative;
  z-index: 1002;
`;

interface GlobalSearchProps {
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
    },
    500,
    [searchTerm]
  );

  const searchParams = useMemo(() => {
    if (!debouncedSearchTerm) return null;

    const params = new URLSearchParams();
    // Search across all 4 registries
    ['Tokens', 'CDN', 'Single_Tags', 'Tags_Queries'].forEach((registry) => {
      params.append('registry', registry);
    });
    // Include all statuses
    ['Registered', 'RegistrationRequested', 'ClearingRequested'].forEach((status) => {
      params.append('status', status);
    });
    // Include both disputed and non-disputed
    ['true', 'false'].forEach((disputed) => {
      params.append('disputed', disputed);
    });
    params.set('text', debouncedSearchTerm);
    params.set('orderDirection', 'desc');
    params.set('page', '1');
    return params;
  }, [debouncedSearchTerm]);

  const { data: items = [], isLoading } = useItemsQuery({
    searchParams: searchParams || new URLSearchParams(),
    chainFilters: [],
    enabled: !!searchParams,
  });

  const hasResults = items.length > 0;
  const showDropdown = isActive && debouncedSearchTerm.length > 0;

  useEffect(() => {
    setIsActive(searchTerm.length > 0);
  }, [searchTerm]);

  const handleResultClick = (itemId: string) => {
    navigate(`/item/${itemId}?fromHome=true`);
    setSearchTerm('');
    setIsActive(false);
  };

  const handleInputChange = (text: string) => {
    setSearchTerm(text);
  };

  const handleSubmitClick = () => {
    setIsSubmissionModalOpen(true);
  };

  const getPropValue = (item: any, label: string) => {
    return item?.props?.find((prop: any) => prop.label === label)?.value || '';
  };

  const getDisplayName = (item: any): string => {
    const registryName = revRegistryMap[item.registryAddress] || 'Unknown';

    if (registryName === 'Tokens') {
      return getPropValue(item, 'Symbol') || getPropValue(item, 'Name') || 'Unnamed';
    } else if (registryName === 'CDN') {
      return getPropValue(item, 'Domain name') || 'Unnamed';
    } else if (registryName === 'Single_Tags') {
      return getPropValue(item, 'Project Name') || getPropValue(item, 'Public Name Tag') || 'Unnamed';
    } else if (registryName === 'Tags_Queries') {
      return getPropValue(item, 'Description') || 'Unnamed';
    }
    return 'Unnamed';
  };

  const getChainId = (item: any): string | undefined => {
    const key0 = item?.key0;
    if (!key0) return undefined;
    const parts = key0.split(':');
    return parts[1];
  };

  const formatRegistryName = (registryName: string): string => {
    if (registryName === 'Single_Tags') return 'Single Tags';
    if (registryName === 'Tags_Queries') return 'Query Tags';
    return registryName;
  };

  const readableStatusMap: Record<string, string> = {
    Registered: 'Included',
    Absent: 'Removed',
    RegistrationRequested: 'Registration Requested',
    ClearingRequested: 'Removal Requested',
  };

  const challengedStatusMap: Record<string, string> = {
    RegistrationRequested: 'Challenged Submission',
    ClearingRequested: 'Challenged Removal',
  };

  const getActivityStatus = (item: any): string => {
    if (item.disputed) {
      return challengedStatusMap[item.status] || 'Unknown';
    }
    return readableStatusMap[item.status] || 'Unknown';
  };

  const SearchResultItem: React.FC<{ item: any }> = ({ item }) => {
    const registryName = revRegistryMap[item.registryAddress] || 'Unknown';
    const displayName = getDisplayName(item);
    const status = getActivityStatus(item);
    const chainId = getChainId(item);
    const ChainIcon = getChainIcon(chainId || '');

    const challengePeriodDuration = useChallengePeriodDuration(item.registryAddress);
    const endsAtSeconds = useChallengeRemainingTime(
      item.requests?.[0]?.submissionTime,
      item.disputed,
      challengePeriodDuration,
    );
    const endsIn = useHumanizedCountdown(endsAtSeconds, 2);
    const showEndsIn = Boolean(endsIn) && item.status !== 'Registered' && !item.disputed;
    const isLoadingCountdown = item.status !== 'Registered' && challengePeriodDuration === null && !item.disputed;

    const timeText = item.status === 'ClearingRequested' ? 'Will be removed in' : 'Will be included in';
    const completedText = item.status === 'ClearingRequested' ? 'Removed' : 'Already included';

    return (
      <ResultItem onClick={() => handleResultClick(item.id)}>
        <TopRow>
          <LeftSection>
            <ResultName>{displayName}</ResultName>
            <ResultRegistry>({formatRegistryName(registryName)})</ResultRegistry>
            {!item.disputed && (
              <TimeInfo>
                {isLoadingCountdown ? (
                  <Skeleton width={100} height={12} />
                ) : showEndsIn ? (
                  <>
                    <HourglassIcon />
                    <span>{timeText}: {endsIn}</span>
                  </>
                ) : item.status === 'Registered' ? (
                  <>
                    <HourglassIcon />
                    <span>{completedText}</span>
                  </>
                ) : null}
              </TimeInfo>
            )}
          </LeftSection>
          <RightSection>
            <StatusBadge status={status}>{status}</StatusBadge>
            {ChainIcon && (
              <ChainInfo>
                <ChainIcon />
              </ChainInfo>
            )}
          </RightSection>
        </TopRow>
      </ResultItem>
    );
  };

  return (
    <>
      <Overlay $isActive={isActive || isSubmissionModalOpen} onClick={() => { setSearchTerm(''); setIsActive(false); }} />
      <SearchContainer $isActive={isActive} className={className}>
        <Container>
          <SearchIcon />
          <StyledInput
            type="text"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search for any item with keywords, address, name, etc."
          />
        </Container>
        <ResultsDropdown $isVisible={showDropdown && !isSubmissionModalOpen}>
          {isLoading ? (
            <LoadingMessage>Searching...</LoadingMessage>
          ) : hasResults ? (
            items.slice(0, 20).map((item) => (
              <SearchResultItem key={item.id} item={item} />
            ))
          ) : (
            <EmptyMessage>
              <div>No results found for "{debouncedSearchTerm}"</div>
              <SubmitButton onClick={handleSubmitClick}>Submit it Now</SubmitButton>
            </EmptyMessage>
          )}
        </ResultsDropdown>
      </SearchContainer>

      <ModalWrapper>
        <SubmissionSelectionModal
          isOpen={isSubmissionModalOpen}
          onClose={() => {
            setIsSubmissionModalOpen(false);
            setSearchTerm('');
            setIsActive(false);
          }}
        />
      </ModalWrapper>
    </>
  );
};
