import React from 'react'
import styled from 'styled-components'
import { usePayoutAcceptance } from 'hooks/usePayoutAcceptance'
import { shortenAddress } from 'utils/shortenAddress'

const Box = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.error};
  border-radius: 12px;
  background: ${({ theme }) => theme.subtleBackground};
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.error};
  }
`

interface Props {
  /** Wallet that will receive the refunds and rewards (usually the connected one). */
  address?: string
  /** Registry that pays out; any Scout registry gives the same answer. */
  registry?: string
  /** What the xDAI at stake is, e.g. "The deposit refund and appeal rewards". */
  stake?: string
}

/**
 * Strong, non-blocking warning shown wherever xDAI goes into a registry from
 * a wallet that could not receive it back. Some contract wallets can, so this
 * tests the wallet itself instead of refusing contract wallets outright.
 */
const PayoutWarning: React.FC<Props> = ({
  address,
  registry,
  stake = 'Refunds and rewards',
}) => {
  const payout = usePayoutAcceptance(address, registry)
  if (!address || payout.data !== 'rejects') return null
  return (
    <Box role="alert">
      <strong>
        {stake} sent to {shortenAddress(address)} would be lost
      </strong>
      <span>
        Light Curate pays out with a transfer that gives the receiving wallet
        only 2,300 gas. We simulated that transfer to this wallet and it failed,
        as it does for many smart contract wallets such as a Safe. The xDAI
        would stay in the registry contract for good. Use a regular wallet
        instead.
      </span>
    </Box>
  )
}

export default PayoutWarning
