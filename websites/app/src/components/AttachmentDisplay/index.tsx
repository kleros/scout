import React, { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";

import { MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";

import { useSearchParams, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";

import NewTabIcon from "svgs/icons/new-tab.svg";
import WarningIcon from "svgs/icons/warning-outline.svg";

import LoadingGif from 'gifs/loading-icosahedron.gif'

import { registryAddresses, RegistryType } from "consts/contracts";
import { KLEROS_CDN_BASE } from "consts/index";
import { getAllowedAttachmentUrl } from "utils/url-validation";
import { usePolicyHistory } from "hooks/usePolicyHistory";
import ErrorState from "components/ErrorState";

import Header from "./Header";

const PROBE_TIMEOUT_MS = 15_000;

/**
 * Checks that the gateway serves the file (a HEAD request, as the viewer itself makes). The
 * viewer spins for ever when that request fails, so a failure here replaces it with an error.
 */
const useFileReachable = (url: string | undefined) =>
  useQuery({
    queryKey: ["attachmentReachable", url],
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort);
      const timer = setTimeout(abort, PROBE_TIMEOUT_MS);
      try {
        const response = await fetch(url!, { method: "HEAD", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return true;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    },
    enabled: !!url,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

// Below this width the PDF is fitted to the column (see viewerConfig).
const PDF_FIT_MAX_WIDTH = 600;

const FileViewer = lazy(() =>
  import("@kleros/ui-components-library").then((m) => ({ default: m.FileViewer }))
);

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
`;

const FileViewerSurface = styled.div`
  --klerosUIComponentsWhiteBackground: ${({ theme }) => theme.klerosUIComponentsWhiteBackground};
  --klerosUIComponentsLightBackground: ${({ theme }) => theme.backgroundFour};
  --klerosUIComponentsPrimaryText: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  --klerosUIComponentsSecondaryText: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
  --klerosUIComponentsImageCheckerColor: ${({ theme }) => theme.klerosUIComponentsSkeletonHighlight};
  --color-klerosUIComponentsWhiteBackground: ${({ theme }) => theme.klerosUIComponentsWhiteBackground};
  --color-klerosUIComponentsLightBackground: ${({ theme }) => theme.backgroundFour};
  --color-klerosUIComponentsPrimaryText: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  --color-klerosUIComponentsSecondaryText: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
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
  min-height: 24px;
  margin-left: auto;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.1s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
  }
`;

const UnsafeUrlContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const UnsafeUrlMessage = styled.p`
  margin: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.secondaryText};
`;

const UnsafeUrlBox = styled.div`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 4px;
  background: ${({ theme }) => theme.backgroundFour};
  color: ${({ theme }) => theme.primaryText};
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
`;

const EvidenceAttachmentDisplay: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { registryName } = useParams<{ registryName: string }>();

  const url = searchParams.get("attachment");
  const safeUrl = getAllowedAttachmentUrl(url);
  const reachable = useFileReachable(safeUrl);

  const policyTx = searchParams.get("policyTx");

  const registryAddress = registryName
    ? registryAddresses[registryName as RegistryType]
    : undefined;
  // The full history is a scan of the chain (dozens of public RPC calls). Only the past-policy
  // banner needs it here (a past policy is opened from the history modal, so it is cached by then);
  // "Previous Policies" loads it on demand. Evidence files, images and the current policy do not.
  const { data: historyData } = usePolicyHistory(policyTx ? registryAddress : undefined);

  // On a phone the bundled PDF renderer draws a page (column width - 100px) x zoom wide, which
  // with the library's default zoom (0.8) is about 200px: text a few pixels high. Fit the page to
  // the column instead (12px each side). Measured before the viewer mounts, which reads it once.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (node) setContainerWidth(node.getBoundingClientRect().width);
  }, []);
  const viewerConfig = useMemo(() => {
    if (!containerWidth || containerWidth >= PDF_FIT_MAX_WIDTH || containerWidth <= 200) return undefined;
    const fitZoom = (containerWidth - 24) / (containerWidth - 100);
    return { pdfZoom: { defaultZoom: Math.floor(fitZoom * 100) / 100, zoomJump: 0.1 } };
  }, [containerWidth]);

  const pastPolicyInfo = useMemo(() => {
    if (!url || !policyTx || !historyData) return null;

    // Find the exact entry by txHash
    const matchedEntry = historyData.find((e) => e.txHash === policyTx);
    if (!matchedEntry || matchedEntry.endDate === null) return null;

    // Find the current policy for the "View Current" button
    const currentEntry = historyData.find((e) => e.endDate === null);

    return {
      startDate: format(new Date(matchedEntry.startDate), 'MMM d, yyyy'),
      endDate: format(new Date(matchedEntry.endDate), 'MMM d, yyyy'),
      currentPolicyURI: currentEntry ? `${KLEROS_CDN_BASE}${currentEntry.policyURI}` : null,
    };
  }, [url, policyTx, historyData]);

  const handleViewCurrent = () => {
    if (!pastPolicyInfo?.currentPolicyURI) return;
    // Replaces the viewer's entry but keeps its router state, so Return still knows whether the
    // viewer was opened in the app.
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('attachment', pastPolicyInfo.currentPolicyURI!);
      newParams.delete('policyTx');
      newParams.set('isPolicy', 'true');
      return newParams;
    }, { replace: true, state: location.state });
  };

  return (
    <Container ref={containerRef}>
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
            <ViewCurrentButton type="button" onClick={handleViewCurrent}>
              View Current Policy
            </ViewCurrentButton>
          )}
        </PastPolicyBanner>
      )}
      {safeUrl ? (
        <>
          <NewTabInfo href={safeUrl} rel="noreferrer" target="_blank">
            Open in new tab
            <StyledNewTabIcon />
          </NewTabInfo>
          {reachable.isError ? (
            <ErrorState
              compact
              title="This file could not be loaded from IPFS."
              message="The IPFS gateway did not serve it. Try again, or open the file in a new tab."
              onRetry={() => reachable.refetch()}
              retrying={reachable.isFetching}
            />
          ) : containerWidth !== undefined ? (
            <Suspense
              fallback={
                <LoaderContainer role="status">
                  <LoadingImage src={LoadingGif} alt="Loading the file" />
                </LoaderContainer>
              }
            >
              <FileViewerSurface>
                <FileViewer url={safeUrl} config={viewerConfig} />
              </FileViewerSurface>
            </Suspense>
          ) : null}
        </>
      ) : null}
      {url && !safeUrl ? (
        <UnsafeUrlContainer>
          <UnsafeUrlMessage>This link cannot be previewed here.</UnsafeUrlMessage>
          <UnsafeUrlBox>{url}</UnsafeUrlBox>
        </UnsafeUrlContainer>
      ) : null}
    </Container>
  );
};

export default EvidenceAttachmentDisplay;
