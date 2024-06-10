import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import Modal from 'react-modal'

const StyledModal = styled(Modal)`
  background-color: #1d1d1d;
  color: #fff;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  margin: 10vh auto;
  text-align: center;
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.5);

  ${landscapeStyle(
    () => css`
      margin: 20vh auto;
    `
  )}
`

const ModalButton = styled.button`
  background-color: #444 !important;
  color: #fff;
  border: none;
  padding: 10px 20px;
  margin: 10px auto;
  margin-top: 32px;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;
  display: block;

  &:hover {
    background-color: #666;
  }

  &:first-of-type {
    background-color: #0088cc;
    font-weight: bold;

    &:hover {
      background-color: #005fa3;
    }
  }
`

const AnchorText = styled.a`
  color: #00aaff;
  font-size: 22px;
  display: block;
  margin: 20px 0;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const handleParticipation = async (
  address: string | null,
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setIsModalOpen(false)
  try {
    const response = await fetch(
      'https://galxe-service-6c648393ea39.herokuapp.com/upsertAddress',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractAddress: address }),
      }
    )
    console.log(response)
  } catch (error) {
    console.error('Error participating in Galxe campaign:', error)
  }
}

export const handleAnchorClick = async (
  e: React.MouseEvent<HTMLAnchorElement>,
  address: string | null,
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  e.preventDefault()
  window.open(e.currentTarget.href, '_blank', 'noreferrer noopener')
  await handleParticipation(address, setIsModalOpen)
}

const GalxeModal: React.FC<{
  isModalOpen: boolean
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  address: string | null
}> = ({ isModalOpen, setIsModalOpen, address }) => {
  return (
    <StyledModal
      isOpen={isModalOpen}
      onRequestClose={() => setIsModalOpen(false)}
      contentLabel="Galxe Campaign Participation"
    >
      <h2>🎉 Congrats on Installing the Snap</h2>
      <AnchorText
        href="https://app.galxe.com/quest/kleros/GCYsVtdurQ"
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => handleAnchorClick(e, address, setIsModalOpen)}
      >
        ➜ Claim your Galxe OAT here!
      </AnchorText>
      <ModalButton onClick={() => setIsModalOpen(false)}>Close</ModalButton>
    </StyledModal>
  )
}

export default GalxeModal
