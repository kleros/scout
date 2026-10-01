import React from 'react'
import styled from 'styled-components'
import { useAccount } from 'wagmi'
import NotificationsIcon from 'svgs/menu-icons/notifications.svg'
import {
  useFollow,
  useNotifyConfig,
  useNotifyProfile,
  useNotifySignIn,
} from 'hooks/useNotifications'
import { errorToast, successToast } from 'utils/wrapWithToast'

const Button = styled.button<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid
    ${({ theme, active }) => (active ? theme.secondaryBlue : theme.stroke)};
  background: ${({ theme, active }) =>
    active ? theme.subtleBackground : 'transparent'};
  color: ${({ theme, active }) =>
    active ? theme.secondaryBlue : theme.primaryText};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.secondaryBlue};
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

/**
 * Follow an item to get notified about its challenges, evidence, rulings and
 * appeals. Parties of an item are notified without following it.
 */
const FollowButton: React.FC<{ itemId: string }> = ({ itemId }) => {
  const { address } = useAccount()
  const config = useNotifyConfig()
  const profile = useNotifyProfile()
  const signIn = useNotifySignIn()
  const signedIn = Boolean(profile.data?.signedIn)
  const { following, toggle } = useFollow(
    itemId,
    signedIn ? profile.data?.address : undefined,
  )

  if (!config.isSuccess || !address) return null

  const busy = signIn.isPending || toggle.isPending
  const onClick = async () => {
    try {
      if (!signedIn) await signIn.mutateAsync()
      await toggle.mutateAsync()
      successToast(
        following
          ? 'Unfollowed.'
          : 'Following. Set up email, Telegram or browser alerts in Settings → Notifications.',
      )
    } catch (error) {
      errorToast(
        error instanceof Error ? error.message : 'Could not update follow.',
      )
    }
  }

  return (
    <Button
      type="button"
      active={following}
      disabled={busy}
      onClick={onClick}
      title="Get notified about challenges, evidence, rulings and appeals on this item"
      aria-pressed={following}
    >
      <NotificationsIcon aria-hidden />
      {busy ? 'Saving…' : following ? 'Following' : 'Follow'}
    </Button>
  )
}

export default FollowButton
