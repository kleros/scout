import React, { useCallback } from 'react'
import styled from 'styled-components'
import { useAccount } from 'wagmi'
import { useAtlasProvider } from '@kleros/kleros-app'

import Button from 'components/Button'
import { errorToast, infoToast, successToast } from 'utils/wrapWithToast'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
`

const Info = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`

interface EnsureAuthProps {
  children: React.ReactElement
  message?: string
  buttonText?: string
  className?: string
}

const EnsureAuth: React.FC<EnsureAuthProps> = ({
  children,
  message,
  buttonText,
  className,
}) => {
  const { address } = useAccount()
  const { isVerified, isSigningIn, authoriseUser } = useAtlasProvider()

  const handleClick = useCallback(() => {
    infoToast('Signing in...')
    authoriseUser()
      .then(() => successToast('Signed in successfully'))
      .catch((err) => {
        console.error(err)
        errorToast(`Sign-in failed: ${err?.message ?? 'unknown error'}`)
      })
  }, [authoriseUser])

  if (isVerified) return children

  return (
    <Container className={className}>
      {message ? <Info>{message}</Info> : null}
      <Button
        type="button"
        onClick={handleClick}
        disabled={isSigningIn || !address}
      >
        {isSigningIn ? 'Signing in...' : buttonText ?? 'Sign in to upload'}
      </Button>
    </Container>
  )
}

export default EnsureAuth
