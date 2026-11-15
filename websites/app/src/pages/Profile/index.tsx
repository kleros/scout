import React, { useState, useEffect, useMemo, useRef, useCallback, useId } from "react";
import styled, { css, createGlobalStyle, useTheme } from "styled-components";
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAccount, useEnsAddress } from "wagmi";
import { isAddress } from "viem";
import { normalize } from "viem/ens";
import ProfileIcon from "svgs/icons/activity.svg";
import { useSubmitterStats } from "hooks/useSubmitterStats";
import { useDisputeStats } from "hooks/useDisputeStats";
import { useCurateRewards } from "hooks/useCurateRewards";
import { useDocumentTitle } from "hooks/useDocumentTitle";
import { commify } from "utils/commify";
import { formatValue } from "utils/formatValue";
import { shortenAddress } from "utils/shortenAddress";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ConnectWallet from "components/ConnectWallet";
import ErrorState from "components/ErrorState";
import { baseButtonStyles, primaryButtonStyles, secondaryButtonStyles } from "components/Button";
import SubmissionsTab from "./SubmissionsTab";
import Disputes, { DisputeListReport } from "./Disputes";
import { ListCount, ListReport } from "./ListStates";
import FilterButton from "components/FilterButton";
import FilterModal from "components/FilterModal";
import { SearchBar as ProfileSearchBar } from "pages/Registries/Search";
import Copyable from "components/Copyable";
import { ExternalLink } from "components/ExternalLink";
import { getAddressExplorerUrl, GNOSIS_CHAIN_ID } from "utils/chains";
import { useProfileFilters } from "context/FilterContext";
import { countProfileFilters, PENDING_STATUSES, RESOLVED_STATUSES } from "utils/profileFilters";
import ScrollTop from "components/ScrollTop";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: "Manrope", sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;

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
  flex-wrap: wrap;
  svg {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
`;

const HeaderStatsContainer = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      margin-left: auto;
    `
  )}
`;

const HeaderStatBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 120px;
  padding: 12px 20px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
`;

const StatSubValue = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  white-space: nowrap;
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
`;

const StyledExternalLink = styled(ExternalLink)`
  color: ${({ theme }) => theme.secondaryBlue};
  font-size: 24px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
  }
`;

const TooltipGlobalStyle = createGlobalStyle`
  .dark-tooltip {
    background-color: ${({ theme }) => theme.darkBackground} !important;
    color: ${({ theme }) => theme.primaryText} !important;
    border: 1px solid ${({ theme }) => theme.lightGrey} !important;
    box-shadow: ${({ theme }) => theme.shadowTooltip} !important;
    font-size: 12px !important;
    padding: 6px 8px !important;
    border-radius: 4px !important;
    z-index: 1000 !important;
  }

  .dark-tooltip svg {
    min-height: 24px;
    min-width: 24px;
    margin-left: 6px;
  }
`;

const StyledCopyable = styled(Copyable)`
  display: inline-flex;
  align-items: center;
  gap: 4px;

  button {
    color: ${({ theme }) => theme.secondaryBlue};
    transition: color 0.2s ease;

    &:hover {
      color: ${({ theme }) => theme.primaryBlue};
      opacity: 1;
    }
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  color: ${({ theme }) => theme.secondaryText};
`;

const TotalSubmissionsCount = styled.span`
  color: ${({ theme }) => theme.secondaryBlue};
  font-weight: 700;
`;

const CountsError = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin: 8px 0 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`;

const TextButton = styled.button`
  min-height: 24px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.primaryBlue};
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:disabled {
    color: ${({ theme }) => theme.secondaryText};
    cursor: default;
  }
`;

const TabsWrapper = styled.div`
  display: flex;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ selected: boolean }>`
  flex: 1;
  background: transparent;
  border: none;
  padding: 16px 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.secondaryText)};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ theme, selected }) => (selected ? theme.secondaryBlue : "transparent")};
    border-radius: 3px 3px 0 0;
    transition: background 0.2s ease;
  }

  &:hover {
    color: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.primaryText)};

    &::after {
      background: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.stroke)};
    }
  }

  &:focus-visible {
    outline-offset: -2px;
  }

  .tab-full {
    display: none;
  }

  .tab-short {
    display: inline;
  }

  ${landscapeStyle(
    () => css`
      font-size: 18px;
      padding: 16px 24px;

      .tab-full {
        display: inline;
      }

      .tab-short {
        display: none;
      }
    `
  )}
`;

const ConnectWalletContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.primaryText};
  gap: 24px;

  hr {
    width: 200px;
    border: 1px solid ${({ theme }) => theme.lightGrey};
    margin: 0;
  }
`;

const InvalidAddressContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  max-width: 640px;

  p {
    margin: 0;
    color: ${({ theme }) => theme.secondaryText};
    overflow-wrap: anywhere;
  }
`;

const PillLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

const PillLink = styled(Link)<{ $primary?: boolean }>`
  ${baseButtonStyles}
  ${({ $primary }) => ($primary ? primaryButtonStyles : secondaryButtonStyles)}
  font-size: 14px;
  padding: 10px 20px;
  text-decoration: none;
`;

const FilterControlsContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const SubTabsWrapper = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
`;

const SubTabButton = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.secondaryText)};
  border-bottom: 2px solid ${({ theme, selected }) => (selected ? theme.secondaryBlue : "transparent")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`;

const DisputeStatsContainer = styled.div`
  display: flex;
  gap: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.lightBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 80px;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  text-transform: uppercase;
`;

const StatValue = styled.span<{ color?: string }>`
  font-size: 20px;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.primaryText};
`;

const StatDivider = styled.div`
  width: 1px;
  background: ${({ theme }) => theme.stroke};
  align-self: stretch;
`;

const PATHS = ["pending", "resolved", "disputes"] as const;
const TAB_STATUSES: Array<string[] | undefined> = [PENDING_STATUSES, RESOLVED_STATUSES, undefined];

const UnknownValue = styled.span`
  color: ${({ theme }) => theme.secondaryText};
`;

/** A count that did not load: a grey dash, never a zero. */
const Unknown: React.FC = () => (
  <UnknownValue title="Did not load">
    <span aria-hidden="true">—</span>
    <span className="visually-hidden">did not load</span>
  </UnknownValue>
);

/** "63", or "3/63" when the filters or the search leave fewer rows than the address has. */
const ShownOfTotal: React.FC<{ count: ListCount }> = ({ count }) =>
  count.shown === count.total ? (
    <>{commify(count.total)}</>
  ) : (
    <>
      {commify(count.shown)}
      <span aria-hidden="true">/</span>
      <span className="visually-hidden"> of </span>
      {commify(count.total)}
    </>
  );

type CountState = "loading" | "failed" | "ready";

/** Loading while a read without data is running, failed once it gave up, ready with data. */
const countState = (query: { data?: unknown; isError: boolean; isFetching: boolean }): CountState =>
  query.data !== undefined ? "ready" : query.isError && !query.isFetching ? "failed" : "loading";

/** Moves between the tabs of a tablist with the arrow keys, Home and End (WAI-ARIA tabs pattern). */
const nextTabIndex = (key: string, index: number, count: number): number | null => {
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
};

const Profile: React.FC = () => {
  const theme = useTheme();
  const { isConnected, address: connectedAddress } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useProfileFilters();
  const navigate = useNavigate();
  const location = useLocation();

  // ?address= must be a wallet address. An ENS name is looked up and replaced by its address;
  // anything else gets a message instead of the profile.
  const addressParam = searchParams.get("address")?.trim() || null;
  const paramIsAddress = !!addressParam && isAddress(addressParam, { strict: false });
  const invalidParam = addressParam && !paramIsAddress ? addressParam : null;
  const userAddress = paramIsAddress ? addressParam : null;
  const address = invalidParam ? "" : (userAddress || connectedAddress || "").toLowerCase();
  const isOwnProfile = isConnected && !!connectedAddress && !!address && address === connectedAddress.toLowerCase();

  const ensName = useMemo(() => {
    if (!invalidParam || !invalidParam.includes(".")) return undefined;
    try {
      return normalize(invalidParam);
    } catch {
      return undefined;
    }
  }, [invalidParam]);
  const ens = useEnsAddress({ name: ensName, chainId: 1, query: { enabled: !!ensName } });
  const ensAddress = ens.data;
  useEffect(() => {
    if (!ensName || !ensAddress) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("address", ensAddress.toLowerCase());
        return next;
      },
      { replace: true }
    );
  }, [ensName, ensAddress, setSearchParams]);

  const submitterStatsQuery = useSubmitterStats(address);
  const disputeStatsQuery = useDisputeStats(address);
  const rewardsQuery = useCurateRewards(address);
  const stats = submitterStatsQuery.data?.submitter;
  const disputeStats = disputeStatsQuery.data?.disputeStats;
  const rewardsData = rewardsQuery.data;
  const statsState = countState(submitterStatsQuery);
  const disputeState = countState(disputeStatsQuery);
  const rewardsState = countState(rewardsQuery);

  const retryFailedCounts = () => {
    if (submitterStatsQuery.isError) submitterStatsQuery.refetch();
    if (disputeStatsQuery.isError) disputeStatsQuery.refetch();
    if (rewardsQuery.isError) rewardsQuery.refetch();
  };

  useDocumentTitle(userAddress ? `Profile ${shortenAddress(userAddress).replace("...", "…")}` : "Profile");

  // The page and the disputes sub-tab live in the address bar with the address and the tab, so a
  // page number never follows you to another profile or tab, and Back from an item returns to it.
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const showResolvedDisputes = searchParams.get("disputes") === "resolved";
  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === null) next.delete(key);
            else next.set(key, value);
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const setPage = useCallback((newPage: number) => updateParams({ page: newPage > 1 ? String(newPage) : null }), [updateParams]);
  const setShowResolvedDisputes = (resolved: boolean) =>
    updateParams({ disputes: resolved ? "resolved" : null, page: null });

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Counts reported by the tab on screen once its list is read
  const [pendingReport, setPendingReport] = useState<ListReport>(null);
  const [resolvedReport, setResolvedReport] = useState<ListReport>(null);
  const [disputesReport, setDisputesReport] = useState<DisputeListReport>(null);

  // Auto-add connected address to URL when user connects wallet
  useEffect(() => {
    if (isConnected && connectedAddress && !addressParam) {
      const newParams = new URLSearchParams();
      newParams.set("address", connectedAddress.toLowerCase());
      setSearchParams(newParams, { replace: true });
    }
  }, [isConnected, connectedAddress, addressParam, setSearchParams]);

  // Back to page 1 when a filter or the search changes
  const filterKey = [
    filters.status.slice().sort().join(","),
    filters.disputed.slice().sort().join(","),
    String(filters.hasEverBeenDisputed),
    filters.text,
    filters.chainFilters.slice().sort().join(","),
    filters.orderDirection,
    filters.dateRange,
    filters.customDateFrom,
    filters.customDateTo,
  ].join("|");
  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKeyRef.current === filterKey) return;
    prevFilterKeyRef.current = filterKey;
    if (page !== 1) setPage(1);
  }, [filterKey, page, setPage]);

  const addressExplorerLink = useMemo(() => {
    if (!userAddress) return null;
    return getAddressExplorerUrl(GNOSIS_CHAIN_ID, userAddress);
  }, [userAddress]);
  const currentPathSegment = location.pathname.split("/").at(-1) || "";
  const currentTab = Math.max(0, PATHS.indexOf(currentPathSegment as (typeof PATHS)[number]));

  const tabCount = (report: ListReport, total: number | undefined, state: CountState, width: number) => {
    if (report && report !== "failed") return <ShownOfTotal count={report} />;
    if (state === "loading") return <Skeleton inline width={width} height={16} />;
    if (state === "failed" || total === undefined) return <Unknown />;
    return commify(total);
  };
  const disputesTotal: ListReport =
    disputesReport && disputesReport !== "failed"
      ? {
          shown: disputesReport.active.shown + disputesReport.resolved.shown,
          total: disputesReport.active.total + disputesReport.resolved.total,
        }
      : null;
  const activeDisputes = disputeStats?.activeDisputes;
  const resolvedDisputes = disputeStats?.resolvedDisputes;
  const statsDisputesTotal =
    activeDisputes !== undefined && resolvedDisputes !== undefined ? activeDisputes + resolvedDisputes : undefined;

  const tabs = [
    {
      key: "pending",
      short: "Pending",
      full: "Pending Submissions",
      count: (width: number) => tabCount(pendingReport, stats?.pendingSubmissions.count, statsState, width),
    },
    {
      key: "resolved",
      short: "Resolved",
      full: "Resolved Submissions",
      count: (width: number) => tabCount(resolvedReport, stats?.resolvedSubmissions.count, statsState, width),
    },
    {
      key: "disputes",
      short: "Disputes",
      full: "Disputes",
      count: (width: number) => tabCount(disputesTotal, statsDisputesTotal, disputeState, width),
    },
  ];

  const switchTab = (n: number) => {
    if (n === currentTab) return;
    const params = new URLSearchParams();
    if (userAddress) params.set("address", userAddress);
    navigate(`/profile/${PATHS[n]}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const idPrefix = useId().replace(/:/g, "");
  const tabId = (index: number) => `${idPrefix}-tab-${PATHS[index]}`;
  const panelId = `${idPrefix}-panel`;
  const subTabId = (resolved: boolean) => `${idPrefix}-disputes-${resolved ? "resolved" : "active"}`;
  const subPanelId = `${idPrefix}-disputes-panel`;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const subTabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, tabs.length);
    if (next === null) return;
    event.preventDefault();
    switchTab(next);
    tabRefs.current[next]?.focus();
  };

  const handleSubTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, 2);
    if (next === null) return;
    event.preventDefault();
    setShowResolvedDisputes(next === 1);
    subTabRefs.current[next]?.focus();
  };

  const shouldShowConnectWallet = !isConnected && !addressParam;

  const renderAddressLink = (address: string) => (
    <StyledCopyable
      copyableContent={address}
      info="Copy address"
    >
      {addressExplorerLink ? (
        <StyledExternalLink to={addressExplorerLink} target="_blank" rel="noopener noreferrer">
          {shortenAddress(address)}
        </StyledExternalLink>
      ) : (
        shortenAddress(address)
      )}
    </StyledCopyable>
  );

  const renderStat = (state: CountState, value: React.ReactNode, width = 30) =>
    state === "loading" ? <Skeleton width={width} height={24} /> : state === "failed" ? <Unknown /> : value;

  const winLoss = (wins: number, losses: number) => (
    <span>
      <span aria-hidden="true">
        <span style={{ color: theme.success }}>{wins}W</span>
        {" / "}
        <span style={{ color: theme.error }}>{losses}L</span>
      </span>
      <span className="visually-hidden">{`${wins} won, ${losses} lost`}</span>
    </span>
  );

  const removerDisputes = (disputeStats?.winsAsRemover ?? 0) + (disputeStats?.lossesAsRemover ?? 0);
  const submitterDisputes = (disputeStats?.winsAsSubmitter ?? 0) + (disputeStats?.lossesAsSubmitter ?? 0);
  const activeReport = [pendingReport, resolvedReport, disputesReport][currentTab];
  const someCountFailed = statsState === "failed" || disputeState === "failed" || rewardsState === "failed";
  const retryingCounts = submitterStatsQuery.isFetching || disputeStatsQuery.isFetching || rewardsQuery.isFetching;

  const renderInvalidAddress = (value: string) => {
    const shown = value.length > 64 ? `${value.slice(0, 64)}…` : value;
    let body: React.ReactNode;
    if (ensName && (ensAddress || (ens.isFetching && !ens.isError))) {
      body = <p role="status">Looking up “{shown}”…</p>;
    } else if (ensName && ens.isError) {
      body = (
        <ErrorState
          compact
          title={`“${shown}” could not be looked up.`}
          message="The ENS lookup did not answer. Check your connection and try again."
          onRetry={() => ens.refetch()}
          retrying={ens.isFetching}
        />
      );
    } else if (ensName) {
      body = <p>No wallet address is set for the ENS name “{shown}”.</p>;
    } else {
      body = (
        <>
          <p>“{shown}” is not a wallet address.</p>
          <p>Wallet addresses start with 0x and are 42 characters long. ENS names such as name.eth work too.</p>
        </>
      );
    }
    return (
      <InvalidAddressContainer>
        <Title>Profile</Title>
        {body}
        <PillLinks>
          {isConnected && connectedAddress ? (
            <PillLink $primary to={`/profile/pending?address=${connectedAddress.toLowerCase()}`}>
              Go to your profile
            </PillLink>
          ) : null}
          <PillLink $primary={!(isConnected && connectedAddress)} to="/home">
            Go to Home
          </PillLink>
        </PillLinks>
      </InvalidAddressContainer>
    );
  };

  return (
    <Container>
      <ScrollTop />
      <TooltipGlobalStyle />
      {invalidParam ? (
        renderInvalidAddress(invalidParam)
      ) : !shouldShowConnectWallet ? (
        <>
          <Header>
            <ProfileIcon aria-hidden="true" />
            <div>
              <Title>
                {isOwnProfile && userAddress
                  ? <>My Profile - {renderAddressLink(userAddress)}</>
                  : userAddress
                  ? <>Profile - {renderAddressLink(userAddress)}</>
                  : "My Profile"}
              </Title>
              <Subtitle>
                <TotalSubmissionsCount>
                  {statsState === "loading" ? (
                    <Skeleton inline width={30} height={16} />
                  ) : statsState === "failed" || !stats ? (
                    <Unknown />
                  ) : (
                    `${commify(stats.totalSubmissions.count)}${stats.totalSubmissions.capped ? "+" : ""}`
                  )}
                </TotalSubmissionsCount> total submissions. Follow up on {isOwnProfile ? "your " : ""}submissions, challenges, and other interactions with Scout.
              </Subtitle>
              {someCountFailed && activeReport !== "failed" ? (
                <CountsError role="alert">
                  Some counts did not load.
                  <TextButton type="button" onClick={retryFailedCounts} disabled={retryingCounts}>
                    {retryingCounts ? "Trying again..." : "Try again"}
                  </TextButton>
                </CountsError>
              ) : null}
            </div>
            <HeaderStatsContainer>
              <HeaderStatBox title="Each challenge this address won earned it the deposit of the submitter or remover it challenged. Appeal fee rewards are not included.">
                <StatLabel>Challenges won</StatLabel>
                <StatValue color={theme.success}>
                  {renderStat(disputeState, commify(disputeStats?.winsAsChallenger ?? 0), 40)}
                </StatValue>
                {disputeStats && disputeStats.bountiesWonWei > 0n && (
                  <StatSubValue>
                    ≈ {formatValue(disputeStats.bountiesWonWei, 0)} xDAI in bounties
                  </StatSubValue>
                )}
              </HeaderStatBox>
              <HeaderStatBox>
                <StatLabel>Rewards</StatLabel>
                <StatValue color={theme.secondaryBlue}>
                  {renderStat(
                    rewardsState,
                    rewardsData ? `${formatValue(rewardsData.totalWei, 0)} ${rewardsData.tokenSymbol}` : null,
                    80
                  )}
                </StatValue>
                {rewardsData && (
                  <StatSubValue>
                    {rewardsData.rewardedMonths > 0
                      ? `All time · rewarded in ${rewardsData.rewardedMonths} ${rewardsData.rewardedMonths === 1 ? "month" : "months"}`
                      : "All time"}
                  </StatSubValue>
                )}
              </HeaderStatBox>
            </HeaderStatsContainer>
          </Header>
          <FilterControlsContainer>
            <ProfileSearchBar text={filters.text} setText={filters.setText} label="Search this profile" />
            <FilterButton
              onClick={() => setIsFilterModalOpen(true)}
              activeCount={countProfileFilters(filters, TAB_STATUSES[currentTab])}
            />
          </FilterControlsContainer>
          <TabsWrapper role="tablist" aria-label="Profile sections">
            {tabs.map((tab, i) => (
              <TabButton
                key={tab.key}
                ref={(element) => {
                  tabRefs.current[i] = element;
                }}
                type="button"
                role="tab"
                id={tabId(i)}
                aria-selected={i === currentTab}
                aria-controls={panelId}
                tabIndex={i === currentTab ? 0 : -1}
                selected={i === currentTab}
                onClick={() => switchTab(i)}
                onKeyDown={(event) => handleTabKeyDown(event, i)}
              >
                <span className="tab-short">{tab.short} ({tab.count(20)})</span>
                <span className="tab-full">{tab.full} ({tab.count(30)})</span>
              </TabButton>
            ))}
          </TabsWrapper>
          <div role="tabpanel" id={panelId} aria-labelledby={tabId(currentTab)}>
            {currentTab === 0 && (
              <SubmissionsTab
                key="pending"
                kind="pending"
                address={address}
                isOwnProfile={isOwnProfile}
                page={page}
                onPageChange={setPage}
                onReport={setPendingReport}
                onRetryCounts={retryFailedCounts}
              />
            )}
            {currentTab === 1 && (
              <SubmissionsTab
                key="resolved"
                kind="resolved"
                address={address}
                isOwnProfile={isOwnProfile}
                page={page}
                onPageChange={setPage}
                onReport={setResolvedReport}
                onRetryCounts={retryFailedCounts}
              />
            )}
            {currentTab === 2 && (
              <>
                <DisputeStatsContainer>
                  <StatBox>
                    <StatLabel>Active</StatLabel>
                    <StatValue>{renderStat(disputeState, commify(activeDisputes ?? 0))}</StatValue>
                  </StatBox>
                  <StatDivider />
                  <StatBox>
                    <StatLabel>Resolved</StatLabel>
                    <StatValue>{renderStat(disputeState, commify(resolvedDisputes ?? 0))}</StatValue>
                  </StatBox>
                  <StatDivider />
                  <StatBox>
                    <StatLabel>Wins</StatLabel>
                    <StatValue color={theme.success}>
                      {renderStat(disputeState, commify(disputeStats?.totalWins ?? 0))}
                    </StatValue>
                  </StatBox>
                  <StatBox>
                    <StatLabel>Losses</StatLabel>
                    <StatValue color={theme.error}>
                      {renderStat(disputeState, commify(disputeStats?.totalLosses ?? 0))}
                    </StatValue>
                  </StatBox>
                  <StatDivider />
                  {submitterDisputes > 0 || removerDisputes === 0 ? (
                    <StatBox>
                      <StatLabel>As submitter</StatLabel>
                      <StatValue>
                        {renderStat(
                          disputeState,
                          winLoss(disputeStats?.winsAsSubmitter ?? 0, disputeStats?.lossesAsSubmitter ?? 0),
                          60
                        )}
                      </StatValue>
                    </StatBox>
                  ) : null}
                  {removerDisputes > 0 ? (
                    <StatBox>
                      <StatLabel>As remover</StatLabel>
                      <StatValue>
                        {winLoss(disputeStats?.winsAsRemover ?? 0, disputeStats?.lossesAsRemover ?? 0)}
                      </StatValue>
                    </StatBox>
                  ) : null}
                  <StatBox>
                    <StatLabel>As challenger</StatLabel>
                    <StatValue>
                      {renderStat(
                        disputeState,
                        winLoss(disputeStats?.winsAsChallenger ?? 0, disputeStats?.lossesAsChallenger ?? 0),
                        60
                      )}
                    </StatValue>
                  </StatBox>
                </DisputeStatsContainer>
                <SubTabsWrapper role="tablist" aria-label="Dispute status">
                  {[false, true].map((resolved, i) => {
                    const report = disputesReport && disputesReport !== "failed" ? disputesReport[resolved ? "resolved" : "active"] : null;
                    const fallback = resolved ? resolvedDisputes : activeDisputes;
                    const selected = showResolvedDisputes === resolved;
                    return (
                      <SubTabButton
                        key={resolved ? "resolved" : "active"}
                        ref={(element) => {
                          subTabRefs.current[i] = element;
                        }}
                        type="button"
                        role="tab"
                        id={subTabId(resolved)}
                        aria-selected={selected}
                        aria-controls={subPanelId}
                        tabIndex={selected ? 0 : -1}
                        selected={selected}
                        onClick={() => {
                          if (!selected) setShowResolvedDisputes(resolved);
                        }}
                        onKeyDown={(event) => handleSubTabKeyDown(event, i)}
                      >
                        {resolved ? "Resolved" : "Active"} ({tabCount(report, fallback, disputeState, 20)})
                      </SubTabButton>
                    );
                  })}
                </SubTabsWrapper>
                <div role="tabpanel" id={subPanelId} aria-labelledby={subTabId(showResolvedDisputes)}>
                  <Disputes
                    address={address}
                    isOwnProfile={isOwnProfile}
                    showResolved={showResolvedDisputes}
                    page={page}
                    onPageChange={setPage}
                    onReport={setDisputesReport}
                    onRetryCounts={retryFailedCounts}
                  />
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <ConnectWalletContainer>
          <Title>Connect Your Wallet</Title>
          <Subtitle>To see your profile, connect your wallet first</Subtitle>
          <ConnectWallet />
        </ConnectWalletContainer>
      )}

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        chainFilters={filters.chainFilters}
        onChainFiltersChange={filters.setChainFilters}
        scope="profile"
        hideStatusFilters={currentTab === 2}
      />
    </Container>
  );
};

export default Profile;
