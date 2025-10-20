import React from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import Button from 'components/Button'
import { hoverShortTransitionTiming } from 'styles/commonStyles';

const StyledButton = styled(Button)`
  ${hoverShortTransitionTiming}
  display: flex;
  background: #FFFFFF;
  color: #000000;
  font-size: 14px;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 9999px;

  &:hover {
    background: #F0F0F0;
  }

  &:active {
    background: #E0E0E0;
  }
`

const SubmitButton: React.FC = () => {
  const [, setSearchParams] = useSearchParams()

  const openModal = () => {
    setSearchParams((prev) => {
      const registry = prev.get('registry') as string
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.append('additem', registry)
      return newParams
    })
  }

  return (
    <>
      <StyledButton onClick={() => openModal()}>Submit item</StyledButton>
    </>
  )
}
export default SubmitButton
