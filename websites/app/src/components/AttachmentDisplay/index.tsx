import React, { lazy, Suspense, useMemo } from "react";
import styled from "styled-components";

import { MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";

import { useSearchParams, useParams } from "react-router-dom";
import { format } from "date-fns";

import NewTabIcon from "svgs/icons/new-tab.svg";
import WarningIcon from "svgs/icons/warning-outline.svg";

import LoadingGif from 'gifs/loading-icosahedron.gif'

import { registryAddresses, RegistryType } from "consts/contracts";
import { policyHistories } from "consts/policyHistory";
import { KLEROS_CDN_BASE } from "consts/index";

import Header from "./Header";

const FileViewer = lazy(() => import("components/FileViewer"));

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
`;

const LoaderContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`;

const NewTabInfo = styled.a`
  align-self: flex-end;
  display: flex;
  gap: 8px;
  align-items: center;
  color: ${({ theme }) => theme.secondaryBlue};
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryBlue};
  }
`;

const StyledNewTabIcon = styled(NewTabIcon)`
  path {
    fill: ${({ theme }) => theme.secondaryBlue};
    transition: fill 0.2s ease;
  }
`;

const LoadingImage = styled.img`
  height: 90px;
`

const PastPolicyBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.warning}14;
  border: 1px solid ${({ theme }) => theme.warning}40;
`;

const StyledWarningIcon = styled(WarningIcon)`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`;

const BannerText = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.warning};
  font-weight: 600;
`;

const BannerDateRange = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  font-weight: 400;
`;

const ViewCurrentButton = styled.button`
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryBlue};
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: auto;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.1s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
  }
`;

const EvidenceAttachmentDisplay: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { registryName } = useParams<{ registryName: string }>();

  const url = searchParams.get("attachment");

  const policyTx = searchParams.get("policyTx");

  const pastPolicyInfo = useMemo(() => {
    if (!url || !registryName) return null;
    // No policyTx means the user opened the policy from the registry page (always the current one)
    if (!policyTx) return null;

    const registryAddress = registryAddresses[registryName as RegistryType];
    if (!registryAddress) return null;

    const history = policyHistories[registryAddress.toLowerCase()];
    if (!history) return null;

    // Find the exact entry by txHash
    const matchedEntry = history.find((e) => e.txHash === policyTx);
    if (!matchedEntry || matchedEntry.endDate === null) return null;

    // Find the current policy for the "View Current" button
    const currentEntry = history.find((e) => e.endDate === null);

    return {
      startDate: format(new Date(matchedEntry.startDate), 'MMM d, yyyy'),
      endDate: format(new Date(matchedEntry.endDate), 'MMM d, yyyy'),
      currentPolicyURI: currentEntry ? `${KLEROS_CDN_BASE}${currentEntry.policyURI}` : null,
    };
  }, [url, registryName, policyTx]);

  const handleViewCurrent = () => {
    if (!pastPolicyInfo?.currentPolicyURI) return;
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('attachment', pastPolicyInfo.currentPolicyURI!);
      newParams.delete('policyTx');
      return newParams;
    }, { replace: true });
  };

  return (
    <Container>
      <Header />
      {pastPolicyInfo && (
        <PastPolicyBanner>
          <StyledWarningIcon />
          <div>
            <BannerText>Past Policy</BannerText>
            {' '}
            <BannerDateRange>
              ({pastPolicyInfo.startDate} — {pastPolicyInfo.endDate})
            </BannerDateRange>
          </div>
          {pastPolicyInfo.currentPolicyURI && (
            <ViewCurrentButton onClick={handleViewCurrent}>
              View Current Policy
            </ViewCurrentButton>
          )}
        </PastPolicyBanner>
      )}
      {url ? (
        <>
          <NewTabInfo href={url} rel="noreferrer" target="_blank">
            Open in new tab
            <StyledNewTabIcon />
          </NewTabInfo>
          <Suspense
            fallback={
              <LoaderContainer>
                <LoadingImage src={LoadingGif} />
              </LoaderContainer>
            }
          >
            <FileViewer url={url} />
          </Suspense>
        </>
      ) : null}
    </Container>
  );
};

export default EvidenceAttachmentDisplay;
