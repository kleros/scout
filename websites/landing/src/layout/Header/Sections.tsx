import React from 'react'
import styled, { css } from 'styled-components'
import { NavLink } from 'react-router-dom'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'

const Container = styled.nav`
  display: flex;
  flex-direction: row;
  gap: ${responsiveSize(32, 120)};
  position: relative;
  margin-top: 8px;
  align-items: center;

  ${landscapeStyle(
    () => css`
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 0;
    `
  )}
`

// NavLink marks the current page with aria-current="page"; the purple text and underline follow it.
const StyledNavLink = styled(NavLink)`
  color: inherit;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  text-decoration: none;
  position: relative;
  transition: color 0.2s ease, opacity 0.2s ease;

  &:hover {
    color: rgba(113, 134, 255, 0.8);
    opacity: 0.9;
  }

  &[aria-current='page'] {
    color: #7186FF;
    font-weight: 600;
    opacity: 1;
  }

  &[aria-current='page']::after {
    display: flex;
    content: '';
    position: absolute;
    left: -15%;
    bottom: -13px;
    height: 4px;
    background-color: #7186FF;
    border-radius: 4px 4px 0px 0px;
    width: 132%;
  }

  ${landscapeStyle(
    () => css`
      &[aria-current='page']::after {
        bottom: -18px;
      }
    `
  )}
`

const ITEMS = [
  { name: 'Home', path: '/' },
  { name: 'For Users', path: '/for-users' },
  { name: 'For Builders', path: '/for-builders' },
]

const Sections: React.FC = () => (
  <Container aria-label="Main">
    {ITEMS.map(({ name, path }) => (
      <StyledNavLink key={path} to={path} end={path === '/'}>
        {name}
      </StyledNavLink>
    ))}
  </Container>
)

export default Sections
