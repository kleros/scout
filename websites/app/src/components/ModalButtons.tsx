import styled from 'styled-components'

export const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  font-family: "Open Sans", sans-serif;

  ${({ variant = 'secondary', theme }) =>
    variant === 'primary'
      ? `
      background: ${theme.buttonWhite};
      color: ${theme.black};
      border-color: ${theme.buttonWhite};

      &:hover {
        background: ${theme.buttonWhiteHover};
        color: ${theme.black};
      }

      &:active {
        background: ${theme.buttonWhiteActive};
      }

      &:disabled {
        background: ${theme.buttonDisabled};
        color: ${theme.buttonDisabledText};
        border-color: ${theme.buttonDisabled};
        cursor: not-allowed;
      }
    `
      : `
      background: transparent;
      color: ${theme.primaryText};
      border-color: ${theme.buttonSecondaryBorder};

      &:hover {
        background: ${theme.hoverBackground};
        border-color: ${theme.primaryText};
      }

      &:active {
        background: ${theme.activeBackground};
      }

      &:disabled {
        background: transparent;
        color: ${theme.buttonDisabledText};
        border-color: ${theme.buttonDisabled};
        cursor: not-allowed;
      }
    `}
`
