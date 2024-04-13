import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'

export const Button = styled.button`
  display: flex;
  color: #000000;
  background: #cd9dff;
  height: 38px;
  align-items: center;
  font-family: 'Avenir', sans-serif;
  font-size: 18px;
  font-weight: bold;
  padding: 8px ${responsiveSize(8, 20)};
  border: none;
  cursor: pointer;
  &:active {
    outline: none;
    border: none;
  }
`
