# Extraction Processing Provenance Hardening

Date: 2026-04-24
Status: evidence

## Why This Exists

After the shared-intelligence router migration, Codex review found two real scheduling blockers:

- extraction metadata could say the requested model (`gpt-5.4-mini`) even when the router actually executed `openai-codex/gpt-5.4`
- the processing ledger marked an artifact processed without tying that result to the artifact's current content hash

That meant daily extraction could quietly skip changed threads or preserve misleading model lineage.

## What Changed

`shared_communication_artifact_processing_runs` now stores:

- `artifact_content_hash`
- `provider`
- `auth_path`
- `route_key`
- actual routed `model`

Shared extraction candidate metadata now stores:

- requested model
- actual model
- provider
- auth path
- route key
- credential key
- LLM call ID
- artifact content hash

The `--onlyWithoutCandidates=true` selector now means:

> no successful processing run exists for this artifact's current content hash and extractor version

It no longer means:

> no active candidate exists

This matters because an old candidate should not block a changed Gmail/Missive thread from being mined again.

## Live Proof

Ran:

```bash
npm run gmail:extract-candidates -- --onlyWithoutCandidates=true --limit=1
```

The run processed:

- `SRC-GMAIL-001:ryanc@bensoncrew.ca:19dc1154e7b31705`

Latest processing row recorded:

- `provider=openclaw`
- `auth_path=chatgpt_subscription_gateway`
- `route_key=foundation-extraction-openclaw-chatgpt`
- `model=openai-codex/gpt-5.4`
- `artifact_content_hash=40906187568a3cbdd0b8903bd107556abc9f8c1e546278b1a1997a330e2f7db9`
- `candidate_count=1`
- `estimated_cost_usd=0`

## Verification

`npm run foundation:verify` passes `26/26`.

New checks:

- shared-comms processing selector is content-hash scoped
- shared-comms extraction records actual LLM route provenance

## Scheduling Status

Do not schedule the daily intelligence bite until this hardening has at least a couple of monitored runs through the same route.

Next:

1. Run 1-2 more bounded `shared-comms-intelligence-bite` proofs.
2. Confirm latest `llm_calls` and processing rows remain subscription-routed with actual provenance.
3. Schedule one daily `shared-comms-intelligence-bite`.
4. Continue Claude Code / Claude Agent SDK adapter work separately.
