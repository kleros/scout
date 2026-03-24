import { registryAddresses } from './contracts';

export interface PolicyHistoryEntry {
  startDate: string; // ISO date string
  endDate: string | null; // null means "present"
  policyURI: string; // IPFS path
  txHash: string;
}

export const policyHistories: Record<string, PolicyHistoryEntry[]> = {
  // Tokens - 0xee1502e29795ef6c2d60f8d7120596abe3bad990
  [registryAddresses['tokens']]: [
    {
      startDate: '2023-09-29T16:12:50Z',
      endDate: '2023-09-29T19:08:30Z',
      policyURI: '/ipfs/QmPF47EH7MTfnKUvrb1rht9qxvita3cZxhkUYRKSjTyrWG/policy.pdf',
      txHash: '0xd74c5b08dec82ffd5e0b55a2e55ac1767f27c278132fbdb004eef47a65824d7a',
    },
    {
      startDate: '2023-09-29T19:08:30Z',
      endDate: '2023-10-06T18:43:40Z',
      policyURI: '/ipfs/Qmak6tHNB4q1Y2ihYde9bZqKaB2wy8mRZ53ChnpCSRfiXR',
      txHash: '0xc7ab058e0ecb1ce1ffb94900cabc52f9eb9d0f706722bfcdb0e886b7959c3add',
    },
    {
      startDate: '2023-10-06T18:43:40Z',
      endDate: '2023-12-18T14:11:35Z',
      policyURI: '/ipfs/QmQNMntc1gMmtSR5AZxbB9g2W2qcvnd9beytCRQ7HeP8mN/tokens-policy.pdf',
      txHash: '0xc1e3dc9f502556e3ff0b48d4e97f2b13531bdc2b8299ab337e8744097b91901f',
    },
    {
      startDate: '2023-12-18T14:11:35Z',
      endDate: '2024-07-04T07:57:55Z',
      policyURI: '/ipfs/QmSxGYpXHBWBGvGnBeZD1pFxh8fRHj4Z7o3fBzrGiqNx4v/tokens-policy.pdf',
      txHash: '0x68edbc56e430b5126b62cb0de28e68d682c5cc9f76be95b80988208a41c1adb8',
    },
    {
      startDate: '2024-07-04T07:57:55Z',
      endDate: '2025-03-26T07:53:30Z',
      policyURI: '/ipfs/QmZetBgPEXv1YUk2qfCBWr1nSjPKePaAaWMuU74uW395Zj',
      txHash: '0x3ed029b2cfd55e78444bf9471978e7d5907b574990d69b481867919e6469e5d6',
    },
    {
      startDate: '2025-03-26T07:53:30Z',
      endDate: '2025-04-29T10:12:40Z',
      policyURI: '/ipfs/QmRLCQ5AFtobGbDNnhEzVzbNnwUXR6Umqn5bd4MQKb4shU/policy.pdf',
      txHash: '0x1b4ac04370a149a0133d6b0a38147c5dce413c0baab6d95754cb4007f631fee5',
    },
    {
      startDate: '2025-04-29T10:12:40Z',
      endDate: '2025-04-29T13:00:45Z',
      policyURI: '/ipfs/QmRLCQ5AFtobGbDNnhEzVzbNnwUXR6Umqn5bd4MQKb4shU/policy.pdf',
      txHash: '0xdfff306cef92492e4217f18455df44122ce9312c060f5946f4ddbf723038de39',
    },
    {
      startDate: '2025-04-29T13:00:45Z',
      endDate: '2025-04-30T21:13:10Z',
      policyURI: '/ipfs/QmQnpBwKGCKBgG5h7t9c2zByrTkyCUqCxwiUPVKj4J8WC9/policy.pdf',
      txHash: '0xe0c96d78e80f513f5d405580b57556508ad9dbac5e69640b701c796944c8ab1c',
    },
    {
      startDate: '2025-04-30T21:13:10Z',
      endDate: '2025-05-31T22:32:45Z',
      policyURI: '/ipfs/QmdPjp9wzqmJdSwk7ow1LzdgDD7Q3FMNiA6TRj4bjFjag7/policy.pdf',
      txHash: '0xd4e19c96fbcc279aa1cd96a4e7e434b1323593d080fdc773ec63b780e052e6b6',
    },
    {
      startDate: '2025-05-31T22:32:45Z',
      endDate: '2025-08-29T13:36:10Z',
      policyURI: '/ipfs/QmarLK8MmtshY7tRPqh7TXFLLqFprAhE4KqDXHkP1ppydN/policy.pdf',
      txHash: '0x6b55f02dfee8765ff662d9e7d7202af47e63325604a9baa597f705b8f4223d0c',
    },
    {
      startDate: '2025-08-29T13:36:10Z',
      endDate: null,
      policyURI: '/ipfs/QmarLK8MmtshY7tRPqh7TXFLLqFprAhE4KqDXHkP1ppydN/policy.pdf',
      txHash: '0x11dfe18cabb3537772b027608c2e90491eb641578143e8c409ea399d203f3dc8',
    },
  ],

  // Tags Queries - 0xae6aaed5434244be3699c56e7ebc828194f26dc3
  [registryAddresses['tags-queries']]: [
    {
      startDate: '2024-04-28T14:31:25Z',
      endDate: '2024-05-22T13:20:30Z',
      policyURI: '/ipfs/QmXbWTGRhiiHorECi6BFcHUWUTpRsYTwMES7mp4PjJkQQS/-address-tag-query-list-guidelines-12-.pdf',
      txHash: '0x061917aa7e17099ba54a31b3a37f4ce639447452977d3986ef473cc41d48db92',
    },
    {
      startDate: '2024-05-22T13:20:30Z',
      endDate: '2024-08-14T04:59:20Z',
      policyURI: '/ipfs/QmPj9TspjDKGNF8K871yFLZNXJgp3Nj4zo99fqbBmsJx37',
      txHash: '0xb8873526d824e145476a9de511123c28397522bcd8d6bfa431f8826280559d78',
    },
    {
      startDate: '2024-08-14T04:59:20Z',
      endDate: '2025-01-15T15:35:40Z',
      policyURI: '/ipfs/QmfXru4pbcpMLFaiNDGNontRHuLD3va7m95tUGYGZuMtqm',
      txHash: '0xfa511cbf1722f83b5748af89491cd9d4967a8a7b4adb0e1f31d0ebc915eea888',
    },
    {
      startDate: '2025-01-15T15:35:40Z',
      endDate: '2025-08-29T08:58:45Z',
      policyURI: '/ipfs/QmeShHWsUxATHd5RxhBzwfRKGQQyH4mVWvsQuWxaeSPBTv/policy.pdf',
      txHash: '0x192872b658098cfdc813b924c9048d6e6838ef7da7e81e625b153277c8257da1',
    },
    {
      startDate: '2025-08-29T08:58:45Z',
      endDate: '2026-01-28T13:50:05Z',
      policyURI: '/ipfs/QmWbpqfGiA4L1FK4qwSAgyp9u2KMLYc8AWCKKW3pxPuFNP',
      txHash: '0xb3f07396c36eab9b5172f6c52507578dabe6f5efed4f269118b7eb51258fa981',
    },
    {
      startDate: '2026-01-28T13:50:05Z',
      endDate: null,
      policyURI: '/ipfs/QmWbpqfGiA4L1FK4qwSAgyp9u2KMLYc8AWCKKW3pxPuFNP',
      txHash: '0x78161c9c9d60c2321f7620b1a081633d28beab1e21826dbdb0db72c8917f90ce',
    },
  ],

  // Single Tags - 0x66260c69d03837016d88c9877e61e08ef74c59f2
  [registryAddresses['single-tags']]: [
    {
      startDate: '2023-05-29T06:17:45Z',
      endDate: '2023-05-29T11:36:30Z',
      policyURI: '/ipfs/QmbHrNhkdJ378zwMUCa75amtoGa27WruUnb7rzaptmbKzS/address-tags-list-guidelines.pdf',
      txHash: '0x7ef3417589b0db68af32a0a21a11c87a20848d100e5d1e0eb202275c9a6fae5c',
    },
    {
      startDate: '2023-05-29T11:36:30Z',
      endDate: '2023-06-19T04:16:20Z',
      policyURI: '/ipfs/QmbHrNhkdJ378zwMUCa75amtoGa27WruUnb7rzaptmbKzS/address-tags-list-guidelines.pdf',
      txHash: '0x77892f3f406e3529de7fd6877c55e3e2ae71863a282c4a168b221ee54d802f7f',
    },
    {
      startDate: '2023-06-19T04:16:20Z',
      endDate: '2023-06-19T04:47:55Z',
      policyURI: '/ipfs/QmTL1SCKpRcr7NRbVpXW6z9QoQXRHJT5cQr6PEge5qoLwU/t2cr-primary-document.pdf',
      txHash: '0x8032c6d196d4e972aefced997dde43a454a0a293a6eb0afa389f3e6ed0a23b23',
    },
    {
      startDate: '2023-06-19T04:47:55Z',
      endDate: '2023-06-19T04:52:10Z',
      policyURI: '/ipfs/Qmak6tHNB4q1Y2ihYde9bZqKaB2wy8mRZ53ChnpCSRfiXR',
      txHash: '0xd706ad8065ecbd036ca4964852f841fa8de1fe09811b1c45944abc30c0d53376',
    },
    {
      startDate: '2023-06-19T04:52:10Z',
      endDate: '2023-06-19T04:54:35Z',
      policyURI: '/ipfs/QmSaJWBFGGZ3FussTi6MqfXrMsaE75asumR2LLuAZFcrSf',
      txHash: '0xd382c724236790b815a87a8207418cbab2b6d531b9cb8165c72150f762103ef8',
    },
    {
      startDate: '2023-06-19T04:54:35Z',
      endDate: '2023-06-19T05:13:15Z',
      policyURI: '/ipfs/QmSaJWBFGGZ3FussTi6MqfXrMsaE75asumR2LLuAZFcrSf',
      txHash: '0x6f6071e779081b62aa1f5bd547614dda6d53057fad49a0e0c05d7682a5880531',
    },
    {
      startDate: '2023-06-19T05:13:15Z',
      endDate: '2025-03-26T07:46:55Z',
      policyURI: '/ipfs/QmSaJWBFGGZ3FussTi6MqfXrMsaE75asumR2LLuAZFcrSf',
      txHash: '0xc723edb306e968cf94e22efb9db32e2ec269c1953ee87dc5671692c079b64ce0',
    },
    {
      startDate: '2025-03-26T07:46:55Z',
      endDate: '2025-08-02T08:19:05Z',
      policyURI: '/ipfs/QmTJpbqEY9Ee2YrpS8hL8ESwgGkwMDTQobTW14dm7wTwCr/policy.pdf',
      txHash: '0x6a322b9507eae48c11bc4d8729800c6262abc88ccefae1c896708dc43a5cd039',
    },
    {
      startDate: '2025-08-02T08:19:05Z',
      endDate: '2025-08-29T13:36:10Z',
      policyURI: '/ipfs/QmW98DxDWgcYpGmXq3p1sHba1iJ2F3ziBmVDtwH8kJgdmA',
      txHash: '0x88de14278569341887e3e4ff15be1606a07113eacd85ddda48ebd3cb607f9378',
    },
    {
      startDate: '2025-08-29T13:36:10Z',
      endDate: '2025-08-29T13:46:35Z',
      policyURI: '/ipfs/QmW5fj91YZ8JMEQJPyA2LLJ3ntmtGTQK2WnNs7rEfRHeuA',
      txHash: '0x11dfe18cabb3537772b027608c2e90491eb641578143e8c409ea399d203f3dc8',
    },
    {
      startDate: '2025-08-29T13:46:35Z',
      endDate: '2025-09-01T03:00:35Z',
      policyURI: '/ipfs/QmSxwgNsbKdyqCty2EdMgPEbD4iWEBZvhmG8HbaVKuYzNv',
      txHash: '0xe4527cbdeb9847ab50b27ad597498d15d1075bddd0b2f7f204969cb8b0fa533f',
    },
    {
      startDate: '2025-09-01T03:00:35Z',
      endDate: null,
      policyURI: '/ipfs/QmW5fj91YZ8JMEQJPyA2LLJ3ntmtGTQK2WnNs7rEfRHeuA',
      txHash: '0x22bb3e78a51fd21989378b29115bb4ddd1deb9b8f2966aebfdf72db252cdae5a',
    },
  ],

  // CDN - 0x957a53a994860be4750810131d9c876b2f52d6e1
  [registryAddresses['cdn']]: [
    {
      startDate: '2023-01-05T11:51:55Z',
      endDate: '2023-01-07T14:47:10Z',
      policyURI: '/ipfs/Qmeydf2zRpbrbChdUurECdQs8Syjnu4sAWBZ8q6hkyBwb3/contract-domain-name-registry-for-ledger-policy-1-.pdf',
      txHash: '0x102c8ee0ee410e2d8767a5f5559137d65d865063ed9120c7f16c2e0084ff4b0b',
    },
    {
      startDate: '2023-01-07T14:47:10Z',
      endDate: '2023-06-14T06:07:05Z',
      policyURI: '/ipfs/QmdvkC5Djgk8MfX5ijJR3NJzmvGugUqvui7bKuTErSD6cE/contract-domain-name-registry-for-ledger-policy-3-.pdf',
      txHash: '0x0c88720b2654d27c75d390d67b733e0aa11571d18a9caeeecd20b734273cdf56',
    },
    {
      startDate: '2023-06-14T06:07:05Z',
      endDate: '2023-06-16T03:12:10Z',
      policyURI: '/ipfs/QmTXU3TbWzeUa8qD4YqzMYs6r77Utr3S3FW47RaJfT3eTp/Kleros CDN registry policy (v2.2).pdf',
      txHash: '0x4898dd3b40de5d27dbcd10047e55c4aaef417f599a865b7a1f1ba6822b3e31d6',
    },
    {
      startDate: '2023-06-16T03:12:10Z',
      endDate: '2025-03-26T07:57:40Z',
      policyURI: '/ipfs/QmP3be4kpiNrDx4nV222UsT3sAwi846xNkq4tctTVNJYfJ',
      txHash: '0xf5b30d0df35afbe255b779bef6dced0460dc77c00a23d18c74a889117c74078e',
    },
    {
      startDate: '2025-03-26T07:57:40Z',
      endDate: '2025-08-29T13:36:10Z',
      policyURI: '/ipfs/QmPaZoueeSTmPKBnQr53W6RgvwsSX6sHxzK8eK9VnYF6zF/policy.pdf',
      txHash: '0x74c450ecf6691a425187f0d4d39210ea59a7159a404508bfba618d84a44e8798',
    },
    {
      startDate: '2025-08-29T13:36:10Z',
      endDate: null,
      policyURI: '/ipfs/QmPaZoueeSTmPKBnQr53W6RgvwsSX6sHxzK8eK9VnYF6zF/policy.pdf',
      txHash: '0x11dfe18cabb3537772b027608c2e90491eb641578143e8c409ea399d203f3dc8',
    },
  ],
};
