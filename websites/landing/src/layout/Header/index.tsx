import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { Link } from 'react-router-dom'
import { SCOUT_APP_URL } from 'consts/urls'
import Sections from './Sections'
import { ButtonLink } from 'components/Button'
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
  margin: 0;
`

const Title = styled(Link)`
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;

  ${landscapeStyle(
    () => css`
      margin-left: 64px;
    `
  )}
`

const EnterAppLink = styled(ButtonLink)`
  ${landscapeStyle(
    () => css`
      margin-right: 64px;
    `
  )}
`

const HorizontalLine = styled.div`
  height: 0.5px;
  width: 100%;
  background-color: #7186FF;
`

const Navbar: React.FC = () => (
  <header>
    <Container>
      <Title to="/" aria-label="Kleros Scout home">
        <StyledScoutLogo aria-hidden="true" />
      </Title>
      <EnterAppLink href={SCOUT_APP_URL} target="_blank" rel="noopener noreferrer">
        Enter App
      </EnterAppLink>
      <Sections />
    </Container>
    <HorizontalLine />
    <PromoBanner />
  </header>
)
export default Navbar
