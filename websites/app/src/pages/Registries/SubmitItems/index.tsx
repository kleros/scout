import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { baseButtonStyles, primaryButtonStyles } from 'components/Button'

// Shared styled primitives used by the four submission forms (AddToken,
// AddSingleTags, AddTagsQueries, AddCDN) rendered inside SubmitPage.

export const AddContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const AddHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const AddTitle = styled.div`
  margin: 0 0 4px 0;
  font-size: 24px;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
`

export const AddSubtitle = styled.div`
  font-size: 14px;
  opacity: 80%;
  line-height: 1.4;
  position: relative;
  z-index: 1;
`

export const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: ${({ theme }) => theme.stroke};
  position: relative;
  z-index: 1;
`

export const StyledGoogleFormAnchor = styled.a`
  color: ${({ theme }) => theme.white};
  text-decoration: none;

  :hover {
    text-decoration: underline;
  }
`

export const StyledWholeField = styled.div`
  display: flex;
  flex-direction: column;
`

export const FieldLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
  margin-top: 8px;
  margin-bottom: 0;
`

export const SubmissionButton = styled.a`
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.borderSubtle};
  color: ${({ theme }) => theme.textHighOpacity};
  font-family: "Open Sans", sans-serif;
  align-self: center;
  padding: 8px 16px;
  font-size: 14px;
  background: ${({ theme }) => theme.subtleBackground};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
  text-decoration: none;

  :hover {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.stroke};
    transform: translateY(-1px);
  }
`

export const StyledTextInput = styled.input`
  display: flex;
  background: ${({ theme }) => theme.modalInputBackground};
  padding: 12px 16px;
  outline: none;
  border: 1px solid ${({ theme }) => theme.stroke};
  color: ${({ theme }) => theme.primaryText};
  border-radius: 8px;
  font-size: 16px;
  font-weight: 400;
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &:focus {
    background: ${({ theme }) => theme.backgroundFour};
  }

  ::placeholder {
    font-size: 16px;
    font-weight: 400;
    color: ${({ theme }) => theme.secondaryText};
  }

  ${landscapeStyle(
    () => css`
      width: 95%;
      padding-left: 20px;
    `
  )}
`

export const SubmitButton = styled.button`
  ${baseButtonStyles}
  ${primaryButtonStyles}
  width: auto;
  font-size: 14px;
  padding: 10px 20px;

  & > * {
    position: relative;
    z-index: 1;
  }
`

export const PayoutsContainer = styled.div`
  display: flex;
  gap: 24px;
  margin: 1rem 0;
`

export const ExpectedPayouts = styled.p`
  font-family: "Open Sans", sans-serif;
  font-size: 14px;
  font-weight: 500;
  align-self: center;
  margin: 0;
  opacity: 0.9;
  position: relative;
  z-index: 1;
`

export const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.error};
  margin-top: -10px;
  font-size: 14px;
`
