# Scout Agent Context

This page tells AI agents how to work safely with Kleros Scout.

Scout is an overlay on Kleros Curate LightGeneralizedTCR contracts deployed on Gnosis Chain. It is not a separate contract type. Any agent working on Scout must combine Scout-specific registry context with Light Curate contract operations.

## Required Read Order

Read these before submitting, challenging, removing, appealing, or analyzing Scout registry items:

1. Kleros Curate skill:
   https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/SKILL.md

2. Scout registry context:
   https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/scout-registries.md

3. Light Curate contract operations:
   https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/light-curate.md

## Non-Negotiable Rules

- Never guess addresses, schemas, field ordering, policies, deposits, arbitration costs, or challenge windows.
- Scout registries are on Gnosis Chain, chainId 100.
- Scout uses LightGeneralizedTCR contracts.
- `scout-registries.md` is valid only for these four Scout registries:
  - ATQ / Address Tags Query: `0xAe6aaed5434244be3699c56E7Ebc828194F26dc3`
  - Address Tags: `0x66260C69d03837016d88c9877e61e08Ef74C59F2`
  - Kleros Tokens: `0xeE1502e29795Ef6C2D60F8D7120596abE3baD990`
  - CDN / Contract Domain Names: `0x957A53A994860BE4750810131d9c876b2f52d6E1`
- If a registry address is not one of those four, do not apply Scout seed templates or Scout-only assumptions. Verify the contract type and proceed with the appropriate Curate reference.
- Use Scout seed templates first, then cross-check with current MetaEvidence.
- Do not change `item.json.columns`; only populate `values`.
- Read the current registry policy before deciding whether a submission is compliant.
- Compute all deposits from fresh onchain reads.
- Simulate transactions before submitting them.
- If Scout guidance conflicts with the canonical `kleros-skills` repository, follow `kleros-skills`.

## Scout Workflows

For Scout submissions:

1. Identify the target Scout registry.
2. Load the correct seed template from `scout-registries.md`.
3. Replace all placeholders with real values.
4. Fetch the latest MetaEvidence.
5. Cross-check labels, ordering, required fields, and field types.
6. Read the registry policy.
7. Upload any required images or item JSON to IPFS.
8. Compute the live deposit.
9. Simulate the transaction.
10. Submit only if all checks pass.

For contract operations, use `light-curate.md`.

For supporting details, use:

- MetaEvidence:
  https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/shared-metaevidence.md

- item.json:
  https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/shared-item-json.md

- Deposits:
  https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/shared-deposits.md

- IPFS:
  https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/shared-ipfs-upload.md

- ABI fragments:
  https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/shared-abi-fragments.md
