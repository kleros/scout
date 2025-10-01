
export const registryMap = {
  Single_Tags: '0x66260c69d03837016d88c9877e61e08ef74c59f2',
  Tags_Queries: '0xae6aaed5434244be3699c56e7ebc828194f26dc3',
  CDN: '0x957a53a994860be4750810131d9c876b2f52d6e1',
  Tokens: '0xee1502e29795ef6c2d60f8d7120596abe3bad990',
};

export const revRegistryMap = {
  '0x66260c69d03837016d88c9877e61e08ef74c59f2': 'Single_Tags',
  '0xae6aaed5434244be3699c56e7ebc828194f26dc3': 'Tags_Queries',
  '0x957a53a994860be4750810131d9c876b2f52d6e1': 'CDN',
  '0xee1502e29795ef6c2d60f8d7120596abe3bad990': 'Tokens',
};

export interface GraphItem {
  id: string;
  latestRequestSubmissionTime: string;
  registryAddress: string;
  itemID: string;
  status: 'Registered' | 'Absent' | 'RegistrationRequested' | 'ClearingRequested';
  disputed: boolean;
  data: string;
  metadata: {
    key0: string;
    key1: string;
    key2: string;
    key3: string;
    key4: string;
    props: Prop[];
  } | null;
  requests: Request[];
}

export interface Prop {
  value: string;
  type: string;
  label: string;
  description: string;
  isIdentifier: boolean;
}

export interface Request {
  disputed: boolean;
  disputeID: string;
  submissionTime: string;
  resolved: boolean;
  requester: string;
  challenger: string;
  resolutionTime: string;
  deposit: string;
  rounds: Round[];
}

export interface Round {
  appealPeriodStart: string;
  appealPeriodEnd: string;
  ruling: string;
  hasPaidRequester: boolean;
  hasPaidChallenger: boolean;
  amountPaidRequester: string;
  amountPaidChallenger: string;
}

