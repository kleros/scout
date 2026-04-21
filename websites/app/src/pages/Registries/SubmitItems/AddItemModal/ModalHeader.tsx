import React from 'react'
import styled from 'styled-components'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useItemCountsQuery } from 'hooks/queries'
import { useIsMobile } from 'hooks/useIsMobile'
import { useSubmissionPreference } from 'hooks/useSubmissionPreference'
import Checkbox from 'components/Checkbox'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import { ClosedButtonContainer } from 'pages/Registries'
import PolicyUpdatedBadge from 'pages/Registries/PolicyUpdatedBadge'
import {
  AddHeader,
  AddSubtitle,
  AddTitle,
  CloseButton,
  StyledGoogleFormAnchor,
  SubmissionButton,
  Divider,
} from './index'

const PreferenceRow = styled.label`
  ${hoverShortTransitionTiming}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Open Sans', sans-serif;
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  cursor: pointer;
  user-select: none;
  width: fit-content;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 24px;
`

const CloseSlot = styled.div`
  margin-left: auto;
`

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

const ModalHeader: React.FC<Props> = ({ title, googleFormUrl }) => {
  const [searchParams] = useSearchParams()
  const { registryName: pathRegistry } = useParams<{ registryName: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: countsData } = useItemCountsQuery()
  const { preferNewTab, setPreferNewTab } = useSubmissionPreference()

  const isPageMode = location.pathname.endsWith('/submit')
  const registryLabel = searchParams.get('additem') ?? (isPageMode ? pathRegistry : null)
  const registry =
    registryLabel && countsData ? countsData[registryLabel] : undefined

  const handleToggle = (checked: boolean) => {
    setPreferNewTab(checked)
    if (!registryLabel) return
    // Same-tab redirect so the user lands on the mode they just selected.
    // Form state is preserved via localStorage on each form component.
    if (checked && !isPageMode) {
      navigate(`/${registryLabel}/submit`)
    } else if (!checked && isPageMode) {
      navigate(`/${registryLabel}?additem=${registryLabel}`)
    }
  }

  return (
    <>
      <AddHeader>
        <TopRow>
          {!isMobile && (
            <PreferenceRow>
              <Checkbox
                checked={preferNewTab}
                onChange={(e) => handleToggle(e.target.checked)}
              />
              Prefer opening submission in a dedicated page
            </PreferenceRow>
          )}
          {!isPageMode && (
            <CloseSlot>
              <ClosedButtonContainer>
                <CloseButton />
              </ClosedButtonContainer>
            </CloseSlot>
          )}
        </TopRow>
        <MainRow>
          <TitleBlock>
            <AddTitle>{title}</AddTitle>
            {googleFormUrl && (
              <AddSubtitle>
                Want to suggest an item without any deposit?{' '}
                <StyledGoogleFormAnchor target="_blank" href={googleFormUrl}>
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
                href={`https://cdn.kleros.link${registry.metadata.policyURI}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Submission Policy
                <PolicyUpdatedBadge registryName={registryLabel} />
              </SubmissionButton>
            )}
          </PolicyBlock>
        </MainRow>
      </AddHeader>
      <Divider />
    </>
  )
}

export default ModalHeader
