import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useNavigate } from 'react-router-dom'
import Sections from './Sections'
import { Button, ButtonAnchor } from 'components/Button'
import CurateLogo from 'tsx:svgs/header/curate-logo.svg'

const Container = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  background: #010002;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #fff;
  width: 100%;
  height: 172px;

  ${landscapeStyle(
    () => css`
      height: 60px;
      flex-direction: row;
      justify-content: space-between;
    `
  )}
`

const StyledCurateLogo = styled(CurateLogo)`
  height: 44px;
  width: 44px;
`

const StyledText = styled.text`
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  font-family: 'Avenir', sans-serif;
`

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  position: relative;

  ${landscapeStyle(
    () => css`
      padding-left: 64px;
    `
  )}
`

const Navbar: React.FC = () => {
  const navigate = useNavigate()

  const handlerClickTitle = () => {
    navigate('/')
  }

  return (
    <Container>
      <Title onClick={handlerClickTitle}>
        <StyledCurateLogo />
        <StyledText>Kleros Scout</StyledText>
      </Title>
      <ButtonAnchor
        href="https://app.klerosscout.eth.limo"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button>Enter App</Button>
      </ButtonAnchor>
      <Sections />
    </Container>
  )
}
export default Navbar
