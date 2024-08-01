import { useEffect, useState } from 'react'
import humanizeDuration from 'humanize-duration'
import { GraphItem, registryMap } from 'utils/fetchItems';
import { ethers } from 'ethers';

export const useChallengePeriodDuration = (registryAddress) => {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const fetchDuration = async () => {
      const provider = new ethers.JsonRpcProvider('https://rpc.gnosischain.com')
      const abi = ['function challengePeriodDuration() view returns (uint256)']
      let contractAddress

      switch (registryAddress) {
        case registryMap['Tags']:
          contractAddress = '0x66260c69d03837016d88c9877e61e08ef74c59f2'
          break
        case registryMap['Tokens']:
          contractAddress = '0xee1502e29795ef6c2d60f8d7120596abe3bad990'
          break
        case registryMap['CDN']:
          contractAddress = '0x957a53a994860be4750810131d9c876b2f52d6e1'
          break
        default:
          console.error('Unknown registry')
          return
      }

      try {
        const contract = new ethers.Contract(contractAddress, abi, provider)
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

export const useChallengeRemainingTime = (item: GraphItem, challengePeriodDuration: number | null) => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    if (
      item?.requests[0].submissionTime &&
      !item.disputed &&
      challengePeriodDuration !== null
    ) {
      const submissionTime = Number(item.requests[0].submissionTime) * 1000
      const deadline = submissionTime + challengePeriodDuration * 1000
      const remaining = deadline - Date.now()
      setRemainingTime(remaining > 0 ? remaining : null)
    } else {
      setRemainingTime(null)
    }
  }, [item, challengePeriodDuration])

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