import React, { useMemo, useRef } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useSearchParams } from 'react-router-dom'
import AddAddressTag from './AddSingleTags'
import AddTagsQueries from './AddTagsQueries'
import AddToken from './AddToken'
import AddCDN from './AddCDN'
import { StyledCloseButton } from 'pages/Registries'
import { baseButtonStyles, primaryButtonStyles } from 'components/Button'

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
  background: ${({ theme }) => theme.modalBackground};
  backdrop-filter: blur(50px);
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.stroke};
  width: 90vw;
  max-width: 900px;
  max-height: 85vh;
  position: relative;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      width: 70%;
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
  gap: 12px;
`

export const AddHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
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

export const FieldLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
  margin-top: 8px;
  margin-bottom: 0;
`

export const SubmissionButton = styled.button`
  border-radius: 9999px;
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
  backdrop-filter: blur(10px);
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

export const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 20px;
  gap: 16px;
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

const AddItemModal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const addingItemToRegistry = useMemo(
    () => searchParams.get('additem'),
    [searchParams]
  )

  const closeModal = () => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.delete('additem')
      return newParams
    })
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if click is on a react-select menu (which is portaled to body)
    const target = e.target as HTMLElement
    if (target.closest('.select__menu') || target.closest('.select__menu-portal')) {
      return
    }

    if (containerRef.current && !containerRef.current.contains(target)) {
      closeModal()
    }
  }

  return (
    <ModalOverlay onClick={handleOverlayClick}>
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

export default AddItemModal
