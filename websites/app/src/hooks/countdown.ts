import { useEffect, useState } from 'react'
import humanizeDuration from 'humanize-duration'
import { registryMap } from 'utils/items';
import { useRegistryParameters } from './useRegistryParameters';

const KNOWN_REGISTRIES = new Set(Object.values(registryMap));

/**
 * A registry's challenge period in seconds, or null until it is known (and for an address that is
 * not one of Scout's registries). It comes from the shared registry parameters
 * (hooks/useRegistryParameters: one read per registry, kept in memory and in localStorage for a
 * day), so every row of a list shares one read instead of opening its own RPC connection.
 */
export const useChallengePeriodDuration = (registryAddress: string): number | null => {
  const known = KNOWN_REGISTRIES.has(registryAddress);
  const { data } = useRegistryParameters(known ? registryAddress : '');
  return known && data ? Number(data.challengePeriodDuration) : null;
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

const useHumanizedCountdown = (duration: number | null, largest: number): string | null => {
  const [remainingTime, setRemainingTime] = useState<number | null>(duration);

  useEffect(() => {
    if (duration === null) return;

    // The moment the duration runs out. Each tick reads the clock against it, so a throttled
    // background tab or a computer waking from sleep shows the real time left (no drift).
    const deadline = Date.now() + duration;
    setRemainingTime(duration);

    const id = setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        clearInterval(id);
        setRemainingTime(0);
        return;
      }
      setRemainingTime(left);
    }, 1000);

    return () => clearInterval(id);
  }, [duration]);

  if (remainingTime === null) return null;

  const formattedTime = humanizeDuration(remainingTime, {
    largest: largest || 2,
    round: true,
    units: ['d', 'h', 'm'],
    spacer: '',
    delimiter: ' ',
    language: 'shortEn',
    languages: {
      shortEn: {
        y: () => 'y',
        mo: () => 'mo',
        w: () => 'w',
        d: () => 'd',
        h: () => 'h',
        m: () => 'min',
        s: () => 's',
        ms: () => 'ms',
      }
    }
  });

  return remainingTime > 0 ? `${formattedTime}` : 'Ended';
};

export default useHumanizedCountdown
