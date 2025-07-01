import React from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import Button from 'components/Button'

const StyledButton = styled(Button)`
  display: flex;
  background: #cd9dff;
  color: #380c65;
  font-family: 'Avenir', sans-serif;
  &:hover,
  active {
    background: linear-gradient(145deg, #a188d6, #7e57c2);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
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
      <StyledButton onClick={() => openModal()}>Submit entry</StyledButton>
    </>
  )
}
export default SubmitButton
