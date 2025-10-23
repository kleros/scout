import React, { lazy, Suspense } from "react";
import styled from "styled-components";

import { MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";

import { useSearchParams } from "react-router-dom";

import NewTabIcon from "svgs/icons/new-tab.svg";

import LoadingGif from 'gifs/loading-icosahedron.gif'

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

const EvidenceAttachmentDisplay: React.FC = () => {
  const [searchParams] = useSearchParams();

  const url = searchParams.get("attachment");
  return (
    <Container>
      <Header />
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
