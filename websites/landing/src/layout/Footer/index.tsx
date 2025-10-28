import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import SecuredByKlerosLogo from 'svgs/footer/secured-by-kleros.svg'
import Links from './Links'

const Container = styled.div`
  background-color: #08020e;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 32px 16px;
  gap: 32px;
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      align-items: flex-start;
      padding: 48px 48px;
      gap: 48px;
    `
  )}

  .secured-by-kleros {
    min-height: 24px;
  }

  .socialmedia {
    display: flex;
    gap: 16px;
    justify-content: center;

    a {
      display: inline-block;
      svg {
        height: 16px;
        width: 16px;
        max-heigth: 16px;
        max-width: 16px;
        fill: white;
      }
    }
  }
`

const StyledSecuredByKlerosLogo = styled(SecuredByKlerosLogo)`
  flex-shrink: 0;
`

const SecuredByKleros: React.FC = () => (
  <a
    className="secured-by-kleros"
    href="https://kleros.io"
    target="_blank"
    rel="noreferrer"
  >
    <StyledSecuredByKlerosLogo />
  </a>
)

// const SocialMedia = () => (
//   <div className="socialmedia">
//     {Object.values(socialmedia).map((site, i) => (
//       <a key={i} href={site.url} target="_blank" rel="noreferrer">
//         {site.icon}
//       </a>
//     ))}
//   </div>
// )

const Footer: React.FC = () => (
  <Container>
    <SecuredByKleros />
    <Links />
    {/* <SocialMedia /> */}
  </Container>
)

export default Footer
