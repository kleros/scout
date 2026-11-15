import React from 'react'
import styled from 'styled-components'
import { StyledButton } from 'components/Button'

const Container = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: ${({ $compact }) => ($compact ? '16px 8px' : '48px 16px')};
  text-align: center;
`

const Title = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: ${({ theme }) => theme.primaryText};
`

const RetryButton = styled(StyledButton)`
  &[aria-disabled='true'] {
    opacity: 0.6;
    cursor: progress;
  }
`

const Message = styled.p`
  margin: 0;
  max-width: 480px;
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }) => theme.secondaryText};
`

interface ErrorStateProps {
  /** What failed, e.g. "The list did not load." */
  title?: string
  /** Optional detail or what to do next. */
  message?: React.ReactNode
  /** Shows a "Try again" button that calls this. */
  onRetry?: () => void
  /** Disables the button and says "Trying again..." while a retry is running. */
  retrying?: boolean
  /** Less padding, for sections inside a page. */
  compact?: boolean
  className?: string
}

/**
 * The standard "this did not load" state: says what failed, and offers Try again.
 * Use it wherever a read fails, instead of showing an empty list, a zero or "not found".
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'This did not load.',
  message = 'The data service did not answer. Check your connection and try again.',
  onRetry,
  retrying = false,
  compact,
  className,
}) => (
  <Container role="alert" $compact={compact} className={className}>
    <Title>{title}</Title>
    {message ? <Message>{message}</Message> : null}
    {onRetry ? (
      // aria-disabled rather than disabled: a disabled button loses keyboard focus, which would
      // drop a keyboard user to the top of the page while the retry runs.
      <RetryButton
        type="button"
        variant="secondary"
        size="small"
        aria-disabled={retrying || undefined}
        onClick={() => {
          if (!retrying) onRetry()
        }}
      >
        {retrying ? 'Trying again...' : 'Try again'}
      </RetryButton>
    ) : null}
  </Container>
)

export default ErrorState
