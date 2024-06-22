import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useNavigate } from 'react-router-dom'
import CurateLogo from 'tsx:svgs/header/curate-logo.svg'
import Registries from './Registries'

const Container = styled.div`
  display: flex;
  position: relative;
  width: 100%;
  height: 108px;
  flex-direction: column;
  background: #010002;
  align-items: center;
  justify-content: center;
  margin-bottom: ${responsiveSize(16, 24)};
  gap: 16px;

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
  position: relative;
  align-items: center;
  gap: 16px;
  cursor: pointer;

  ${landscapeStyle(
    () => css`
      padding-left: 64px;
    `
  )}
`

const StyledButton = styled.button`
  display: none;
  font-family: 'Oxanium', sans-serif;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;

  ${landscapeStyle(
    () => css`
      display: flex;
      position: relative;
      padding-right: 64px;
      text-decoration: none;

      :hover {
        text-decoration: underline;
      }
    `
  )}
`

interface INavbar {
  setShowRewardsPage: (show: boolean) => void;
}

const Navbar: React.FC<INavbar> = ({ setShowRewardsPage }) => {
  const navigate = useNavigate()

  const handleClickTitle = () => {
    setShowRewardsPage(false);
    navigate('/');
  }
  
  const handleClickRewards = () => {
    setShowRewardsPage(true);
  }

  return (
    <Container>
      <Title onClick={handleClickTitle}>
        <StyledCurateLogo />
        <StyledText>Kleros Scout</StyledText>
      </Title>
      <Registries setShowRewardsPage={setShowRewardsPage} />
      <StyledButton onClick={handleClickRewards}>
        Earn Rewards by Submitting!
      </StyledButton>
    </Container>
  )
}
export default Navbar
