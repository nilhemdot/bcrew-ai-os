# SOURCE-CONTRACT-ID-RECONCILE-001 Plan

Card: `SOURCE-CONTRACT-ID-RECONCILE-001`
Sprint: `source-contract-id-reconcile-2026-05-16`
Closeout key: `source-contract-id-reconcile-v1`

## What

Reconcile source IDs already referenced by connector credential rows but missing from the source contract registry.

This is no-auth metadata/source-contract work. It does not call providers, mutate credentials, change OAuth scopes, or start extraction jobs.

## Why

Connector health is now green, but the credential registry still references source IDs that do not exist as source contracts. That creates confusing missing-source metadata and makes future connector/source completion harder to trust.

## Acceptance Criteria

- Reconcile `SRC-GDOCS-001`, `SRC-GSLIDES-001`, and `SRC-GSHEETS-001` as source contract identities or explicitly remap/remove the references.
- Do not turn GA4/GSC/GBP/Web/Reddit/GitHub/Twitter/Telegram/WhatsApp/Zoom into fake active sources in this card.
- Focused proof shows the Google Workspace credential rows no longer report those three no-auth source IDs as missing.
- No credentials, OAuth scopes, source-system data, provider calls, paid auth, or extraction schedules are changed.

## Definition Of Done

- Plan Critic score is 9.8+ before build proceeds.
- Current Sprint moves through Sprint Ready, Building Now, and Done This Sprint.
- Focused proof plus full Foundation ship gate pass before push.

## Details

Use:

- `lib/source-contracts.js`
- `lib/connector-credential-registry.js`
- `scripts/process-source-contract-id-reconcile-check.mjs`
- `docs/handoffs/2026-05-16-connector-completion-prep-matrix.md`

## Risks

- Risk: creating fake source truth for source IDs that are only future candidates.
  - Guard: this card is limited to Google Docs, Google Slides, and Google Sheets source identities already covered by delegated Google Workspace reads.
- Risk: treating metadata reconcile as extraction readiness.
  - Guard: no extraction jobs or provider calls in this card.

## Tests

```bash
npm run process:source-contract-id-reconcile-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SOURCE-CONTRACT-ID-RECONCILE-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-ID-RECONCILE-001.json --closeoutKey=source-contract-id-reconcile-v1 --commitRef=HEAD
```

## Repair Path

If those IDs should not exist as source contracts, remap the credential registry references to the existing source contracts instead of adding fake truth. Do not silence missing-source rows without a source model decision.
