import React from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom";

import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import { hoverShortTransitionTiming } from "styles/commonStyles";

import SecuredByKlerosLogo from "svgs/footer/secured-by-kleros.svg";

import { socialmedia } from "consts/socialmedia";

import LightButton from "components/LightButton";
import { ExternalLink } from "components/ExternalLink";

const Container = styled.div`
  display: flex;
  width: 100%;
  background-color: ${({ theme }) => (theme.name === "dark" ? theme.lightGrey : theme.primaryPurple)};
  justify-content: center;
  margin-top: auto;
  z-index: 1;
`;

const Inner = styled.div`
  display: flex;
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  min-height: 114px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 16px;

  ${landscapeStyle(
    () => css`
      min-height: 64px;
      flex-direction: row;
      justify-content: space-between;
      padding: 0 ${responsiveSize(0, 48)};
    `
  )}
`;

const StyledSecuredByKlerosLogo = styled(SecuredByKlerosLogo)`
  ${hoverShortTransitionTiming}
  min-height: 24px;

  path {
    fill: ${({ theme }) => theme.white}BF;
  }

  :hover path {
    fill: ${({ theme }) => theme.white};
  }
`;

const StyledSocialMedia = styled.div`
  display: flex;

  .button-svg {
    margin-right: 0;
  }
`;

const SecuredByKleros: React.FC = () => (
  <ExternalLink to="https://kleros.io" target="_blank" rel="noreferrer">
    <StyledSecuredByKlerosLogo />
  </ExternalLink>
);

const SocialMedia = () => (
  <StyledSocialMedia>
    {Object.values(socialmedia).map((site, i) => (
      <ExternalLink key={site.url} to={site.url} target="_blank" rel="noreferrer">
        <LightButton Icon={site.icon} text="" />
      </ExternalLink>
    ))}
  </StyledSocialMedia>
);

const StyledToSLink = styled(Link)`
  ${hoverShortTransitionTiming}
  color: ${({ theme }) => theme.white}BF;
  text-decoration: none;
  font-size: 14px;
  font-family: "Manrope", sans-serif;

  &:hover {
    color: ${({ theme }) => theme.white};
    text-decoration: underline;
  }
`;

const Footer: React.FC = () => (
  <Container>
    <Inner>
      <SecuredByKleros />
      <StyledToSLink to="/terms-of-service">
        Terms of Service
      </StyledToSLink>
      <SocialMedia />
    </Inner>
  </Container>
);

export default Footer;
