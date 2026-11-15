import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { baseButtonStyles, primaryButtonStyles } from 'components/Button'
import Tooltip from 'components/Tooltip'
import InfoIcon from 'svgs/icons/info.svg'

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

export const AddTitle = styled.h1`
  margin: 0 0 4px 0;
  font-size: 24px;
  font-family: "Manrope", sans-serif;
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
  color: ${({ theme }) => theme.primaryBlue};
  text-decoration: underline;
  text-underline-offset: 3px;

  :hover {
    color: ${({ theme }) => theme.primaryText};
  }
`

export const StyledWholeField = styled.div`
  display: flex;
  flex-direction: column;
`

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 8px;
`

const LabelText = styled.label`
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }) => theme.primaryText};
`

/** The help icon after a label: a 24px target that shows the field's rules on hover, focus and tap. */
const HelpTrigger = styled(Tooltip)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: ${({ theme }) => theme.secondaryText};

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: currentColor;
      fill-opacity: 1;
    }
  }

  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`

const HelpIcon = styled.span`
  display: inline-flex;
`

interface FieldLabelProps {
  children: string
  /** Id of the input this label names. Omit when the control is named another way. */
  htmlFor?: string
  id?: string
  /** The field's rules, shown from an info icon next to the label. */
  help?: string
}

/**
 * A field's visible label, tied to its input, with an optional info icon that shows the field's
 * rules. The icon sits outside the <label> so that tapping it shows the help instead of moving
 * focus into the input.
 */
export const FieldLabel: React.FC<FieldLabelProps> = ({
  children,
  htmlFor,
  id,
  help,
}) => (
  <LabelRow>
    <LabelText htmlFor={htmlFor} id={id}>
      {children}
    </LabelText>
    {help ? (
      <HelpTrigger data-tooltip={help}>
        <HelpIcon aria-hidden="true">
          <InfoIcon />
        </HelpIcon>
        <span className="visually-hidden">About {children}</span>
      </HelpTrigger>
    ) : null}
  </LabelRow>
)

export const SubmissionButton = styled.a`
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.borderSubtle};
  color: ${({ theme }) => theme.textHighOpacity};
  font-family: "Manrope", sans-serif;
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

// No local `outline: none`: the app-wide :focus-visible ring shows which field has focus.
const textFieldStyles = css`
  display: flex;
  background: ${({ theme }) => theme.modalInputBackground};
  padding: 12px 16px;
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

export const StyledTextInput = styled.input`
  ${textFieldStyles}
`

/** For long single-line values: wraps the text so all of it stays readable while it is written. */
export const StyledTextArea = styled.textarea`
  ${textFieldStyles}
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4;
  resize: vertical;
  min-height: 72px;
`

/**
 * Line breaks are not part of these values (an <input> never had them): typing Enter does
 * nothing and pasted line breaks become spaces.
 */
export const singleLineTextAreaProps = (setValue: (value: string) => void) => ({
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setValue(e.target.value.replace(/\r?\n|\r/g, ' ')),
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') e.preventDefault()
  },
})

/** Attributes that tie an input to its error message, for assistive technology. */
export const describeIssue = (errorId: string, hasIssue: boolean) =>
  hasIssue
    ? { 'aria-invalid': true as const, 'aria-describedby': errorId }
    : {}

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

export const ErrorMessage = styled.div.attrs({ role: 'alert' })`
  color: ${({ theme }) => theme.error};
  margin-top: -10px;
  font-size: 14px;
`
