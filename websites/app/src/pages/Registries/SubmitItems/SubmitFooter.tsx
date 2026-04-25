import React from 'react'
import { formatEther } from 'viem'
import { EnsureChain } from 'components/EnsureChain'
import type { DepositParams } from 'utils/fetchRegistryDeposits'
import {
  SubmitButton,
  ExpectedPayouts,
  PayoutsContainer,
} from './index'

interface Props {
  deposits?: DepositParams
  disabled: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

const SubmitFooter: React.FC<Props> = ({
  deposits,
  disabled,
  isSubmitting,
  onSubmit,
}) => (
  <PayoutsContainer>
    <EnsureChain>
      <SubmitButton disabled={disabled} onClick={onSubmit}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
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
)

export default SubmitFooter
