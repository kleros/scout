export interface RewardData {
  title: string;
  description: string;
  registryKey: string;
}

export const REWARDS_DATA: RewardData[] = [
  {
    title: "Token Collection Verification",
    description: "Verify the authenticity of new tokens and earn rewards",
    registryKey: "Tokens",
  },
  {
    title: "Address Tag Collection Verification",
    description: "Verify the authenticity of new contract address tags and earn rewards",
    registryKey: "Single_Tags",
  },
  {
    title: "Contract Domain Name Collection Verification",
    description: "Verify the authenticity of new contract domain name submissions and earn rewards",
    registryKey: "CDN",
  },
];

export const SUBMISSION_REWARD = "93,000 PNK";
export const REMOVAL_REWARD = "7,000 PNK";

export const getRegistryUrl = (registryKey: string) =>
  `/registry/${registryKey}?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1`;

export const getCurrentMonthDeadline = (): string => {
  const now = new Date();
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return lastDay.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};
