export interface RewardData {
  title: string;
  description: string;
  registryKey: string;
}

export const REWARDS_DATA: RewardData[] = [
  {
    title: "Token Collection Verification",
    description: "Verify the authenticity of new tokens and earn rewards",
    registryKey: "tokens",
  },
  {
    title: "Address Tag Collection Verification",
    description: "Verify the authenticity of new contract address tags and earn rewards",
    registryKey: "single-tags",
  },
  {
    title: "Contract Domain Name Collection Verification",
    description: "Verify the authenticity of new contract domain name submissions and earn rewards",
    registryKey: "cdn",
  },
];

export const SUBMISSION_REWARD = "93,000 PNK";
export const REMOVAL_REWARD = "7,000 PNK";

/** The last day of the current month, in UTC, e.g. "30 November 2026 (UTC)". */
export const getCurrentMonthDeadline = (): string => {
  const now = new Date();
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const date = lastDay.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  // The month is counted in UTC: say so, or someone west of UTC reads the wrong midnight.
  return `${date} (UTC)`;
};
