import { useEffect, useState } from 'react'
import humanizeDuration from 'humanize-duration'
import { registryMap } from 'utils/fetchItems';
import { JsonRpcProvider, Contract } from 'ethers';

export const useChallengePeriodDuration = (registryAddress: string) => {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const fetchDuration = async () => {
      const provider = new JsonRpcProvider('https://rpc.gnosischain.com')
      const abi = ['function challengePeriodDuration() view returns (uint256)']
      let contractAddress

      switch (registryAddress) {
        case registryMap.Tags:
          contractAddress = registryMap.Tags
          break
        case registryMap.Tokens:
          contractAddress = registryMap.Tokens
          break
        case registryMap.CDN:
          contractAddress = registryMap.CDN
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

const useHumanizedCountdown = (duration: number | null, largest: number): string | null => {
  const [remainingTime, setRemainingTime] = useState<number | null>(duration);

  useEffect(() => {
    if (duration === null) return;

    setRemainingTime(duration);

    const id = setInterval(() => {
      setRemainingTime((prevTime) => {
        if (prevTime === null || prevTime <= 0) {
          clearInterval(id);
          return 0;
        }
        return prevTime - 1000;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [duration]);

  if (remainingTime === null) return null;

  const formattedTime = humanizeDuration(remainingTime, {
    largest: largest || 2,
    round: true
  });

  return remainingTime > 0 ? `${formattedTime}` : 'Ended';
};

export default useHumanizedCountdown