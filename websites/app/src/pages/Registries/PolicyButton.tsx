import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useItemCountsQuery } from 'hooks/queries';
import { usePolicyHistory } from 'hooks/usePolicyHistory';
import { useAttachment } from 'hooks/useAttachment';
import { registryMap } from 'utils/items';
import { formatUpdatedAgo, POLICY_RECENT_THRESHOLD_DAYS } from 'utils/date';
import { formatTimestamp } from 'utils/formatTimestamp';
import { KLEROS_CDN_BASE } from 'consts/index';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import InfoCircleIcon from 'svgs/icons/info-circle.svg';
import PolicyIcon from 'svgs/icons/policy.svg';

type Status = 'idle' | 'fetching' | 'recent' | 'old' | 'unavailable';

const StyledLink = styled.a<{ $status: Status; $disabled: boolean }>`
  ${hoverShortTransitionTiming}
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  display: inline-flex;
  align-items: center;
  min-height: 24px;
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
  const { data: countsData, isLoading: countsLoading } = useItemCountsQuery();
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

  const current = historyData?.[0];
  const updatedInfo = useMemo(() => {
    if (!current) return null;
    return formatUpdatedAgo(current.startDate);
  }, [current]);

  const policyUrl =
    registryName && policyURI ? `${KLEROS_CDN_BASE}${policyURI}` : undefined;

  const status: Status = useMemo(() => {
    // Without the policy's address there is nothing to open: say whether it is still loading or
    // whether the registry data could not be read (the registry query keeps retrying on its own).
    if (!policyUrl) return countsLoading ? 'fetching' : 'unavailable';
    if (updatedInfo) {
      return updatedInfo.days < POLICY_RECENT_THRESHOLD_DAYS ? 'recent' : 'old';
    }
    if (registryAddress && (isLoading || isFetching)) return 'fetching';
    return 'idle';
  }, [policyUrl, countsLoading, updatedInfo, registryAddress, isLoading, isFetching]);

  // A real address in both modes, so the link can be focused, middle-clicked and opened in a new
  // tab. In the toolbar a plain click still opens the viewer in place.
  const href = policyUrl
    ? `/${registryName}?attachment=${encodeURIComponent(policyUrl)}&isPolicy=true`
    : undefined;

  const startedAt = current ? Date.parse(current.startDate) : NaN;

  return (
    <StyledLink
      $status={status}
      $disabled={!href}
      href={href}
      role={href ? undefined : 'link'}
      aria-disabled={href ? undefined : true}
      title={
        status === 'unavailable'
          ? 'The policy could not be loaded. Check your connection; Scout keeps trying.'
          : undefined
      }
      target={openInNewTab && href ? '_blank' : undefined}
      rel={openInNewTab && href ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        if (!href || !policyUrl) {
          e.preventDefault();
          return;
        }
        if (openInNewTab) return;
        // Modified clicks (new tab or window) follow the href.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        openAttachment(policyUrl, true);
      }}
    >
      {status === 'fetching' && <Spinner />}
      {status === 'recent' && <InfoCircleIcon />}
      {status === 'old' && <PolicyIcon />}
      Policy
      {status === 'fetching' && <Suffix>(fetching...)</Suffix>}
      {status === 'unavailable' && <Suffix>(unavailable)</Suffix>}
      {(status === 'recent' || status === 'old') && updatedInfo && (
        <Suffix>
          (
          {Number.isFinite(startedAt) ? (
            <time dateTime={current!.startDate} title={formatTimestamp(startedAt / 1000, true)}>
              {updatedInfo.text}
            </time>
          ) : (
            updatedInfo.text
          )}
          )
        </Suffix>
      )}
    </StyledLink>
  );
};

export default PolicyButton;
