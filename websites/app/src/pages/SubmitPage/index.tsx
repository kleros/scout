import React from 'react'
import styled, { css } from 'styled-components'
import { Link, useParams } from 'react-router-dom'
import { MAX_WIDTH_LANDSCAPE, landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import AddAddressTag from 'pages/Registries/SubmitItems/AddItemModal/AddSingleTags'
import AddTagsQueries from 'pages/Registries/SubmitItems/AddItemModal/AddTagsQueries'
import AddToken from 'pages/Registries/SubmitItems/AddItemModal/AddToken'
import AddCDN from 'pages/Registries/SubmitItems/AddItemModal/AddCDN'
import ScrollTop from 'components/ScrollTop'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: 'Open Sans', sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `,
  )}
`

const TopBar = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
`

const ReturnButton = styled(Link)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: ${({ theme }) => theme.secondaryBlue};
      ${hoverShortTransitionTiming}
    }
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryBlue};
  }
`

const Card = styled.div`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  padding: ${responsiveSize(16, 32)};
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
`

const NotFound = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  padding: 40px 0;
`

const SubmitPage: React.FC = () => {
  const { registryName } = useParams<{ registryName: string }>()

  const form =
    registryName === 'single-tags' ? (
      <AddAddressTag />
    ) : registryName === 'tags-queries' ? (
      <AddTagsQueries />
    ) : registryName === 'cdn' ? (
      <AddCDN />
    ) : registryName === 'tokens' ? (
      <AddToken />
    ) : (
      <NotFound>Unknown registry</NotFound>
    )

  const returnTo = registryName ? `/${registryName}` : '/home'

  return (
    <Container>
      <ScrollTop />
      <TopBar>
        <ReturnButton to={returnTo}>
          <ArrowLeftIcon />
          Return
        </ReturnButton>
      </TopBar>
      <Card>{form}</Card>
    </Container>
  )
}

export default SubmitPage
