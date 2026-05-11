import React, { useState } from 'react'
import styled from 'styled-components'
import { formatEther } from 'viem'
import { EnsureChain } from 'components/EnsureChain'
import EnsureAuth from 'components/EnsureAuth'
import PolicyAcknowledgement from 'components/PolicyAcknowledgement'
import type { DepositParams } from 'utils/fetchRegistryDeposits'
import useNativeBalance from 'hooks/useNativeBalance'
import {
  SubmitButton,
  ExpectedPayouts,
  PayoutsContainer,
} from './index'

const InsufficientBalanceText = styled.div`
  color: ${({ theme }) => theme.error};
  font-size: 13px;
  font-weight: 500;
  width: 100%;
`

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
  const { balance: nativeBalance } = useNativeBalance()
  const requiredValue = deposits
    ? deposits.arbitrationCost + deposits.submissionBaseDeposit
    : undefined
  const insufficientBalance =
    nativeBalance !== undefined &&
    requiredValue !== undefined &&
    nativeBalance < requiredValue

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
          <EnsureAuth>
            <SubmitButton
              disabled={disabled || !acknowledged || insufficientBalance}
              onClick={onSubmit}
            >
              {isSubmitting ? 'Submitting...' : submitLabel}
            </SubmitButton>
          </EnsureAuth>
        </EnsureChain>
        <ExpectedPayouts>
          Deposit:{' '}
          {requiredValue !== undefined
            ? formatEther(requiredValue) + ' xDAI'
            : null}
        </ExpectedPayouts>
      </PayoutsContainer>
      {insufficientBalance && (
        <InsufficientBalanceText>
          Insufficient balance. You have {Number(formatEther(nativeBalance!)).toLocaleString('en-US', { maximumFractionDigits: 4 })} xDAI but need {Number(formatEther(requiredValue!)).toLocaleString('en-US', { maximumFractionDigits: 4 })} xDAI.
        </InsufficientBalanceText>
      )}
    </Wrapper>
  )
}

export default SubmitFooter
