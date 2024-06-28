import React, { useMemo, useRef } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useSearchParams } from 'react-router-dom'
import AddAddressTag from './AddTag'
import AddToken from './AddToken'
import AddCDN from './AddCDN'
import { StyledCloseButton } from 'pages/Home'

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
  background: #000;
  border-radius: 12px;
  width: 84vw;
  max-height: 85%;
  overflow-y: auto;
  position: relative;
  border: 1px solid #CD9DFF;
  box-shadow: 0px 4px 8px 29px rgba(0, 0, 0, 0.25);

  ${landscapeStyle(
    () => css`
      width: 60%;
    `
  )}
`

export const AddContainer = styled.div`
  display: flex;
  padding: ${responsiveSize(16, 32)};
  flex-direction: column;
  gap: 18px;
`

export const AddHeader = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 24px;
`

export const AddTitle = styled.div`
  margin: 0;
  margin-bottom: 4px;
  font-size: 32px;
  font-family: Avenir, sans-serif;
`

export const AddSubtitle = styled.div`
  font-size: 16px;
  opacity: 70%;
`

export const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: #CD9DFF; 
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

export const SubmissionButton = styled.a`
  border-radius: 4px;
  border: 1px solid #262626;
  color: #CD9DFF;
  font-family: "Avenir", sans-serif;
  text-decoration: none;
  align-self: center;
  padding: 0.75rem 1rem;
  font-size: 16px;

  :hover {
    text-decoration: underline;
  }

`

export const StyledTextInput = styled.input`
  display: flex;
  padding: 8px 12px;
  outline: none;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 20px;
  font-weight: 400;
  background: rgba(255, 255, 255, 0.15);

  ::placeholder {
    font-weight: 400;
    color: #cd9dff;
  }

  ${landscapeStyle(
    () => css`
      width: 95%;
      padding-left: 24px;
    `
  )}
`

export const Buttons = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 20px;
  gap: 16px;
`

export const SubmitButton = styled.button`
  background-color: #3182ce;
  align-self: start;
  color: white;
  padding: 12px 24px;
  font-family: 'Oxanium', sans-serif;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #6f42c1;
  }

  &:disabled {
    background-color: #a092b1;
    cursor: not-allowed;
  }

  ${landscapeStyle(
    () => css`
      padding: 12px 48px;
    `
  )}
`

export const PayoutsContainer = styled.p`
  display: flex;
  gap: 24px;
`

export const ExpectedPayouts = styled.p`
  font-family: "Avenir", sans-serif;
  font-size: 16px;
  font-style: normal;
  font-weight: 800;
  align-self: center;
  margin: 0;
`

export const ErrorMessage = styled.div`
  color: red;
  margin-top: -10px;
  font-size: 14px;
`

export const CloseButton = () => {
  const [searchParams, setSearchParams] = useSearchParams()

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
  const [searchParams, setSearchParams] = useSearchParams()
  const addingItemToRegistry = useMemo(
    () => searchParams.get('additem'),
    [searchParams]
  )

  return (
    <ModalOverlay >
      <ModalContainer ref={containerRef} >
        {addingItemToRegistry === 'Tags' ? (
          <AddAddressTag />
        ) : addingItemToRegistry === 'CDN' ? (
          <AddCDN />
        ) : addingItemToRegistry === 'Tokens' ? (
          <AddToken />
        ) : null}
      </ModalContainer>
    </ModalOverlay>
  )
}

export default AddEntryModal
