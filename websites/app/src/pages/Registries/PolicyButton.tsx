import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useItemCountsQuery } from 'hooks/queries';
import { usePolicyHistory } from 'hooks/usePolicyHistory';
import { useAttachment } from 'hooks/useAttachment';
import { registryMap } from 'utils/items';
import { formatUpdatedAgo, POLICY_RECENT_THRESHOLD_DAYS } from 'utils/date';
import { KLEROS_CDN_BASE } from 'consts/index';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import InfoCircleIcon from 'svgs/icons/info-circle.svg';
import PolicyIcon from 'svgs/icons/policy.svg';

type Status = 'idle' | 'fetching' | 'recent' | 'old';

const StyledLink = styled.a<{ $status: Status; $disabled: boolean }>`
  ${hoverShortTransitionTiming}
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 400;
  text-decoration: none;
  color: ${({ theme, $status }) =>
    $status === 'recent' ? theme.warning : theme.secondaryText};

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    path {
      fill: currentColor;
    }
  }

  :hover {
    color: ${({ theme, $status, $disabled }) =>
      $disabled
        ? $status === 'recent'
          ? theme.warning
          : theme.secondaryText
        : $status === 'recent'
          ? theme.warning
          : theme.primaryText};
  }
`;

const Suffix = styled.span`
  font-style: italic;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: ${spin} 0.9s linear infinite;
  flex-shrink: 0;
`;

interface PolicyButtonProps {
  registryName?: string;
  openInNewTab?: boolean;
}

const PolicyButton: React.FC<PolicyButtonProps> = ({
  registryName,
  openInNewTab = true,
}) => {
  const { data: countsData } = useItemCountsQuery();
  const openAttachment = useAttachment();
  const registryAddress = registryName ? registryMap[registryName] : undefined;
  const { data: historyData, isLoading, isFetching } = usePolicyHistory(
    registryAddress,
    'latest',
  );

  const policyURI = useMemo(() => {
    if (!registryName || !countsData) return undefined;
    return countsData[registryName]?.metadata?.policyURI;
  }, [registryName, countsData]);

  const updatedInfo = useMemo(() => {
    const current = historyData?.[0];
    if (!current) return null;
    return formatUpdatedAgo(current.startDate);
  }, [historyData]);

  const status: Status = useMemo(() => {
    if (updatedInfo) {
      return updatedInfo.days < POLICY_RECENT_THRESHOLD_DAYS ? 'recent' : 'old';
    }
    if (registryAddress && (isLoading || isFetching)) return 'fetching';
    return 'idle';
  }, [updatedInfo, registryAddress, isLoading, isFetching]);

  const policyUrl =
    registryName && policyURI ? `${KLEROS_CDN_BASE}${policyURI}` : undefined;

  const href =
    registryName && policyURI && openInNewTab
      ? `/${registryName}?attachment=${encodeURIComponent(
          policyUrl!,
        )}&isPolicy=true`
      : undefined;

  const isInteractive = !!policyUrl;

  return (
    <StyledLink
      $status={status}
      $disabled={!isInteractive}
      href={href}
      target={openInNewTab && href ? '_blank' : undefined}
      rel={openInNewTab && href ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        if (!isInteractive) {
          e.preventDefault();
          return;
        }
        if (!openInNewTab && policyUrl) {
          e.preventDefault();
          openAttachment(policyUrl, true);
        }
      }}
    >
      {status === 'fetching' && <Spinner />}
      {status === 'recent' && <InfoCircleIcon />}
      {status === 'old' && <PolicyIcon />}
      Policy
      {status === 'fetching' && <Suffix>(fetching...)</Suffix>}
      {(status === 'recent' || status === 'old') && updatedInfo && (
        <Suffix>({updatedInfo.text})</Suffix>
      )}
    </StyledLink>
  );
};

export default PolicyButton;
