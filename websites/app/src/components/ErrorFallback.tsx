import React from "react";
import styled, { css } from "styled-components";

import { MAX_WIDTH_LANDSCAPE, landscapeStyle } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";

import { FallbackProps } from "react-error-boundary";

import Button, { baseButtonStyles, secondaryButtonStyles } from "components/Button";

import ErrorIcon from "svgs/icons/warning-outline.svg";

// Shown inside the page (header and footer stay) and, for errors outside the page, on its own.
const Container = styled.div`
  width: 100%;
  min-height: 60vh;
  background-color: ${({ theme }) => theme.lightBackground};
  padding: ${responsiveSize(32, 80)} ${responsiveSize(24, 136)} ${responsiveSize(76, 96)};
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
`;

const ErrorContainer = styled.div`
  display: flex;
  width: 100%;
  gap: 48px 16px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  ${landscapeStyle(
    () => css`
      flex-direction: row;
      justify-content: space-between;
    `
  )}
`;

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;
  flex: 1;
  ${landscapeStyle(
    () => css`
      align-items: start;
    `
  )}
`;

const textCss = css`
  margin: 0;
  text-align: center;
  white-space: pre-line;

  ${landscapeStyle(
    () => css`
      text-align: left;
    `
  )}
`;

const Header = styled.h1`
  ${textCss}
`;

const Subtitle = styled.p`
  ${textCss}
  max-width: 735px;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;

  a {
    font-size: inherit;
    font-weight: inherit;
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const HeaderIconContainer = styled.div`
  svg {
    width: 64px;
    height: 64px;
    path {
      fill: ${({ theme }) => theme.error};
    }
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
`;

const HomeLink = styled.a`
  ${baseButtonStyles}
  ${secondaryButtonStyles}
  font-size: 16px;
  padding: 10px ${responsiveSize(16, 24)};
`;

const IconContainer = styled.div`
  svg {
    width: 250px;
    height: 250px;
    path {
      fill: ${({ theme }) => theme.whiteBackground};
    }
  }
`;

// A full load: it also recovers when the page's code is missing after a deploy (resetting the boundary would not).
const reloadPage = () => window.location.reload();

const ErrorFallback: React.FC<FallbackProps> = ({ error }) => {
  // eslint-disable-next-line no-console
  console.log("Error:", { error });

  return (
    <Container role="alert">
      <ErrorContainer>
        <InfoWrapper>
          <HeaderIconContainer>
            <ErrorIcon />
          </HeaderIconContainer>
          <Header>Ooops, something went wrong in Athens!</Header>
          <Subtitle>
            Reload the page to try again. If it keeps happening,{" "}
            <a href="https://t.me/KlerosCurate" target="_blank" rel="noopener noreferrer">
              tell us on Telegram
            </a>
            .
          </Subtitle>
          <ButtonsContainer>
            <Button type="button" onClick={reloadPage}>
              Reload page
            </Button>
            {/* A full navigation, so it also works when the error is outside the page. */}
            <HomeLink href="/home">Go to Home</HomeLink>
          </ButtonsContainer>
        </InfoWrapper>
        <IconContainer>
          <ErrorIcon />
        </IconContainer>
      </ErrorContainer>
    </Container>
  );
};

export default ErrorFallback;
