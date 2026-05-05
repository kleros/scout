import React, { useState } from 'react'
import styled from 'styled-components'
import { formatEther } from 'viem'
import { EnsureChain } from 'components/EnsureChain'
import PolicyAcknowledgement from 'components/PolicyAcknowledgement'
import type { DepositParams } from 'utils/fetchRegistryDeposits'
import {
  SubmitButton,
  ExpectedPayouts,
  PayoutsContainer,
} from './index'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
`

const SUBMIT_WARNING =
  'Deposits for compliant entries are 100% refunded. Every time. If a submission is not compliant the deposit will be lost in favor of the challenger. Please ensure you read and understand the rules contained in the Policy below before submitting.'

interface Props {
  deposits?: DepositParams
  disabled: boolean
  isSubmitting: boolean
  onSubmit: () => void
  registryName?: string
  submitLabel: string
}

const SubmitFooter: React.FC<Props> = ({
  deposits,
  disabled,
  isSubmitting,
  onSubmit,
  registryName,
  submitLabel,
}) => {
  const [acknowledged, setAcknowledged] = useState(false)

  return (
    <Wrapper>
      <PolicyAcknowledgement
        registryName={registryName}
        warningText={SUBMIT_WARNING}
        checked={acknowledged}
        onCheckedChange={setAcknowledged}
      />
      <PayoutsContainer>
        <EnsureChain>
          <SubmitButton
            disabled={disabled || !acknowledged}
            onClick={onSubmit}
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </SubmitButton>
        </EnsureChain>
        <ExpectedPayouts>
          Deposit:{' '}
          {deposits
            ? formatEther(
                deposits.arbitrationCost + deposits.submissionBaseDeposit,
              ) + ' xDAI'
            : null}
        </ExpectedPayouts>
      </PayoutsContainer>
    </Wrapper>
  )
}

export default SubmitFooter
