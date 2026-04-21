import React from 'react'
import styled from 'styled-components'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useItemCountsQuery } from 'hooks/queries'
import { useSubmissionPreference } from 'hooks/useSubmissionPreference'
import Checkbox from 'components/Checkbox'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
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

const PreferenceRow = styled.label`
  ${hoverShortTransitionTiming}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-family: 'Open Sans', sans-serif;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  cursor: pointer;
  user-select: none;
  width: fit-content;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
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
          <PreferenceRow>
            <Checkbox
              checked={preferNewTab}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            Prefer opening submission in a dedicated page
          </PreferenceRow>
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
          {!isPageMode && (
            <ClosedButtonContainer>
              <CloseButton />
            </ClosedButtonContainer>
          )}
        </HeaderActions>
      </AddHeader>
      <Divider />
    </>
  )
}

export default ModalHeader
