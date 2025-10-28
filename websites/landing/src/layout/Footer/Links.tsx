import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { links } from 'consts/links'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 16px;
  font-family: 'Oxanium', sans-serif;
  flex: 1;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      flex-wrap: wrap;
      column-gap: 48px;
      row-gap: 16px;
      justify-content: flex-end;
    `
  )}
`

const StyledAnchor = styled.a`
  color: #d5d5d5;
  text-decoration: none;
  text-align: left;
  transition: color 0.2s ease;

  &:hover {
    text-decoration: underline;
    color: #ffffff;
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
