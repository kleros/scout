import React from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import Button from 'components/Button'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

interface IPagination {
  totalPages: number | null
}

const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  gap: 12px;
  align-items: center;
`

const StyledButton = styled(Button)`
  ${hoverShortTransitionTiming}
  display: flex;
  background: linear-gradient(270deg, #1C3CF1 0%, #8B5CF6 100%);
  color: #fff;
  font-size: 14px;
  font-family: 'Avenir', sans-serif;
  &:hover,
  &:active {
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    filter: brightness(0.9);
    transform: scale(1.01);
  }
  &:disabled {
    opacity: 0.2;
    cursor: not-allowed;
    box-shadow: none;
    filter: none;
    transform: none;
  }
`

const CurrentPage = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  border-radius: 8px;
  text-align: center;
`

const Pagination: React.FC<IPagination> = ({ totalPages }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const current = Number(searchParams.get('page')) > 0 ? Number(searchParams.get('page')) : 1

  const setCurrentPage = (page: number) => {
    const newPage = Math.max(1, page)
    setSearchParams(prev => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.set('page', String(newPage))
      return newParams
    })
  }

  const disablePrev = current <= 1
  const disableNext = totalPages !== null ? current >= totalPages : false

  return (
    <Container>
      <StyledButton onClick={() => setCurrentPage(current - 1)} disabled={disablePrev}>
        Previous
      </StyledButton>
      <CurrentPage>Page {current}</CurrentPage>
      <StyledButton onClick={() => setCurrentPage(current + 1)} disabled={disableNext}>
        Next
      </StyledButton>
    </Container>
  )
}

export default Pagination
