import React from 'react'
import styled from 'styled-components'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import NotificationsIcon from 'svgs/menu-icons/notifications.svg'
import { StyledButton } from 'components/Button'
import {
  offeredChannels,
  useNotifyConfig,
  useNotifyProfile,
} from 'hooks/useNotifications'

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  background: ${({ theme }) => theme.subtleBackground};
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  line-height: 1.5;

  > svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    fill: ${({ theme }) => theme.secondaryBlue};
  }
`

const Text = styled.div`
  flex: 1;
  min-width: 220px;
`

const Muted = styled.div`
  color: ${({ theme }) => theme.secondaryText};
`

/**
 * Shown right after a submission, challenge or appeal contribution: the moment
 * a user most needs to hear about what happens next. Only to whoever sent
 * the transaction; anyone else looking at it has no stake in it.
 */
const NotifyPrompt: React.FC<{ context: string; sender: string }> = ({
  context,
  sender,
}) => {
  const { address } = useAccount()
  const config = useNotifyConfig()
  const profile = useNotifyProfile()
  const navigate = useNavigate()
  const location = useLocation()
  if (!address || address.toLowerCase() !== sender.toLowerCase()) return null
  if (!config.isSuccess || profile.isLoading) return null

  const me = profile.data
  const hasChannel = Boolean(
    (me?.email?.verified && !me.email.unsubscribed) ||
    me?.telegram?.connected ||
    (me?.push?.devices ?? 0) > 0,
  )
  if (me?.signedIn && hasChannel) {
    return (
      <Card>
        <NotificationsIcon aria-hidden />
        <Text>
          <Muted>
            You'll be notified about challenges, evidence, rulings and appeal
            deadlines for {context}.
          </Muted>
        </Text>
      </Card>
    )
  }
  // Promise only what this deployment can send.
  const channels = offeredChannels(config.data.channels)
  return (
    <Card>
      <NotificationsIcon aria-hidden />
      <Text>
        <strong>Don't miss what happens next.</strong>
        <Muted>
          Get alerted {channels ? `by ${channels}` : "in Scout's bell"} if{' '}
          {context} is challenged, when evidence is posted, and before any
          appeal deadline.
        </Muted>
      </Text>
      <StyledButton
        type="button"
        size="small"
        onClick={() =>
          navigate(`${location.pathname}${location.search}#notifications`)
        }
      >
        Set up notifications
      </StyledButton>
    </Card>
  )
}

export default NotifyPrompt
