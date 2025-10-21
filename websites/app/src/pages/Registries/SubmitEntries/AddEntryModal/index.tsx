import React, { useMemo, useRef } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useSearchParams } from 'react-router-dom'
import AddAddressTag from './AddSingleTags'
import AddTagsQueries from './AddTagsQueries'
import AddToken from './AddToken'
import AddCDN from './AddCDN'
import { StyledCloseButton } from '~src/pages/Registries'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`

const ModalContainer = styled.div`
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(153, 153, 153, 0.08) 100%
  );
  backdrop-filter: blur(50px);
  border-radius: 20px;
  width: 84vw;
  max-height: 85vh;
  position: relative;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: 20px;
    background: linear-gradient(180deg, #7186FF90 0%, #BEBEC590 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
  }

  ${landscapeStyle(
    () => css`
      width: 60%;
    `
  )}
`

const ModalContent = styled.div`
  overflow-y: auto;
  padding: ${responsiveSize(16, 32)};
`

export const AddContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

export const AddHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 24px;
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
  background: linear-gradient(90deg, transparent 0%, rgba(113, 134, 255, 0.5) 50%, transparent 100%);
  position: relative;
  z-index: 1;
`

export const StyledGoogleFormAnchor = styled.a`
  color: #fff;
  text-decoration: none;

  :hover {
    text-decoration: underline;
  }
`

export const StyledWholeField = styled.div`
  display: flex;
  flex-direction: column;
`

export const SubmissionButton = styled.button`
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  font-family: "Open Sans", sans-serif;
  align-self: center;
  padding: 8px 16px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;

  :hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(113, 134, 255, 0.5);
    transform: translateY(-1px);
  }
`

export const StyledTextInput = styled.input`
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 400;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(113, 134, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(113, 134, 255, 0.1);
  }

  ::placeholder {
    font-size: 16px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.6);
  }

  ${landscapeStyle(
    () => css`
      width: 95%;
      padding-left: 20px;
    `
  )}
`

export const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 20px;
  gap: 16px;
`

export const SubmitButton = styled.button`
  background: ${({ theme }) => theme.buttonWhite};
  width: 100%;
  color: ${({ theme }) => theme.black};
  padding: 14px 28px;
  font-family: "Open Sans", sans-serif;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }

  &:disabled {
    background: ${({ theme }) => theme.buttonDisabled};
    color: ${({ theme }) => theme.buttonDisabledText};
    border: 1px solid ${({ theme }) => theme.buttonDisabled};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  ${landscapeStyle(
    () => css`
      padding: 14px 32px;
    `
  )}
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
  color: red;
  margin-top: -10px;
  font-size: 14px;
`

export const CloseButton = () => {
  const [, setSearchParams] = useSearchParams()

  const closeModal = () => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.delete('additem')
      return newParams
    })
  }

  return <StyledCloseButton onClick={() => closeModal()} />
}

const AddEntryModal: React.FC = () => {
  const containerRef = useRef(null)
  const [searchParams] = useSearchParams()
  const addingItemToRegistry = useMemo(
    () => searchParams.get('additem'),
    [searchParams]
  )

  return (
    <ModalOverlay>
      <ModalContainer ref={containerRef}>
        <ModalContent>
          {addingItemToRegistry === 'Single_Tags' ? (
            <AddAddressTag />
          ) : addingItemToRegistry === 'Tags_Queries' ? (
            <AddTagsQueries />
          ) : addingItemToRegistry === 'CDN' ? (
            <AddCDN />
          ) : addingItemToRegistry === 'Tokens' ? (
            <AddToken />
          ) : null}
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  )
}

export default AddEntryModal
