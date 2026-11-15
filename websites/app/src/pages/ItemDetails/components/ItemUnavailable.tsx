import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { StyledButton, baseButtonStyles, primaryButtonStyles } from 'components/Button'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 64px 0;
  text-align: center;

  h1 {
    margin: 0;
  }

  p {
    margin: 0;
    max-width: 560px;
    font-size: 16px;
    line-height: 1.5;
    color: ${({ theme }) => theme.secondaryText};
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
`

const BackLink = styled(Link)`
  ${baseButtonStyles}
  ${primaryButtonStyles}
  padding: 10px 24px;
  font-size: 16px;
  text-decoration: none;
`

const RetryButton = styled(StyledButton)`
  padding: 10px 24px;
  font-size: 16px;
`

interface ItemUnavailableProps {
  /** invalid: the link has no item ID; not-found: the indexer has no such item; error: it did not answer. */
  kind: 'invalid' | 'not-found' | 'error'
  /** Display name of the registry, e.g. "Tokens". */
  registryName: string
  /** Where "Back to ..." leads. */
  backUrl: string
  backLabel: string
  onRetry?: () => void
  retrying?: boolean
}

/**
 * What the item page shows instead of a spinner that never ends: the link is wrong, the item does
 * not exist (or is not indexed yet), or the data service did not answer. Each says what to do next.
 */
const ItemUnavailable: React.FC<ItemUnavailableProps> = ({
  kind,
  registryName,
  backUrl,
  backLabel,
  onRetry,
  retrying = false,
}) => (
  <Container role={kind === 'error' ? 'alert' : undefined}>
    <h1>{kind === 'error' ? 'The item did not load' : 'Item not found'}</h1>
    {kind === 'invalid' && (
      <p>This link does not contain a valid item ID. Check that it was copied in full.</p>
    )}
    {kind === 'not-found' && (
      <p>
        No item with this ID exists in {registryName}. If it was submitted a moment ago, it may not be indexed yet:
        this page keeps checking and shows it as soon as it is.
      </p>
    )}
    {kind === 'error' && <p>The data service did not answer. Check your connection and try again.</p>}
    <Actions>
      {onRetry && kind === 'error' && (
        <RetryButton type="button" variant="secondary" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Trying again...' : 'Try again'}
        </RetryButton>
      )}
      <BackLink to={backUrl}>{backLabel}</BackLink>
    </Actions>
  </Container>
)

export default ItemUnavailable
