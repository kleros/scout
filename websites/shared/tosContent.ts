type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export interface TosSection {
  title: string
  content: ContentBlock[]
}

export const tosTitle = 'Kleros Scout \u2014 Terms of Service'

export const tosIntro = [
  'These Terms of Service ("Terms") govern your access to and use of the Kleros Scout website (https://klerosscout.eth.limo/) and Dapp (https://app.klerosscout.eth.limo/), both referred as "Site" operated by Coop\u00e9rative Kleros, SCIC ("Kleros", "we", or "us").',
  'By accessing or using the Site, you agree to these Terms. If you do not agree, please refrain from using the Site.',
]

export const tosSections: TosSection[] = [
  {
    title: '1. Service Description',
    content: [
      {
        type: 'paragraph',
        text: 'Kleros Scout is a front-end interface that allows users to explore and interact with decentralized, community-curated registries. These registries contain information about tokens, and other blockchain addresses. Users may also submit entries to these registries or challenge existing ones, all governed by decentralized dispute resolution mechanisms.',
      },
      {
        type: 'paragraph',
        text: 'Each registry has its own rules and criteria for acceptance. Some registries may apply technical or risk-related filters (e.g. token registry), while others (e.g. address tag registry) focus solely on tagging and may include addresses without regard to their legitimacy or intentions behind their owners/controllers.',
      },
      {
        type: 'paragraph',
        text: 'Kleros does not control or validate registry content and provides the Site solely as an access point to decentralized systems governed by community curation. The verification process is carried out through a fully decentralized procedure, in which third-party actors, not affiliated with Kleros, verify and validate the data.',
      },
    ],
  },
  {
    title: '2. Submissions and Challenges',
    content: [
      {
        type: 'paragraph',
        text: 'The Site enables users to submit entries to registries or challenge existing entries. These interactions require users to deposit cryptocurrency as a financial stake ("Deposits"). DEPOSITS WILL BE LOST IF THE SUBMISSION OR CHALLENGE IS REJECTED UNDER THE RELEVANT REGISTRY\'S POLICY.',
      },
      {
        type: 'paragraph',
        text: "It is the user's sole responsibility to:",
      },
      {
        type: 'list',
        items: [
          'Review and understand the specific policy applicable to each registry;',
          'Ensure that any submission or challenge is well-founded and compliant;',
        ],
      },
      {
        type: 'paragraph',
        text: "Kleros is not liable for any loss or dispute outcome. All submissions and challenges are resolved by independent jurors through Kleros' decentralized dispute resolution system.",
      },
    ],
  },
  {
    title: '3. No Warranty or Endorsement',
    content: [
      {
        type: 'paragraph',
        text: 'The information accessible via the Site is community-curated. Inclusion of an address, token, or tag in a registry does not imply endorsement, verification, or validation by Kleros or its contributors.',
      },
      {
        type: 'paragraph',
        text: 'Even in registries with certain filtering criteria, no guarantee is made regarding the safety, quality, or legitimacy of any listed entity. You are solely responsible for verifying the information before relying on it in any way.',
      },
    ],
  },
  {
    title: '4. No Liability',
    content: [
      {
        type: 'paragraph',
        text: 'To the maximum extent permitted by law, Kleros disclaims all liability for:',
      },
      {
        type: 'list',
        items: [
          'Errors or omissions in registry data;',
          'Any losses, including financial loss or damages, arising from reliance on information displayed through the Site;',
          'The outcome of registry submissions or challenges, including any loss of deposits.',
        ],
      },
      {
        type: 'paragraph',
        text: 'You use this Site and interact with its underlying registries entirely at your own risk.',
      },
    ],
  },
  {
    title: '5. No Legal or Financial Advice',
    content: [
      {
        type: 'paragraph',
        text: 'Nothing on the Site constitutes legal, financial, or investment advice. You should consult independent professionals before making decisions based on any information available through Kleros Scout.',
      },
    ],
  },
  {
    title: '6. Modifications to the Service',
    content: [
      {
        type: 'paragraph',
        text: 'Kleros may update or discontinue the Site or its features at any time, without notice or liability. These Terms may also be updated from time to time. Continued use of the Site after changes constitutes acceptance of the revised Terms.',
      },
    ],
  },
  {
    title: '7. Governing Law',
    content: [
      {
        type: 'paragraph',
        text: 'These Terms are governed by the laws of France, without regard to conflict of law principles. Any disputes shall be subject to the exclusive jurisdiction of the courts located in Paris, France.',
      },
    ],
  },
]
