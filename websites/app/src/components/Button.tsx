import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'

const Button = styled.button`
  display: flex;
  background: #FFFFFF;
  color: #000000;
  font-family: "Open Sans", sans-serif;
  font-size: 16px;
  font-weight: 600;
  padding: 10px ${responsiveSize(16, 24)};
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #F0F0F0;
  }

  &:active {
    background: #E0E0E0;
  }

  &:disabled {
    background: #666666;
    color: #999999;
    cursor: not-allowed;
  }
`

export default Button
