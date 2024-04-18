import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { links } from 'consts/links'

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  font-family: 'Oxanium', sans-serif;
  justify-content: center;
  align-items: center;

  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(2, 1fr);
    `
  )}
`

const StyledAnchor = styled.a`
  color: #d5d5d5;
  text-decoration: none;
  text-align: center;

  &:hover {
    text-decoration: underline;
  }
`

const Links = () => (
  <Container>
    {Object.values(links).map((site, i) => (
      <StyledAnchor key={i} href={site.link} target="_blank" rel="noreferrer">
        {site.name}
      </StyledAnchor>
    ))}
  </Container>
)

export default Links
