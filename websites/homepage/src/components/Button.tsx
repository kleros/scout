import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'

export const Button = styled.button`
  display: flex;
  color: #000000;
  background: #cd9dff;
  align-items: center;
  font-family: 'Avenir', sans-serif;
  font-size: ${responsiveSize(20, 24)};
  font-weight: 700;
  padding: 17px ${responsiveSize(12, 32)};
  border: none;
  cursor: pointer;
  &:active {
    outline: none;
    border: none;
  }
`

export const ButtonAnchor = styled.a`
  font-family: 'Oxanium', sans-serif;
  text-decoration: none;
  color: #000;

  :hover {
    text-decoration: underline;
  }

  ${landscapeStyle(
    () => css`
      display: flex;
      position: relative;
      padding-right: 64px;
    `
  )}
`
