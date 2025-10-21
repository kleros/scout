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
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  font-size: 14px;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  border-radius: 9999px;
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
