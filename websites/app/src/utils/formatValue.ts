import { formatEther } from 'viem'

export function formatValue(
  value: bigint,
  maximumFractionDigits = 4,
): string {
  return Number(formatEther(value)).toLocaleString('en-US', {
    maximumFractionDigits,
  })
}
