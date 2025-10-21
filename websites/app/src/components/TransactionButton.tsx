import React from 'react'
import styled from 'styled-components'

const StyledTransactionButton = styled.button<{
  $variant?: 'primary' | 'secondary'
  $size?: 'small' | 'medium' | 'large'
}>`
  background: ${({ theme, $variant }) =>
    $variant === 'secondary' ? 'transparent' : theme.buttonWhite};
  color: ${({ theme, $variant }) =>
    $variant === 'secondary' ? theme.primaryText : theme.black};
  border: ${({ theme, $variant }) =>
    $variant === 'secondary' ? `1px solid ${theme.stroke}` : 'none'};
  padding: ${({ $size }) => {
    switch ($size) {
      case 'small': return '8px 16px'
      case 'large': return '16px 32px'
      default: return '12px 24px'
    }
  }};
  font-family: "Open Sans", sans-serif;
  font-size: ${({ $size }) => {
    switch ($size) {
      case 'small': return '14px'
      case 'large': return '16px'
      default: return '15px'
    }
  }};
  font-weight: 600;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: ${({ theme, $variant }) =>
      $variant === 'secondary' ? 'rgba(255, 255, 255, 0.05)' : theme.buttonWhiteHover};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    background: ${({ theme, $variant }) =>
      $variant === 'secondary' ? 'rgba(255, 255, 255, 0.08)' : theme.buttonWhiteActive};
    transform: translateY(0);
  }

  &:disabled {
    background: ${({ theme }) => theme.buttonDisabled};
    color: ${({ theme }) => theme.buttonDisabledText};
    border: 1px solid ${({ theme }) => theme.buttonDisabled};
    cursor: not-allowed;
    transform: none;
    opacity: 0.6;
  }
`

const LoadingSpinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

interface TransactionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  variant?: 'primary' | 'secondary'
  size?: 'small' | 'medium' | 'large'
  children: React.ReactNode
}

/**
 * TransactionButton - A standardized button component for all blockchain transactions
 *
 * Features:
 * - Automatic disabled state when loading
 * - Loading spinner and customizable loading text
 * - Consistent styling across the application
 * - Two variants: primary (white) and secondary (outlined)
 * - Three sizes: small, medium, large
 *
 * @example
 * ```tsx
 * <TransactionButton
 *   isLoading={isSubmitting}
 *   loadingText="Submitting..."
 *   onClick={handleSubmit}
 *   disabled={!isValid}
 * >
 *   Submit Transaction
 * </TransactionButton>
 * ```
 */
export const TransactionButton: React.FC<TransactionButtonProps> = ({
  isLoading = false,
  loadingText = 'Processing...',
  variant = 'primary',
  size = 'medium',
  disabled,
  children,
  ...props
}) => {
  return (
    <StyledTransactionButton
      $variant={variant}
      $size={size}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner />}
      {isLoading ? loadingText : children}
    </StyledTransactionButton>
  )
}

export default TransactionButton
