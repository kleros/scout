import React from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import Button from 'components/Button'
import { hoverShortTransitionTiming } from 'styles/commonStyles';

const StyledButton = styled(Button)`
  ${hoverShortTransitionTiming}
  display: flex;
  background: linear-gradient(270deg, #1C3CF1 0%, #8B5CF6 100%);
  color: #fff;
  font-size: 14px;
  font-family: 'Avenir', sans-serif;

  &:hover,
  active {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    filter: brightness(0.9);
    transform: scale(1.01);
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
