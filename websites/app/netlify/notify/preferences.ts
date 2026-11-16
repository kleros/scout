/**
 * Notification urgency and per-user preferences.
 *
 * - urgent: act now or lose (challenged, the other side funded its appeal,
 *   an appeal deadline is close, your item faces a removal request)
 * - important: things to read (new evidence, rulings, appeals, outcomes)
 * - soft: context (court period changes, receipts, rewards paid)
 */
export type Urgency = 'urgent' | 'important' | 'soft'
export type Channel = 'email' | 'telegram' | 'push'
export type ChannelLevel = 'all' | 'important' | 'urgent' | 'off'

/** Soft categories users can silence entirely (including the in-app inbox). */
export const CATEGORIES = [
  'periods',
  'funding',
  'receipts',
  'rewards',
  'follows',
] as const
export type Category = (typeof CATEGORIES)[number]

export interface Preferences {
  channels: Record<Channel, ChannelLevel>
  categories: Record<Category, boolean>
}

export const DEFAULT_PREFERENCES: Preferences = {
  channels: { email: 'important', telegram: 'important', push: 'urgent' },
  categories: {
    periods: true,
    funding: true,
    receipts: true,
    rewards: true,
    follows: true,
  },
}

const LEVELS: ChannelLevel[] = ['all', 'important', 'urgent', 'off']

/** Merges stored (possibly partial or outdated) preferences over the defaults. */
export const normalizePreferences = (stored: unknown): Preferences => {
  const value = (stored ?? {}) as Partial<Preferences>
  const channels = { ...DEFAULT_PREFERENCES.channels }
  for (const channel of Object.keys(channels) as Channel[]) {
    const level = value.channels?.[channel]
    if (level && LEVELS.includes(level)) channels[channel] = level
  }
  const categories = { ...DEFAULT_PREFERENCES.categories }
  for (const category of CATEGORIES) {
    const enabled = value.categories?.[category]
    if (typeof enabled === 'boolean') categories[category] = enabled
  }
  return { channels, categories }
}

const RANK: Record<Urgency, number> = { soft: 0, important: 1, urgent: 2 }
const THRESHOLD: Record<ChannelLevel, number> = {
  all: 0,
  important: 1,
  urgent: 2,
  off: 3,
}

export const channelWants = (
  preferences: Preferences,
  channel: Channel,
  urgency: Urgency,
) => RANK[urgency] >= THRESHOLD[preferences.channels[channel]]
