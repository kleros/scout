import React from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom";

import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import { hoverShortTransitionTiming } from "styles/commonStyles";

import SecuredByKlerosLogo from "svgs/footer/secured-by-kleros.svg";

import { socialmedia } from "consts/socialmedia";

const Container = styled.footer`
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
`;

/** One link per network, styled like the header's icon buttons (32px target). */
const SocialLink = styled.a`
  ${hoverShortTransitionTiming}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 7px;

  svg {
    width: 16px;
    height: 16px;
    fill: ${({ theme }) => theme.white}BF;
  }

  &:hover {
    background-color: ${({ theme }) => theme.whiteLowOpacityStrong};

    svg {
      fill: ${({ theme }) => theme.white};
    }
  }
`;

const SecuredByKleros: React.FC = () => (
  <a href="https://kleros.io" target="_blank" rel="noopener noreferrer" aria-label="Secured by Kleros">
    <StyledSecuredByKlerosLogo aria-hidden="true" focusable="false" />
  </a>
);

const SocialMedia = () => (
  <StyledSocialMedia>
    {Object.values(socialmedia).map(({ name, url, icon: Icon }) => (
      <SocialLink key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} title={name}>
        <Icon />
      </SocialLink>
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

const FooterLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

const StyledAgentLink = styled.a`
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
      <FooterLinks>
        <StyledToSLink to="/terms-of-service">
          Terms of Service
        </StyledToSLink>
        <StyledAgentLink
          href="/llms.txt"
          rel="help"
          title="LLM instructions for Scout agents"
        >
          For agents
        </StyledAgentLink>
      </FooterLinks>
      <SocialMedia />
    </Inner>
  </Container>
);

export default Footer;
