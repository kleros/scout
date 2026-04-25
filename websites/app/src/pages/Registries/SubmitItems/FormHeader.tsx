import React from 'react'
import styled from 'styled-components'
import { useParams } from 'react-router-dom'
import { useItemCountsQuery } from 'hooks/queries'
import { KLEROS_CDN_BASE } from 'consts/index'
import PolicyUpdatedBadge from 'pages/Registries/PolicyUpdatedBadge'
import {
  AddHeader,
  AddSubtitle,
  AddTitle,
  StyledGoogleFormAnchor,
  SubmissionButton,
  Divider,
} from './index'

const MainRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
  justify-content: space-between;
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const PolicyBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: 360px;

  & > a {
    align-self: flex-end;
  }
`

const PolicyWarning = styled.div`
  font-family: 'Open Sans', sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: ${({ theme }) => theme.warning};
  text-align: right;
`

interface Props {
  title: string
  googleFormUrl?: string
}

const FormHeader: React.FC<Props> = ({ title, googleFormUrl }) => {
  const { registryName } = useParams<{ registryName: string }>()
  const { data: countsData } = useItemCountsQuery()
  const registry = registryName && countsData ? countsData[registryName] : undefined

  return (
    <>
      <AddHeader>
        <MainRow>
          <TitleBlock>
            <AddTitle>{title}</AddTitle>
            {googleFormUrl && (
              <AddSubtitle>
                Want to suggest an item without any deposit?{' '}
                <StyledGoogleFormAnchor
                  href={googleFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Click here
                </StyledGoogleFormAnchor>
              </AddSubtitle>
            )}
          </TitleBlock>
          <PolicyBlock>
            <PolicyWarning>
              Non-compliant submissions forfeit the deposit.
            </PolicyWarning>
            {registry && (
              <SubmissionButton
                href={`/${registryName}?attachment=${encodeURIComponent(
                  `${KLEROS_CDN_BASE}${registry.metadata.policyURI}`,
                )}&isPolicy=true`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Submission Policy
                <PolicyUpdatedBadge registryName={registryName} />
              </SubmissionButton>
            )}
          </PolicyBlock>
        </MainRow>
      </AddHeader>
      <Divider />
    </>
  )
}

export default FormHeader
