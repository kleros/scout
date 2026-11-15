import React from 'react'
import styled from 'styled-components'

const Message = styled.span`
  display: block;
`

const ExplorerLink = styled.a`
  display: inline-block;
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: inherit;
  }
`

interface TransactionToastProps {
  message: string
  explorerUrl?: string
}

/** Toast body for a transaction: what is happening, and a link to it on the block explorer. */
export const TransactionToast: React.FC<TransactionToastProps> = ({ message, explorerUrl }) => (
  <div>
    <Message>{message}</Message>
    {explorerUrl ? (
      <ExplorerLink
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        // Keep the toast open when the link is used.
        onClick={(event) => event.stopPropagation()}
      >
        View on explorer
      </ExplorerLink>
    ) : null}
  </div>
)

export default TransactionToast
