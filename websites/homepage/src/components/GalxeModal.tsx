import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import Modal from 'react-modal'

const StyledModal = styled(Modal)`
  background-color: #2b2b2b;
  color: #fff;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  margin: 10vh auto;
  text-align: center;

  ${landscapeStyle(
    () => css`
      margin: 20vh auto;
    `
  )}
`

const ModalButton = styled.button`
  background-color: #444;
  color: #fff;
  border: none;
  padding: 10px 20px;
  margin: 10px;
  cursor: pointer;
  border-radius: 5px;
  font-size: 16px;

  &:hover {
    background-color: #666;
  }

  &:first-of-type {
    background-color: #00aaff;
    font-weight: bold;

    &:hover {
      background-color: #0088cc;
    }
  }
`

const handleParticipation = async (
  address: string | null,
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setIsLoading(true)
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
  setIsLoading(false)
}

const GalxeModal: React.FC<{
  isModalOpen: boolean
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  address: string | null
}> = ({ isModalOpen, setIsModalOpen, address }) => {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <StyledModal
      isOpen={isModalOpen}
      onRequestClose={() => setIsModalOpen(false)}
      contentLabel="Galxe Campaign Participation"
    >
      <h2>Participate in Galxe Campaign</h2>
      <p>Would you like to participate in the Galxe campaign?</p>
      <ModalButton
        onClick={() =>
          handleParticipation(address, setIsModalOpen, setIsLoading)
        }
      >
        {isLoading ? <div className="loader"></div> : 'Yes'}
      </ModalButton>
      <ModalButton onClick={() => setIsModalOpen(false)}>No</ModalButton>
    </StyledModal>
  )
}

export default GalxeModal
