import React from 'react'
import styled from 'styled-components'
import Checkbox from 'components/Checkbox'
import PolicyButton from 'pages/Registries/PolicyButton'
import InfoCircleIcon from 'svgs/icons/info-circle.svg'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
`

const Important = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

const ImportantIcon = styled.div`
  flex-shrink: 0;
  display: inline-flex;
  color: ${({ theme }) => theme.warning};
  margin-top: 2px;

  svg {
    width: 20px;
    height: 20px;
    path {
      fill: currentColor;
    }
  }
`

const ImportantBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.primaryText};
`

const ImportantTitle = styled.span`
  font-weight: 600;
`

const PolicyRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`

const ConfirmLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
  user-select: none;
`

interface Props {
  registryName?: string
  warningText: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const PolicyAcknowledgement: React.FC<Props> = ({
  registryName,
  warningText,
  checked,
  onCheckedChange,
}) => (
  <Wrapper>
    <Important>
      <ImportantIcon>
        <InfoCircleIcon />
      </ImportantIcon>
      <ImportantBody>
        <ImportantTitle>Important!</ImportantTitle>
        <span>{warningText}</span>
      </ImportantBody>
    </Important>
    <PolicyRow>
      <PolicyButton registryName={registryName} />
      <ConfirmLabel>
        <Checkbox
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        I confirm that I have read the Policy.
      </ConfirmLabel>
    </PolicyRow>
  </Wrapper>
)

export default PolicyAcknowledgement
