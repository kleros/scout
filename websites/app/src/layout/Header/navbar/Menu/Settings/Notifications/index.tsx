import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useAccount } from 'wagmi'
import { StyledButton } from 'components/Button'
import Checkbox from 'components/Checkbox'
import PayoutWarning from 'components/PayoutWarning'
import { usePayoutAcceptance } from 'hooks/usePayoutAcceptance'
import { shortenAddress } from 'utils/shortenAddress'
import { errorToast, successToast } from 'utils/wrapWithToast'
import {
  currentPushEndpoint,
  isPushSupported,
  useNotifyActions,
  useNotifyConfig,
  useNotifyProfile,
  useNotifySignIn,
  useTelegramLink,
  type ChannelLevel,
  type NotifyCategory,
  type NotifyChannel,
} from 'hooks/useNotifications'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: min(88vw, 420px);
  padding: 20px 24px 24px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
`

const Intro = styled.p`
  margin: 0;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.secondaryText};
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const Channel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 10px;
`

const ChannelName = styled.span`
  font-weight: 600;
`

const Muted = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  line-height: 1.45;
`

const Command = styled.code`
  color: ${({ theme }) => theme.primaryText};
  user-select: all;
  word-break: break-all;
`

const Status = styled.span<{ $tone?: 'success' | 'warning' }>`
  font-size: 13px;
  color: ${({ theme, $tone }) =>
    $tone === 'success'
      ? theme.success
      : $tone === 'warning'
        ? theme.warning
        : theme.secondaryText};
`

const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: ${({ theme }) => theme.modalInputBackground};
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.secondaryBlue};
  }
`

const Select = styled.select`
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: ${({ theme }) => theme.modalInputBackground};
  color: ${({ theme }) => theme.primaryText};
  font-size: 13px;
`

const LinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
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

const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  line-height: 1.4;

  input {
    margin-top: 1px;
    flex-shrink: 0;
  }
`

const Notice = styled.div<{ $tone: 'success' | 'warning' }>`
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.45;
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'success' ? theme.success : theme.warning};
  color: ${({ theme, $tone }) =>
    $tone === 'success' ? theme.success : theme.warning};
`

const LEVELS: { value: ChannelLevel; label: string }[] = [
  { value: 'urgent', label: 'Urgent only' },
  { value: 'important', label: 'Important and urgent' },
  { value: 'all', label: 'Everything' },
  { value: 'off', label: 'Off' },
]

const CATEGORIES: { key: NotifyCategory; label: string }[] = [
  {
    key: 'periods',
    label: 'Court period changes (jurors committing or voting)',
  },
  { key: 'funding', label: 'Appeal crowdfunding progress' },
  {
    key: 'receipts',
    label: 'Receipts: submission live, accepted, challenge filed',
  },
  { key: 'rewards', label: 'Appeal rewards paid to you' },
  { key: 'follows', label: 'Activity on items you follow' },
]

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

const LevelSelect: React.FC<{
  channel: NotifyChannel
  value: ChannelLevel
  onChange: (level: ChannelLevel) => void
}> = ({ channel, value, onChange }) => (
  <Select
    aria-label={`What to send by ${channel}`}
    value={value}
    onChange={(e) => onChange(e.target.value as ChannelLevel)}
  >
    {LEVELS.map((level) => (
      <option key={level.value} value={level.value}>
        {level.label}
      </option>
    ))}
  </Select>
)

/** A watched address, flagged when payouts to it would get stuck. */
const WatchedAddress: React.FC<{ address: string }> = ({ address }) => {
  const payout = usePayoutAcceptance(address)
  return (
    <span>
      {shortenAddress(address)}
      {payout.data === 'rejects' ? (
        <Status $tone="warning">
          {' '}
          · can't receive Curate refunds or rewards
        </Status>
      ) : null}
    </span>
  )
}

const readNotice = () => {
  const flag = new URLSearchParams(window.location.search).get('notify')
  if (flag === 'email-verified')
    return {
      tone: 'success' as const,
      text: 'Email confirmed. You will get Scout notifications there.',
    }
  if (flag === 'email-link-invalid')
    return {
      tone: 'warning' as const,
      text: 'That confirmation link is invalid or expired. Save your email again to get a new one.',
    }
  return null
}

const Notifications: React.FC = () => {
  const { address } = useAccount()
  const config = useNotifyConfig()
  const profile = useNotifyProfile()
  const signIn = useNotifySignIn()
  const actions = useNotifyActions()
  const telegramLink = useTelegramLink()
  const [email, setEmail] = useState('')
  const [watchInput, setWatchInput] = useState('')
  const [pushHere, setPushHere] = useState<boolean | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notice] = useState(readNotice)

  const me = profile.data
  const pushEndpoints = me?.push?.endpoints.join(',')
  useEffect(() => {
    if (me?.email?.address) setEmail(me.email.address)
  }, [me?.email?.address])
  useEffect(() => {
    let cancelled = false
    currentPushEndpoint().then((endpoint) => {
      if (!cancelled)
        setPushHere(
          Boolean(endpoint && pushEndpoints?.split(',').includes(endpoint)),
        )
    })
    return () => {
      cancelled = true
    }
  }, [pushEndpoints])

  const run = async (promise: Promise<unknown>, success?: string) => {
    try {
      await promise
      if (success) successToast(success)
    } catch (error) {
      errorToast(describeError(error))
    }
  }

  if (config.isLoading)
    return (
      <Container>
        <Muted>Loading…</Muted>
      </Container>
    )
  if (!config.data) {
    return (
      <Container>
        <Intro>Notifications are not available on this deployment.</Intro>
      </Container>
    )
  }

  const intro = (
    <Intro>
      Get alerted when your items are challenged, when someone posts evidence on
      an item you are part of, and when the other side funds an appeal, so you
      never lose a case you already won.
    </Intro>
  )

  if (!me?.signedIn) {
    return (
      <Container>
        {intro}
        {notice ? <Notice $tone={notice.tone}>{notice.text}</Notice> : null}
        {address ? (
          <Section>
            <Muted>
              Sign a message to prove you own {shortenAddress(address)}. It's
              free: no transaction and no permissions.
            </Muted>
            <StyledButton
              type="button"
              size="small"
              disabled={signIn.isPending || profile.isLoading}
              onClick={() =>
                run(signIn.mutateAsync(), 'Signed in to notifications')
              }
            >
              {signIn.isPending
                ? 'Check your wallet…'
                : 'Sign in to set up notifications'}
            </StyledButton>
          </Section>
        ) : (
          <Muted>Connect your wallet to set up notifications.</Muted>
        )}
      </Container>
    )
  }

  const preferences = me.preferences!
  const setLevel = (channel: NotifyChannel, level: ChannelLevel) =>
    run(
      actions.updatePreferences.mutateAsync({
        channels: { ...preferences.channels, [channel]: level },
      }),
    )
  const setCategory = (category: NotifyCategory, enabled: boolean) =>
    run(
      actions.updatePreferences.mutateAsync({
        categories: { ...preferences.categories, [category]: enabled },
      }),
    )
  const differentWallet =
    address && me.address && address.toLowerCase() !== me.address

  return (
    <Container>
      {intro}
      {notice ? <Notice $tone={notice.tone}>{notice.text}</Notice> : null}
      <Row>
        <Muted>
          Signed in as <strong>{shortenAddress(me.address ?? '')}</strong>
        </Muted>
        <LinkButton
          type="button"
          onClick={() => run(actions.signOut.mutateAsync())}
        >
          Sign out
        </LinkButton>
      </Row>
      <PayoutWarning address={me.address} />
      {differentWallet ? (
        <Notice $tone="warning">
          Your wallet is now {shortenAddress(address)}. Sign out and in again to
          get notifications for it, or add it below as a watched address.
        </Notice>
      ) : null}

      <Section>
        <SectionTitle>Where to notify you</SectionTitle>
        <Muted>
          Urgent means you need to act: say, the other side funded its appeal,
          or posted evidence you can answer. Everything also shows in the bell.
        </Muted>

        {config.data.channels.email ? (
          <Channel>
            <Row>
              <ChannelName>Email</ChannelName>
              <LevelSelect
                channel="email"
                value={preferences.channels.email}
                onChange={(l) => setLevel('email', l)}
              />
            </Row>
            <Row>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <StyledButton
                type="button"
                size="small"
                variant="secondary"
                disabled={
                  !email ||
                  actions.setEmail.isPending ||
                  (email === me.email?.address && !me.email?.unsubscribed)
                }
                onClick={() =>
                  run(
                    actions.setEmail.mutateAsync(email.trim()),
                    'Check your inbox to confirm the address.',
                  )
                }
              >
                Save
              </StyledButton>
            </Row>
            {me.email ? (
              <Row>
                {me.email.unsubscribed ? (
                  <Status $tone="warning">
                    Unsubscribed. Save again to resubscribe.
                  </Status>
                ) : me.email.verified ? (
                  <Status $tone="success">Confirmed</Status>
                ) : (
                  <Status $tone="warning">
                    Waiting for you to click the link we sent
                  </Status>
                )}
                <LinkButton
                  type="button"
                  onClick={() => run(actions.removeEmail.mutateAsync())}
                >
                  Remove
                </LinkButton>
              </Row>
            ) : null}
          </Channel>
        ) : null}

        {config.data.channels.telegram ? (
          <Channel>
            <Row>
              <ChannelName>Telegram</ChannelName>
              <LevelSelect
                channel="telegram"
                value={preferences.channels.telegram}
                onChange={(l) => setLevel('telegram', l)}
              />
            </Row>
            {me.telegram?.connected ? (
              <Row>
                <Status $tone="success">
                  Connected
                  {me.telegram.username ? ` as @${me.telegram.username}` : ''}
                </Status>
                <LinkButton
                  type="button"
                  onClick={() => run(actions.unlinkTelegram.mutateAsync())}
                >
                  Disconnect
                </LinkButton>
              </Row>
            ) : (
              <>
                <Row>
                  <Muted>
                    {telegramLink.command
                      ? `Waiting for you to press Start in @${config.data.channels.telegram.bot}…`
                      : `Opens @${config.data.channels.telegram.bot}. Press Start there to finish.`}
                  </Muted>
                  <StyledButton
                    type="button"
                    size="small"
                    variant="secondary"
                    disabled={telegramLink.isPending}
                    onClick={async () => {
                      // Open synchronously so popup blockers allow it, then point it at the link.
                      const tab = window.open('about:blank', '_blank')
                      if (tab) tab.opener = null
                      try {
                        const url = await telegramLink.start()
                        if (tab) tab.location.href = url
                        else window.location.href = url
                      } catch (error) {
                        tab?.close()
                        errorToast(describeError(error))
                      }
                    }}
                  >
                    Connect Telegram
                  </StyledButton>
                </Row>
                {telegramLink.command ? (
                  <Muted>
                    On Telegram Web, send the bot{' '}
                    <Command>{telegramLink.command}</Command>
                  </Muted>
                ) : null}
              </>
            )}
          </Channel>
        ) : null}

        {config.data.channels.push ? (
          <Channel>
            <Row>
              <ChannelName>This browser</ChannelName>
              <LevelSelect
                channel="push"
                value={preferences.channels.push}
                onChange={(l) => setLevel('push', l)}
              />
            </Row>
            {!isPushSupported() ? (
              <Muted>
                This browser can't receive notifications. On iPhone, add Scout
                to your home screen first.
              </Muted>
            ) : pushHere ? (
              <Row>
                <Status $tone="success">On for this device</Status>
                <LinkButton
                  type="button"
                  onClick={() =>
                    run(
                      actions.disablePush
                        .mutateAsync()
                        .then(() => setPushHere(false)),
                    )
                  }
                >
                  Turn off
                </LinkButton>
              </Row>
            ) : (
              <Row>
                <Muted>
                  {me.push?.devices
                    ? `On for ${me.push.devices} other device${me.push.devices === 1 ? '' : 's'}.`
                    : 'Desktop and Android notifications.'}
                </Muted>
                <StyledButton
                  type="button"
                  size="small"
                  variant="secondary"
                  disabled={actions.enablePush.isPending}
                  onClick={() =>
                    run(
                      actions.enablePush
                        .mutateAsync(config.data!.channels.push!.publicKey)
                        .then(() => setPushHere(true)),
                      'Browser notifications are on.',
                    )
                  }
                >
                  Turn on
                </StyledButton>
              </Row>
            )}
          </Channel>
        ) : null}
      </Section>

      <Section>
        <SectionTitle>Also tell me about</SectionTitle>
        {CATEGORIES.map(({ key, label }) => (
          <CheckboxLabel key={key}>
            <Checkbox
              checked={preferences.categories[key]}
              onChange={(e) => setCategory(key, e.target.checked)}
            />
            {label}
          </CheckboxLabel>
        ))}
      </Section>

      <Section>
        <SectionTitle>Other addresses</SectionTitle>
        <Muted>
          Get notified for another wallet you use too, such as a hardware
          wallet.
        </Muted>
        {(me.watchedAddresses ?? []).map((watched) => (
          <Row key={watched}>
            <WatchedAddress address={watched} />
            <LinkButton
              type="button"
              onClick={() => run(actions.removeWatched.mutateAsync(watched))}
            >
              Remove
            </LinkButton>
          </Row>
        ))}
        {(me.watchedAddresses?.length ?? 0) <
        config.data.maxWatchedAddresses ? (
          <Row>
            <Input
              placeholder="0x…"
              value={watchInput}
              onChange={(e) => setWatchInput(e.target.value)}
              aria-label="Address to watch"
            />
            <StyledButton
              type="button"
              size="small"
              variant="secondary"
              disabled={!watchInput || actions.addWatched.isPending}
              onClick={() =>
                run(
                  actions.addWatched
                    .mutateAsync(watchInput.trim())
                    .then(() => setWatchInput('')),
                )
              }
            >
              Add
            </StyledButton>
          </Row>
        ) : null}
      </Section>

      <Row>
        {confirmDelete ? (
          <>
            <Muted>
              Delete your email, Telegram link, devices and notification
              history?
            </Muted>
            <LinkButton
              type="button"
              onClick={() =>
                run(
                  actions.deleteAccount.mutateAsync(),
                  'Notification data deleted.',
                )
              }
            >
              Yes, delete
            </LinkButton>
          </>
        ) : (
          <LinkButton type="button" onClick={() => setConfirmDelete(true)}>
            Delete my notification data
          </LinkButton>
        )}
      </Row>
    </Container>
  )
}

export default Notifications
