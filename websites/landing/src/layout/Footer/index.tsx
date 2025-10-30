import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import SecuredByKlerosLogo from 'svgs/footer/secured-by-kleros.svg'
import Links from './Links'

const FullWidthWrapper = styled.div`
  background-color: #08020e;
  width: 100%;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  gap: 32px;
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  box-sizing: border-box;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      padding: 48px 48px;
      gap: 48px;
    `
  )}
`

const LogoSection = styled.div`
  flex-shrink: 0;

  a {
    display: block;
    min-height: 24px;
  }
`

const LinksSection = styled.div`
  width: 100%;
  max-width: 100%;

  ${landscapeStyle(
    () => css`
      width: auto;
      max-width: 70%;
    `
  )}
`

const StyledSecuredByKlerosLogo = styled(SecuredByKlerosLogo)`
  flex-shrink: 0;
`

const SecuredByKleros: React.FC = () => (
  <a
    href="https://kleros.io"
    target="_blank"
    rel="noreferrer"
  >
    <StyledSecuredByKlerosLogo />
  </a>
)

const Footer: React.FC = () => (
  <FullWidthWrapper>
    <Container>
      <LogoSection>
        <SecuredByKleros />
      </LogoSection>
      <LinksSection>
        <Links />
      </LinksSection>
    </Container>
  </FullWidthWrapper>
)

export default Footer
