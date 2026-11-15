import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Skeleton from 'react-loading-skeleton';
import useHumanizedCountdown, { useChallengeRemainingTime, useChallengePeriodDuration } from 'hooks/countdown';
import { formatTimestamp } from 'utils/formatTimestamp';
import { getChainIcon } from 'utils/chainIcons';
import { chains } from 'utils/chains';
import { registryMap, getPropValue, getItemAddress, getItemDisplayName } from 'utils/items';
import HourglassIcon from 'svgs/icons/hourglass.svg';

/** How long a row keeps a placeholder for its countdown before it stops waiting (the RPC did not answer). */
const COUNTDOWN_WAIT_MS = 10_000;

export interface ChallengePeriods {
  /** Challenge period in seconds, by registry address; null while unknown. */
  byRegistry: Record<string, number | null>;
  /** True once we stopped waiting for a period that never arrived. */
  gaveUp: boolean;
}

/**
 * The challenge period of each registry, read once for a whole list instead of once per row
 * (a row used to open its own RPC connection for the same four numbers).
 */
export const useRegistryChallengePeriods = (): ChallengePeriods => {
  const tokens = useChallengePeriodDuration(registryMap['tokens']);
  const cdn = useChallengePeriodDuration(registryMap['cdn']);
  const singleTags = useChallengePeriodDuration(registryMap['single-tags']);
  const tagQueries = useChallengePeriodDuration(registryMap['tags-queries']);
  const [gaveUp, setGaveUp] = useState(false);
  const allKnown = [tokens, cdn, singleTags, tagQueries].every((value) => value !== null);

  useEffect(() => {
    if (allKnown) return;
    const timer = setTimeout(() => setGaveUp(true), COUNTDOWN_WAIT_MS);
    return () => clearTimeout(timer);
  }, [allKnown]);

  return {
    byRegistry: {
      [registryMap['tokens']]: tokens,
      [registryMap['cdn']]: cdn,
      [registryMap['single-tags']]: singleTags,
      [registryMap['tags-queries']]: tagQueries,
    },
    gaveUp,
  };
};

interface ItemCountdownProps {
  item: {
    status: string;
    disputed: boolean;
    registryAddress: string;
    requests?: Array<{ submissionTime: string }>;
  };
  periods: ChallengePeriods;
  skeletonWidth?: number;
}

/**
 * "Will be included in: 3d 11h" for a pending, unchallenged request, with the end of the challenge
 * period as an absolute date on hover. A placeholder while the period loads; nothing if it never does.
 */
export const ItemCountdown: React.FC<ItemCountdownProps> = ({ item, periods, skeletonWidth = 120 }) => {
  const isPending = item.status === 'RegistrationRequested' || item.status === 'ClearingRequested';
  const challengePeriod = periods.byRegistry[item.registryAddress] ?? null;
  const submissionTime = item.requests?.[0]?.submissionTime;
  const remaining = useChallengeRemainingTime(submissionTime, item.disputed, challengePeriod);
  const endsIn = useHumanizedCountdown(remaining, 2);

  if (!isPending || item.disputed) return null;
  if (challengePeriod === null) {
    return periods.gaveUp ? null : <Skeleton width={skeletonWidth} height={12} />;
  }
  if (!endsIn || !submissionTime) return null;

  const endsAt = Number(submissionTime) + challengePeriod;
  const label = item.status === 'ClearingRequested' ? 'Will be removed in' : 'Will be included in';

  return (
    <>
      <HourglassIcon aria-hidden="true" />
      <span>
        {label}:{' '}
        <time dateTime={new Date(endsAt * 1000).toISOString()} title={formatTimestamp(endsAt, true)}>
          {endsIn}
        </time>
      </span>
    </>
  );
};

const ChainLogoWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`;

/** "Ethereum Mainnet", "Polygon": the chain's name, as AddressDisplay labels chain logos. */
export const getChainName = (chainId: string | undefined): string | undefined =>
  chainId ? chains.find((c) => c.id === chainId)?.name : undefined;

/** A chain logo that says which chain it is (screen readers, and a hover title). */
export const ChainLogo: React.FC<{ chainId: string | undefined; className?: string }> = ({ chainId, className }) => {
  const Icon = getChainIcon(chainId || '');
  if (!Icon) return null;
  const name = getChainName(chainId) ?? 'Unknown chain';
  return (
    <ChainLogoWrapper role="img" aria-label={name} title={name} className={className}>
      <Icon aria-hidden="true" focusable="false" />
    </ChainLogoWrapper>
  );
};

const shortenId = (value: string) => (value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value);

/**
 * What tells apart rows that share a name: the public name tag of a single tag, otherwise the
 * contract address (shortened). Tag queries are already named by their description.
 */
export const getItemSecondaryLabel = (
  item: { props?: Array<{ label: string; value: string }>; itemID?: string },
  registryKey: string,
): string | undefined => {
  if (registryKey === 'tags-queries') return undefined;
  if (registryKey === 'single-tags') {
    const tag = getPropValue(item, 'Public Name Tag').trim();
    if (tag && tag !== getItemDisplayName(item, registryKey)) return tag;
  }
  const caip = getItemAddress(item, registryKey);
  const address = caip?.split(':').pop()?.trim();
  return address ? shortenId(address) : undefined;
};
