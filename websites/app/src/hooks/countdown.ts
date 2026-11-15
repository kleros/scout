import { useEffect, useState } from 'react'
import { registryMap } from 'utils/items';
import { JsonRpcProvider, Contract } from 'ethers';
import { GNOSIS_RPC_URL } from 'consts/index';

export const useChallengePeriodDuration = (registryAddress: string) => {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const fetchDuration = async () => {
      const provider = new JsonRpcProvider(GNOSIS_RPC_URL)
      const abi = ['function challengePeriodDuration() view returns (uint256)']
      let contractAddress

      switch (registryAddress) {
        case registryMap['single-tags']:
          contractAddress = registryMap['single-tags']
          break
        case registryMap['tags-queries']:
          contractAddress = registryMap['tags-queries']
          break
        case registryMap['tokens']:
          contractAddress = registryMap['tokens']
          break
        case registryMap['cdn']:
          contractAddress = registryMap['cdn']
          break
        default:
          console.error('Unknown registry')
          return
      }

      try {
        const contract = new Contract(contractAddress, abi, provider)
        const result = await contract.challengePeriodDuration()
        setDuration(Number(result))
      } catch (error) {
        console.error('Error fetching challenge period duration:', error)
      }
    }

    fetchDuration()
  }, [registryAddress])

  return duration
}

export const useChallengeRemainingTime = (
  submissionTime: string | undefined,
  disputed: boolean | undefined,
  challengePeriodDuration: number | null
) => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    if (
      submissionTime &&
      disputed !== undefined &&
      !disputed &&
      challengePeriodDuration !== null
    ) {
      const submissionTimeMs = Number(submissionTime) * 1000
      const deadline = submissionTimeMs + challengePeriodDuration * 1000
      const remaining = deadline - Date.now()
      setRemainingTime(remaining > 0 ? remaining : null)
    } else {
      setRemainingTime(null)
    }
  }, [submissionTime, disputed, challengePeriodDuration])

  return remainingTime
}

/**
 * A time left as "3d 11h", "4h 20min" or "less than 1min". Units are floored, never rounded up:
 * a deadline must not look later than it is ("1d 7h" for 1 day 7 hours 40 minutes).
 */
export const formatTimeLeft = (ms: number, largest = 2): string => {
  const totalMinutes = Math.floor(ms / 60_000)
  if (totalMinutes < 1) return 'less than 1min'
  const units: Array<[number, string]> = [
    [Math.floor(totalMinutes / 1440), 'd'],
    [Math.floor((totalMinutes % 1440) / 60), 'h'],
    [totalMinutes % 60, 'min'],
  ]
  const first = units.findIndex(([value]) => value > 0)
  return units
    .slice(first, first + (largest || 2))
    .filter(([value]) => value > 0)
    .map(([value, unit]) => `${value}${unit}`)
    .join(' ')
}

/** Re-renders the caller every second until `until` (ms) passes, and as soon as the tab is shown again. */
const useSecondTicker = (until: number | null) => {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (until === null) return
    const tick = () => setTick((n) => n + 1)
    const id = setInterval(() => {
      tick()
      if (Date.now() >= until) clearInterval(id)
    }, 1000)
    // Timers are throttled in background tabs and stop during sleep: catch up on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [until])
}

/**
 * Counts down `duration` (ms, measured from when it is given). The deadline it points to is kept
 * and the clock is read on every tick, so a throttled or sleeping tab never drifts from it.
 * Returns "3d 11h" (see formatTimeLeft), "Ended" at zero, or null without a duration.
 */
const useHumanizedCountdown = (duration: number | null, largest: number): string | null => {
  const [deadline, setDeadline] = useState<number | null>(() =>
    duration === null ? null : Date.now() + duration,
  )

  useEffect(() => {
    if (duration === null) {
      setDeadline(null)
      return
    }
    const next = Date.now() + duration
    // The same deadline given again (within a second) keeps the current one.
    setDeadline((current) =>
      current !== null && Math.abs(current - next) < 1000 ? current : next,
    )
  }, [duration])

  useSecondTicker(deadline)

  if (deadline === null) return null
  const remaining = deadline - Date.now()
  return remaining > 0 ? formatTimeLeft(remaining, largest) : 'Ended'
};

/**
 * Time left until `deadline` (unix seconds), updated every second: "3d 11h", "less than 1min",
 * "Ended" once it has passed, or null without a deadline.
 */
export const useTimeLeft = (deadline: number | null | undefined, largest = 2): string | null => {
  const until = deadline ? deadline * 1000 : null
  useSecondTicker(until)
  if (until === null) return null
  const remaining = until - Date.now()
  return remaining > 0 ? formatTimeLeft(remaining, largest) : 'Ended'
}

const MAX_TIMEOUT_MS = 2_147_483_647

/**
 * The current time in unix seconds, refreshed one second after each of `moments` (unix seconds)
 * passes and whenever the tab is shown again. Use it to re-evaluate a state that changes at known
 * deadlines (end of a challenge period, half and end of an appeal period) without re-rendering
 * every second.
 */
export const useClockAt = (moments: Array<number | null | undefined>): number => {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const key = moments.filter((moment): moment is number => !!moment).join(',')

  useEffect(() => {
    const targets = key ? key.split(',').map((moment) => (Number(moment) + 1) * 1000) : []
    let timer: ReturnType<typeof setTimeout> | undefined
    const update = () => {
      clearTimeout(timer)
      const current = Date.now()
      setNow(Math.floor(current / 1000))
      const next = targets.filter((target) => target > current).sort((a, b) => a - b)[0]
      if (next !== undefined) timer = setTimeout(update, Math.min(next - current, MAX_TIMEOUT_MS))
    }
    update()
    const onVisible = () => {
      if (document.visibilityState === 'visible') update()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key])

  return now
}

export default useHumanizedCountdown