import styled, { css } from 'styled-components'
import { Link } from 'react-router-dom'
import { responsiveSize } from 'styles/responsiveSize'

const buttonStyles = css`
  display: flex;
  color: #000000;
  background: #FFFFFF;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 19px;
  padding: 12px ${responsiveSize(16, 24)};
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #D4D4D4;
  }

  &:active {
    outline: none;
    border: none;
    background: #B8B8B8;
  }
`

export const Button = styled.button`
  ${buttonStyles}

  &:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.25);
    cursor: not-allowed;
  }
`

/** A link that looks like Button: one element, so one tab stop and one name for screen readers. */
export const ButtonLink = styled.a`
  ${buttonStyles}
  text-decoration: none;
`

/** The same, for a page of this site (client-side navigation). */
export const ButtonRouterLink = styled(Link)`
  ${buttonStyles}
  text-decoration: none;
`
