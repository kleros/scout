import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'

// Base button styles - shared across all button variants
export const baseButtonStyles = css`
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
`

// Primary button styles (white background)
export const primaryButtonStyles = css`
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  border: none;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active:not(:disabled) {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }

  &:disabled {
    background: ${({ theme }) => theme.buttonDisabled};
    color: ${({ theme }) => theme.buttonDisabledText};
    border: 1px solid ${({ theme }) => theme.buttonDisabled};
    cursor: not-allowed;
  }
`

// Secondary button styles (transparent with semi-opaque white border)
export const secondaryButtonStyles = css`
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  &:disabled {
    background: transparent;
    color: ${({ theme }) => theme.buttonDisabledText};
    border-color: ${({ theme }) => theme.buttonDisabled};
    cursor: not-allowed;
  }
`

// Default primary button component
const Button = styled.button`
  ${baseButtonStyles}
  ${primaryButtonStyles}
  font-size: 16px;
  padding: 10px ${responsiveSize(16, 24)};
`

// Variant button component with size and variant options
export const StyledButton = styled.button<{
  variant?: 'primary' | 'secondary'
  size?: 'small' | 'medium' | 'large'
}>`
  ${baseButtonStyles}
  ${({ variant = 'primary' }) => variant === 'primary' ? primaryButtonStyles : secondaryButtonStyles}

  ${({ size = 'medium' }) => {
    switch (size) {
      case 'small':
        return css`
          font-size: 14px;
          padding: 8px 16px;
        `
      case 'large':
        return css`
          font-size: 16px;
          padding: 12px 24px;
        `
      default: // medium
        return css`
          font-size: 14px;
          padding: 10px 20px;
        `
    }
  }}
`

export default Button
