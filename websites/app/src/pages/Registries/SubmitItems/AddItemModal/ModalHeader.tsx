import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useItemCountsQuery } from 'hooks/queries'
import { ClosedButtonContainer } from 'pages/Registries'
import PolicyUpdatedBadge from 'pages/Registries/PolicyUpdatedBadge'
import {
  AddHeader,
  HeaderActions,
  AddSubtitle,
  AddTitle,
  CloseButton,
  StyledGoogleFormAnchor,
  SubmissionButton,
  Divider,
} from './index'

interface Props {
  title: string
  googleFormUrl?: string
}

const ModalHeader: React.FC<Props> = ({ title, googleFormUrl }) => {
  const [searchParams] = useSearchParams()
  const { data: countsData } = useItemCountsQuery()

  const registryLabel = searchParams.get('additem')
  const registry =
    registryLabel && countsData ? countsData[registryLabel] : undefined

  return (
    <>
      <AddHeader>
        <div>
          <AddTitle>{title}</AddTitle>
          {googleFormUrl && (
            <AddSubtitle>
              Want to suggest an item without any deposit?{' '}
              <StyledGoogleFormAnchor target="_blank" href={googleFormUrl}>
                Click here
              </StyledGoogleFormAnchor>
            </AddSubtitle>
          )}
        </div>
        <HeaderActions>
          {registry && (
            <SubmissionButton
              href={`https://cdn.kleros.link${registry.metadata.policyURI}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Submission Guidelines
              <PolicyUpdatedBadge registryName={registryLabel} />
            </SubmissionButton>
          )}
          <ClosedButtonContainer>
            <CloseButton />
          </ClosedButtonContainer>
        </HeaderActions>
      </AddHeader>
      <Divider />
    </>
  )
}

export default ModalHeader
