import React, { useRef } from 'react'
import styled, { css } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useClickAway } from 'react-use'
import { formatDistanceToNowStrict } from 'date-fns'

import { landscapeStyle } from 'styles/landscapeStyle'
import { StyledButton } from 'components/Button'
import { sitePath } from 'utils/sitePath'
import { timeLeft } from 'utils/timeLeft'
import {
  useMarkRead,
  useNotificationsInbox,
  useNotifyProfile,
  type InboxNotification,
} from 'hooks/useNotifications'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  max-height: 80vh;
  width: 90vw;
  max-width: 420px;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  border: 0.1px solid ${({ theme }) => theme.stroke};
  background-color: ${({ theme }) => theme.lightBackground};
  border-radius: 12px;
  overflow: hidden;

  ${landscapeStyle(
    () => css`
      margin-top: 64px;
      top: 0;
      right: 0;
      left: auto;
      transform: none;
    `,
  )}
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
`

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const HeaderActions = styled.div`
  display: flex;
  gap: 14px;
`

const TextButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
`

const Entry = styled.li`
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
`

/** A whole entry is one button: it opens the item and marks the alert read. */
const EntryButton = styled.button<{ unread: boolean }>`
  display: grid;
  grid-template-columns: 8px 1fr;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  background: ${({ theme, unread }) =>
    unread ? theme.subtleBackground : 'transparent'};

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.secondaryBlue};
    outline-offset: -2px;
  }
`

const Dot = styled.span<{ unread: boolean; urgent: boolean }>`
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: ${({ theme, unread, urgent }) =>
    !unread ? 'transparent' : urgent ? theme.error : theme.secondaryBlue};
`

const EntryText = styled.span`
  display: block;
  min-width: 0;
`

const EntryTitle = styled.span<{ unread: boolean }>`
  display: block;
  font-size: 14px;
  font-weight: ${({ unread }) => (unread ? 600 : 500)};
  line-height: 1.35;
  color: ${({ theme }) => theme.primaryText};
`

const EntryBody = styled.span`
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.secondaryText};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const EntryDetail = styled.span`
  margin-top: 4px;
  font-size: 13px;
  font-style: italic;
  line-height: 1.45;
  color: ${({ theme }) => theme.secondaryText};
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Meta = styled.span<{ urgent?: boolean }>`
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: ${({ theme, urgent }) => (urgent ? theme.error : theme.tertiaryText)};
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 16px 24px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

/**
 * "Deadline Sep 27, 14:05 UTC (in 26 h)": in UTC, like the alert's own text,
 * with seconds dropped and the time left rounded down, so it never shows more
 * time than there is.
 */
const deadlineText = (deadline: string | null) => {
  if (!deadline) return null
  const date = new Date(deadline)
  const left = timeLeft(date.getTime() / 1000)
  if (!left) return null
  const day = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return `Deadline ${day}, ${date.toISOString().slice(11, 16)} UTC (in ${left})`
}

interface Props {
  toggleIsNotificationsOpen: () => void
  openSettings: () => void
}

const NotificationsPanel: React.FC<Props> = ({
  toggleIsNotificationsOpen,
  openSettings,
}) => {
  const containerRef = useRef(null)
  const navigate = useNavigate()
  useClickAway(containerRef, () => toggleIsNotificationsOpen())
  const profile = useNotifyProfile()
  const signedIn = Boolean(profile.data?.signedIn)
  const account = signedIn ? profile.data?.address : undefined
  const inbox = useNotificationsInbox(account)
  const markRead = useMarkRead(account)
  const notifications = inbox.data?.notifications ?? []

  const open = (notification: InboxNotification) => {
    if (!notification.read) markRead.mutate([notification.id])
    const path = notification.url
      ? sitePath(notification.url, window.location.origin)
      : null
    toggleIsNotificationsOpen()
    if (path) navigate(path)
  }

  return (
    <Container ref={containerRef} role="dialog" aria-label="Notifications">
      <Header>
        <Title>Notifications</Title>
        <HeaderActions>
          {signedIn && (inbox.data?.unread ?? 0) > 0 ? (
            <TextButton
              type="button"
              disabled={markRead.isPending}
              onClick={() => markRead.mutate(undefined)}
            >
              Mark all read
            </TextButton>
          ) : null}
          <TextButton type="button" onClick={openSettings}>
            Settings
          </TextButton>
        </HeaderActions>
      </Header>
      {!signedIn ? (
        <Empty>
          Get alerted when your items are challenged, when someone posts
          evidence, and before appeal deadlines, including when the other side
          funds an appeal against a ruling you won.
          <StyledButton type="button" size="small" onClick={openSettings}>
            Set up notifications
          </StyledButton>
        </Empty>
      ) : notifications.length === 0 ? (
        <Empty>
          {inbox.isLoading
            ? 'Loading…'
            : "Nothing yet. We'll let you know when something happens to your items."}
        </Empty>
      ) : (
        <List>
          {notifications.map((notification) => {
            const urgent = notification.urgency === 'urgent'
            const deadline = deadlineText(notification.deadline)
            return (
              <Entry key={notification.id}>
                <EntryButton
                  type="button"
                  unread={!notification.read}
                  onClick={() => open(notification)}
                >
                  <Dot unread={!notification.read} urgent={urgent} />
                  <EntryText>
                    <EntryTitle unread={!notification.read}>
                      {notification.title}
                    </EntryTitle>
                    <EntryBody>{notification.body}</EntryBody>
                    {notification.detail ? (
                      <EntryDetail>{notification.detail}</EntryDetail>
                    ) : null}
                    <Meta urgent={urgent && Boolean(deadline)}>
                      {deadline ??
                        `${formatDistanceToNowStrict(new Date(notification.createdAt))} ago`}
                    </Meta>
                  </EntryText>
                </EntryButton>
              </Entry>
            )
          })}
        </List>
      )}
    </Container>
  )
}

export default NotificationsPanel
