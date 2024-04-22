import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
// import { socialmedia } from 'consts/socialmedia'
import SecuredByKlerosLogo from 'svgs/footer/secured-by-kleros.svg'
import Links from './Links'

const Container = styled.div`
  background-color: #08020e;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0 0 32px 0;
  gap: 24px;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      gap: ${responsiveSize(140, 280)};
      align-items: flex-start;
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

const SecuredByKleros: React.FC = () => (
  <a
    className="secured-by-kleros"
    href="https://kleros.io"
    target="_blank"
    rel="noreferrer"
  >
    <SecuredByKlerosLogo />
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
