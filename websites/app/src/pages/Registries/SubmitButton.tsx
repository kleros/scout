import React from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import Button from 'components/Button'
import { hoverShortTransitionTiming } from 'styles/commonStyles';

const StyledButton = styled(Button)`
  ${hoverShortTransitionTiming}
  display: flex;
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  font-size: 14px;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 9999px;

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }
`

interface SubmitButtonProps {
  registryName?: string;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ registryName }) => {
  const [, setSearchParams] = useSearchParams()

  const openModal = () => {
    if (!registryName) return;
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.append('additem', registryName)
      return newParams
    })
  }

  if (!registryName) return null;

  return (
    <>
      <StyledButton onClick={() => openModal()}>Submit item</StyledButton>
    </>
  )
}
export default SubmitButton
