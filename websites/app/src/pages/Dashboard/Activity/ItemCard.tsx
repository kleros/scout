import React, { useMemo } from "react";
import styled from "styled-components";
import { format } from "date-fns";
import { formatEther } from "ethers";
import { useNavigate } from "react-router-dom";
import AddressDisplay from "components/AddressDisplay";
import { revRegistryMap } from 'utils/items';
import { useScrollTop } from "hooks/useScrollTop";
import useHumanizedCountdown, {
  useChallengeRemainingTime,
  useChallengePeriodDuration,
} from "hooks/countdown";
import { shortenAddress } from "~src/utils/shortenAddress";
import HourglassIcon from "svgs/icons/hourglass.svg";

const Card = styled.div`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.backgroundTwo};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(153, 153, 153, 0.08) 100%
  );
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
`;

const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  white-space: nowrap;
`;

const Bullet = styled.span<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ color }) => color};
  flex: 0 0 8px;
`;

const Title = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`;

const Registry = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`;

const StatusLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.backgroundTwo};
  margin: 0;
`;

const Body = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MetaLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
`;

const InfoRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  flex: 1;
  min-width: 0;
`;

const LabelValue = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`;

const ViewButton = styled.button`
  position: relative;
  padding: 8px 24px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  cursor: pointer;
  font-size: 14px;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    padding: 1px;
    background: linear-gradient(90deg, #8B5CF6 0%, #1C3CF1 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
  }
`;

const StyledChainLabel = styled.span`
  margin-bottom: 8px;
`;

const StyledChainContainer = styled(LabelValue)`
  margin-bottom: -8px;
`;

const statusColors: Record<string, string> = {
  Included: "#65DC7F",
  Removed: "#FF5A78",
  "Registration Requested": "#60A5FA",
  "Removal Requested": "#FBBF24",
  Challenged: "#E87B35",
};

const readableStatus: Record<string, string> = {
  Registered: "Included",
  Absent: "Removed",
  RegistrationRequested: "Registration Requested",
  ClearingRequested: "Removal Requested",
};

const challengedStatus: Record<string, string> = {
  RegistrationRequested: "Challenged",
  ClearingRequested: "Challenged",
};

const getProp = (item: any, label: string) =>
  item?.metadata?.props?.find((p: any) => p.label === label)?.value ?? "";

const ItemCard = ({ item }: { item: any }) => {
  const navigate = useNavigate();
  const scrollTop = useScrollTop();

  const registryName = revRegistryMap[item.registryAddress] ?? "Unknown";

  const displayName =
    getProp(item, "Name") ||
    getProp(item, "Domain name") ||
    getProp(item, "Public Name Tag") ||
    getProp(item, "Description") ||
    item.itemID;

  const statusText = item.disputed
    ? challengedStatus[item.status] || "Challenged"
    : readableStatus[item.status] || item.status;

  const bulletColor = statusColors[statusText] ?? "#9CA3AF";

  const submittedOn =
    item.requests?.[0]?.submissionTime != null
      ? format(new Date(Number(item.requests[0].submissionTime) * 1000), "PP")
      : "-";

  const deposit =
    item.requests?.[0]?.deposit != null
      ? Number(formatEther(item.requests[0].deposit)).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })
      : "-";

  const requester = item.requests?.[0]?.requester ?? "";

  const chainId = getProp(item, "EVM Chain ID");
  const entryAddrMap: Record<string, string | undefined> = {
    Single_Tags: getProp(item, "Contract Address"),
    Tags_Queries: undefined,
    Tokens: getProp(item, "Address"),
    CDN: getProp(item, "Contract address"),
  };
  const entryAddr = entryAddrMap[registryName];

  const challengePeriodDuration = useChallengePeriodDuration(item.registryAddress);
  const endsAtSeconds = useChallengeRemainingTime(
    item.requests?.[0]?.submissionTime,
    item.disputed,
    challengePeriodDuration
  );
  const endsIn = useHumanizedCountdown(endsAtSeconds, 2);
  const showEndsIn = useMemo(
    () => Boolean(endsIn) && item.status !== "Registered",
    [endsIn, item.status]
  );

  const onView = () => {
    const params = new URLSearchParams();
    params.set("registry", registryName);
    params.set("status", "Registered");
    params.set("status", "RegistrationRequested");
    params.set("status", "ClearingRequested");
    params.set("status", "Absent");
    params.set("disputed", "true");
    params.set("disputed", "false");
    params.set("page", "1");
    params.set("orderDirection", "desc");
    navigate(`/item/${item.id}?${params.toString()}`);
    scrollTop();
  };

  return (
    <Card>
      <Header>
        <HeaderLeft>
          <Title>{displayName}</Title>
          <Registry>({registryName})</Registry>
          <Bullet color={bulletColor} />
          <StatusLabel>{statusText}</StatusLabel>
        </HeaderLeft>
        {showEndsIn && (
          <HeaderRight>
            <HourglassIcon />
            Will be included in: {endsIn}
          </HeaderRight>
        )}
      </Header>

      <Divider />

      <Body>
        <MetaLine>
          <InfoRow>
            <LabelValue>
              <span>Submitted on:</span>
              <span>{submittedOn}</span>
            </LabelValue>

            {requester && (
              <LabelValue>
                <span>by {shortenAddress(requester)}</span>
              </LabelValue>
            )}

            <LabelValue>
              <span>Deposit:</span>
              <span>{deposit} xDAI</span>
            </LabelValue>

            {chainId && (
              <StyledChainContainer>
                <StyledChainLabel>Chain:</StyledChainLabel>
                <AddressDisplay address={`eip155:${chainId}`} />
              </StyledChainContainer>
            )}

            {entryAddr && (
              <StyledChainContainer>
                <StyledChainLabel>Chain:</StyledChainLabel>
                <AddressDisplay address={entryAddr} />
              </StyledChainContainer>
            )}
          </InfoRow>

          <ViewButton onClick={onView}>View</ViewButton>
        </MetaLine>
      </Body>
    </Card>
  );
};

export default ItemCard;
