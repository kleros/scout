import React, { useState, useEffect, useMemo } from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import ActivityIcon from "svgs/icons/activity.svg";
import SubmissionsIcon from "svgs/icons/submissions.svg";
import { useSubmitterStats } from "hooks/useSubmitterStats";
import { commify } from "utils/commify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import OngoingSubmissions from "./OngoingSubmissions";
import PastSubmissions from "./PastSubmissions";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  min-height: 100vh;
  padding: 32px 32px 64px;
  font-family: "Inter", sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  ${landscapeStyle(
    () => css`
      padding: 80px 0 100px 48px;
      width: calc(100vw - 200px);
    `
  )}
`;

const Header = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  svg {
    min-width: 64px;
    min-height: 64px;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
`;

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  color: ${({ theme }) => theme.secondaryText};
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

const CardRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  svg {
    min-width: 64px;
    min-height: 64px;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.label`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 16px;
`;

const StatValue = styled.span`
  font-size: 32px;
  font-weight: 600;
`;

const PATHS = ["ongoing", "past"];

const Activity: React.FC = () => {
  const [searchParams] = useSearchParams();
  const address = (searchParams.get("userAddress") || "").toLowerCase();
  const { data, isLoading } = useSubmitterStats(address);
  const stats = data?.submitter;
  const navigate = useNavigate();
  const location = useLocation();
  const currentPathSegment = location.pathname.split("/").at(-1) || "";
  const [currentTab, setCurrentTab] = useState(() => {
    const idx = PATHS.indexOf(currentPathSegment);
    return idx > -1 ? idx : 0;
  });
  useEffect(() => {
    const idx = PATHS.indexOf(currentPathSegment);
    setCurrentTab(idx > -1 ? idx : 0);
  }, [currentPathSegment]);
  const ongoingSubmissions = stats?.ongoingSubmissions ?? 0;
  const pastSubmissions = stats?.pastSubmissions ?? 0;
  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const tabs = useMemo(
    () => [
      {
        key: "ongoing",
        label: (
          <>
            Ongoing ({isLoading ? <Skeleton inline width={30} height={20} /> : commify(ongoingSubmissions)})
          </>
        ),
        path: "ongoing",
      },
      {
        key: "past",
        label: (
          <>
            Past ({isLoading ? <Skeleton inline width={30} height={20} /> : commify(pastSubmissions)})
          </>
        ),
        path: "past",
      },
    ],
    [isLoading, ongoingSubmissions, pastSubmissions]
  );
  const basePath = useMemo(() => location.pathname.replace(/\/(ongoing|past).*/, ""), [location.pathname]);
  const switchTab = (n: number) => {
    setCurrentTab(n);
    const params = new URLSearchParams(location.search);
    params.set("page", "1");
    navigate(`${basePath}/${tabs[n].path}?${params.toString()}`);
  };
  return (
    <Container>
      <Header>
        <ActivityIcon />
        <div>
          <Title>My Activity</Title>
          <Subtitle>Follow up your submissions, challenges, and other interactions with Scout.</Subtitle>
        </div>
      </Header>
      <CardRow>
        <StatCard>
          <SubmissionsIcon />
          <StatInfo>
            <StatLabel>Total Submissions</StatLabel>
            <StatValue>{isLoading ? <Skeleton width={70} height={40} /> : commify(totalSubmissions)}</StatValue>
          </StatInfo>
        </StatCard>
      </CardRow>
      <TabsWrapper>
        {tabs.map((tab, i) => (
          <TabButton key={tab.key} selected={i === currentTab} onClick={() => switchTab(i)}>
            {tab.label}
          </TabButton>
        ))}
      </TabsWrapper>
      {currentTab === 0 ? (
        <OngoingSubmissions totalItems={ongoingSubmissions} address={address} />
      ) : (
        <PastSubmissions totalItems={pastSubmissions} address={address} />
      )}
    </Container>
  );
};

export default Activity;
