import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { links } from 'consts/links'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  min-height: 140px;
  gap: 16px;
  font-family: 'Oxanium', sans-serif;

  ${landscapeStyle(
    () => css`
      gap: 8px;
      column-gap: 8rem;
      height: calc(200px - 7vw);
    `
  )}
`

const StyledAnchor = styled.a`
  color: #d5d5d5;
  text-decoration: none;
  text-align: left;

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
