import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useNavigate } from 'react-router-dom'
import Sections from './Sections'
import { Button, ButtonAnchor } from 'components/Button'
import PromoBanner from 'components/PromoBanner'
import ScoutLogo from 'svgs/header/kleros-scout.svg'

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

const StyledScoutLogo = styled(ScoutLogo)`
  height: 44px;
  width: auto;
`

const StyledText = styled.h3`
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  font-family: 'Avenir', sans-serif;
  margin: 0;
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

const StyledButton = styled(Button)`
  /* Inherits font-size: 16px and font-weight: 600 from base Button */
`

const HorizontalLine = styled.div`
  height: 0.5px;
  width: 100%;
  background-color: #7186FF;
`

const Navbar: React.FC = () => {
  const navigate = useNavigate()

  const handlerClickTitle = () => {
    navigate('/')
  }

  return (
    <>
      <Container>
        <Title onClick={handlerClickTitle}>
          <StyledScoutLogo />
        </Title>
        <ButtonAnchor
          href="https://scout-app.kleros.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          <StyledButton>Enter App</StyledButton>
        </ButtonAnchor>
        <Sections />
      </Container>
      <HorizontalLine />
      <PromoBanner />
    </>
  )
}
export default Navbar
