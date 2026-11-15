import React, { useCallback } from 'react'
import styled from 'styled-components'
import { useAccount } from 'wagmi'
import { useAtlasProvider } from '@kleros/kleros-app'

import Button from 'components/Button'
import { progressToast } from 'utils/wrapWithToast'
import { isNetworkFailure, isUserRejection } from 'utils/parseWagmiError'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
`

const Info = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }) => theme.secondaryText};
`

export const SIGN_IN_EXPLANATION =
  'What you send is stored on IPFS through Kleros. To upload it, sign a message in your wallet to prove the wallet is yours. Signing is free and sends no transaction.'

interface EnsureAuthProps {
  children: React.ReactElement
  message?: string
  buttonText?: string
  className?: string
}

const signInFailureMessage = (error: unknown) => {
  if (isNetworkFailure(error)) return 'Sign-in failed: the Kleros upload service did not answer. Try again in a moment.'
  const detail = (error as { message?: string })?.message?.split('\n')[0]
  return detail ? `Sign-in failed: ${detail}` : 'Sign-in failed. Try again.'
}

const EnsureAuth: React.FC<EnsureAuthProps> = ({
  children,
  message = SIGN_IN_EXPLANATION,
  buttonText,
  className,
}) => {
  const { address } = useAccount()
  const { isVerified, isSigningIn, authoriseUser } = useAtlasProvider()

  const handleClick = useCallback(() => {
    const id = progressToast.start('Sign the message in your wallet...')
    authoriseUser()
      .then(() => progressToast.succeed(id, 'Signed in. You can continue.'))
      .catch((err) => {
        console.error(err)
        // Declining the signature is a choice, not an error.
        if (isUserRejection(err)) progressToast.dismiss(id)
        else progressToast.fail(id, signInFailureMessage(err))
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
        {isSigningIn ? 'Signing in...' : buttonText ?? 'Sign in with wallet'}
      </Button>
    </Container>
  )
}

export default EnsureAuth
