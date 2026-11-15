import React, { useId, useState } from 'react'
import styled from 'styled-components'
import { formatEther, parseEther } from 'viem'
import humanizeDuration from 'humanize-duration'
import { EnsureChain } from 'components/EnsureChain'
import EnsureAuth from 'components/EnsureAuth'
import ErrorState from 'components/ErrorState'
import PolicyAcknowledgement from 'components/PolicyAcknowledgement'
import type { DepositParams } from 'utils/fetchRegistryDeposits'
import type { DepositsStatus } from 'hooks/useCurateSubmit'
import { formatValue } from 'utils/formatValue'
import useNativeBalance from 'hooks/useNativeBalance'
import { SubmitButton } from './index'

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

const DepositSummary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
`

const DepositTotal = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: ${({ theme }) => theme.primaryText};
`

const DepositDetail = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }) => theme.secondaryText};
`

const DepositError = styled(ErrorState)`
  align-items: flex-start;
  padding: 8px 0;
  text-align: left;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
`

const SUBMIT_WARNING =
  'Deposits for compliant entries are 100% refunded. Every time. If a submission is not compliant the deposit will be lost in favor of the challenger. Please ensure you read and understand the rules contained in the Policy below before submitting.'

const xdai = (value: bigint) => `${formatEther(value)} xDAI`

/**
 * The network fee is paid on top of the deposit. On Gnosis it is a fraction of a cent, so 0.01 xDAI
 * is ample: a balance between the deposit and the deposit plus this margin is warned about (the
 * wallet would refuse the transaction after the uploads), without blocking the button.
 */
const FEE_MARGIN = parseEther('0.01')

const formatPeriod = (seconds: number) =>
  humanizeDuration(seconds * 1000, {
    largest: 2,
    round: true,
    units: ['d', 'h', 'm'],
    delimiter: ' and ',
  })

interface Props {
  deposits?: DepositParams
  depositsStatus: DepositsStatus
  onRetryDeposits: () => void
  retryingDeposits: boolean
  disabled: boolean
  isSubmitting: boolean
  onSubmit: () => void
  registryName?: string
  submitLabel: string
}

const SubmitFooter: React.FC<Props> = ({
  deposits,
  depositsStatus,
  onRetryDeposits,
  retryingDeposits,
  disabled,
  isSubmitting,
  onSubmit,
  registryName,
  submitLabel,
}) => {
  const [acknowledged, setAcknowledged] = useState(false)
  const depositId = useId()
  const { balance: nativeBalance } = useNativeBalance()
  const requiredValue = deposits
    ? deposits.arbitrationCost + deposits.submissionBaseDeposit
    : undefined
  const insufficientBalance =
    nativeBalance !== undefined &&
    requiredValue !== undefined &&
    nativeBalance < requiredValue
  const feeMayNotBeCovered =
    nativeBalance !== undefined &&
    requiredValue !== undefined &&
    nativeBalance >= requiredValue &&
    nativeBalance < requiredValue + FEE_MARGIN
  const challengePeriod = Number(deposits?.challengePeriodDuration ?? 0)

  return (
    <Wrapper>
      <PolicyAcknowledgement
        registryName={registryName}
        warningText={SUBMIT_WARNING}
        checked={acknowledged}
        onCheckedChange={setAcknowledged}
      />
      {deposits && requiredValue !== undefined ? (
        <DepositSummary>
          <DepositTotal id={depositId}>Deposit: {xdai(requiredValue)}</DepositTotal>
          <DepositDetail>
            {xdai(deposits.submissionBaseDeposit)} base deposit +{' '}
            {xdai(deposits.arbitrationCost)} arbitration cost.
          </DepositDetail>
          <DepositDetail>
            You get it back when the entry is accepted:{' '}
            {challengePeriod > 0
              ? `after a challenge period of ${formatPeriod(challengePeriod)} with no challenge`
              : 'after the challenge period if nobody challenges it'}
            , or by winning a dispute. If you lose a dispute, it goes to the
            challenger.
          </DepositDetail>
        </DepositSummary>
      ) : depositsStatus === 'loading' ? (
        <DepositSummary aria-busy="true">
          <DepositTotal>Deposit: loading...</DepositTotal>
        </DepositSummary>
      ) : (
        <DepositError
          compact
          title="The deposit amount did not load."
          message="You can submit once it loads. Check your connection and try again."
          onRetry={onRetryDeposits}
          retrying={retryingDeposits}
        />
      )}
      <Actions>
        <EnsureChain>
          <EnsureAuth>
            <SubmitButton
              type="button"
              disabled={
                disabled || !acknowledged || insufficientBalance || !deposits
              }
              onClick={onSubmit}
              aria-describedby={deposits ? depositId : undefined}
            >
              {isSubmitting ? 'Submitting...' : submitLabel}
            </SubmitButton>
          </EnsureAuth>
        </EnsureChain>
        {insufficientBalance && (
          <InsufficientBalanceText role="alert">
            Insufficient balance. You have {formatValue(nativeBalance!)} xDAI
            but need {formatValue(requiredValue!)} xDAI.
          </InsufficientBalanceText>
        )}
        {feeMayNotBeCovered && (
          <InsufficientBalanceText role="alert">
            Your {formatValue(nativeBalance!)} xDAI covers the deposit but may not
            cover the network fee. Add a little xDAI (0.01 is plenty) before
            submitting.
          </InsufficientBalanceText>
        )}
      </Actions>
    </Wrapper>
  )
}

export default SubmitFooter
