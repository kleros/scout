import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'

export const Button = styled.button`
  display: flex;
  color: #000000;
  background: #FFFFFF;
  align-items: center;
  justify-content: center;
  font-family: 'Open Sans', sans-serif;
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

  &:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.25);
    cursor: not-allowed;
  }
`

export const ButtonAnchor = styled.a`
  font-family: 'Oxanium', sans-serif;
  text-decoration: none;
  color: #000;

  ${landscapeStyle(
    () => css`
      display: flex;
      position: relative;
      padding-right: 64px;
    `
  )}
`
