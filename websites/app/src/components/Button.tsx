import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'

const Button = styled.button`
  display: flex;
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
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
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }

  &:disabled {
    background: #666666;
    color: #999999;
    cursor: not-allowed;
  }
`

export default Button
