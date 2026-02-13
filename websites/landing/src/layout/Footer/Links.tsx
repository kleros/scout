import React from 'react'
import styled, { css } from 'styled-components'
import { Link } from 'react-router-dom'
import { landscapeStyle } from 'styles/landscapeStyle'
import { links } from 'consts/links'

const Container = styled.nav`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  font-family: 'Oxanium', sans-serif;
  width: 100%;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: flex-end;
      gap: 16px 48px;
    `
  )}
`

const linkStyles = css`
  color: #d5d5d5;
  text-decoration: none;
  transition: color 0.2s ease;
  font-size: 16px;
  line-height: 1.5;

  &:hover {
    text-decoration: underline;
    color: #ffffff;
  }
`

const StyledAnchor = styled.a`
  ${linkStyles}
`

const StyledLink = styled(Link)`
  ${linkStyles}
`

const Links = () => (
  <Container>
    <StyledLink to="/terms-of-service">Terms of Service</StyledLink>
    {Object.values(links).map((site, i) => (
      <StyledAnchor key={i} href={site.link} target="_blank" rel="noreferrer">
        {site.name}
      </StyledAnchor>
    ))}
  </Container>
)

export default Links
