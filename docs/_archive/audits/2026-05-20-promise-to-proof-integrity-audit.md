# Promise-To-Proof Integrity Audit - 2026-05-20

## Why This Exists

Steve corrected a real sprint-system failure: several cards captured a large product promise, then shipped a V1 contract, preflight, synthetic proof, dry-run, metadata-only slice, or existing-artifact proof and still landed in `done`.

That is not acceptable when the card title/summary reads like operational capability. V1 means first slice, not quiet burial of the rest of the idea.

## Finding

This was not limited to `WEB-GODMODE-001`. The highest-risk pattern was:

1. A strong Steve-intent requirement was captured.
2. The backlog title/summary kept the strong language.
3. The plan narrowed V1 into a guardrail/preflight/contract/synthetic proof.
4. The card closed as done.
5. The remaining real capability was not always promoted loudly enough as a continuation card.

The audit did not mark every done card as broken. Many shipped cards are legitimate cleanup, verifier, route-split, source-contract, UI budget, or health-gate work. The repair targets cards where operational capability was easy to over-read from the title/summary or where Steve-intent capability remained materially unbuilt.

## Confirmed Continuation Cards Opened

The live backlog now includes these P0 continuation cards:

- `PROMISE-TO-PROOF-INTEGRITY-GATE-001`
- `WEB-GODMODE-LIVE-OPERATOR-002`
- `MULTIMODAL-EXTRACTOR-IMPLEMENTATION-002`
- `EXTRACTION-TEAM-LIVE-WORKER-002`
- `EXTRACTOR-BRAIN-FLEET-LIVE-PROOF-002`
- `YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002`
- `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002`
- `SKOOL-LIVE-NAVIGATION-PROOF-002`
- `MYICOR-LIVE-NAVIGATION-PROOF-002`
- `MEETING-VIDEO-LIVE-RECORDING-PROOF-002`
- `DRIVE-WORKER-LIVE-CONTENT-EXTRACTION-002`
- `BRAIN-FLEET-PROVIDER-EXECUTION-PROOF-002`
- `HARLAN-AUTH-LIVE-DELIVERY-002`
- `ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002`
- `RUNTIME-FIRST-JOBS-LIVE-SCHEDULE-PROOF-002`
- `EXTRACTION-TARGET-RETRY-RUNNERS-002`
- `HARLAN-LIVE-OPERATOR-RUNTIME-002`
- `MEETING-VAULT-LIVE-ACL-ENFORCEMENT-002`
- `LLM-ROUTER-LIVE-PROVIDER-BOUNDARY-PROOF-002`
- `CODEX-DIRECT-SCHEDULED-BOUNDARY-PROOF-002`
- `OPENCLAW-LIVE-ADAPTER-PROBE-002`
- `BRAIN-FLEET-QUOTA-RESET-ENFORCEMENT-PROOF-002`
- `FOUNDATION-KB-PERSISTED-PAGE-INDEX-002`
- `EXTRACTION-TO-KB-ATOM-PERSISTENCE-002`
- `BUILD-INTEL-REVIEW-TO-ACTION-PROOF-002`
- `DECISION-ROUTE-LOCK-DOCTRINE-PROOF-002`
- `STRATEGY-OPERATOR-ACTION-CARD-PROMOTION-002`
- `CEO-OPERATOR-INTELLIGENCE-CARDS-002`

## Historical Cards Linked To Continuations

The repair linked 69 historical/source card-to-continuation edges.

The linked families are:

- GOD-mode/browser/multimodal extraction: `WEB-GODMODE-001`, `MULTIMODAL-EXTRACTOR-001`, `COURSE-SOURCE-AUTH-BOUNDARY-001`
- Extraction runtime/team/retry/control: `EXTRACTION-TEAM-001`, `EXTRACT-RETRY-001`, `EXTRACT-RUN-HARDENING-EXECUTION-001`, `EXTRACT-CONTROL-001`, `RUNTIME-FIRST-JOBS-001`
- Brain Fleet/provider/route/quota: `BRAIN-FLEET-FOUNDATION-001`, `BRAIN-FLEET-QUOTA-LEDGER-001`, `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001`, `MODEL-ROUTING-001`, `LLM-ROUTER-001`, `LLM-AUTH-AUDIT-001`, `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001`, `GEMINI-VIDEO-BRAIN-ROUTE-001`, `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`, `OPENCLAW-ADAPTER-BOUNDARY-001`
- YouTube/Build Intel source capture: `YOUTUBE-SCOUT-001`, `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`, `YOUTUBE-BUILD-INTEL-BATCH-001`, `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001`, `BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001`, `BUILD-INTEL-OBSERVATION-EXTRACTOR-001`
- Skool/MyICOR/meeting/Drive live navigation: `SKOOL-WORKER-001`, `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001`, `SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001`, `MYICRO-TRAINING-001`, `MYICOR-EXTRACTION-PREFLIGHT-001`, `MEETING-VIDEO-001`, `DRIVE-WORKER-001`, `DRIVE-CONTENT-001`
- Source-to-action and absorption: `FOUNDATION-KB-COMPILER-V1-001`, `EXTRACTION-TO-KB-ATOM-PIPELINE-001`, `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`, `RESEARCH-INBOX-001`, `ACTION-ROUTE-REVIEW-INBOX-001`, `ACTION-ROUTE-PROMOTION-WORKFLOW-001`
- Decision/strategy/operator intelligence: `DECISION-004`, `DECISION-008`, `STRATEGIC-INTEL-001`, `INTEL-SCOPER-001`, `STRATEGY-001`, `GOV-001`, `CEO-DASHBOARD-PATTERN-001`, `FOUNDATION-OPERATOR-PULSE-001`, `FOUNDATION-SURFACE-UPDATES-001`
- Harlan and Meeting Vault live behavior: `HARLAN-AUTH-ESCALATION-LOOP-001`, `HARLAN-OPERATOR-LOOP-V1-001`, `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001`, `MEETING-VAULT-ACL-001`, `MEETING-VAULT-AUTO-ENFORCEMENT-001`

Some source cards appear under multiple continuations because one V1 slice created more than one real capability gap.

## Prevention Rule

`process:ship-check` now evaluates the target card and closeout. If the closeout looks like a limited V1 capability closeout, it must have an open continuation card referenced in backlog/closeout text.

The gate looks for this combination:

- V1/card-style closeout
- capability promise language such as extractor, browser, video, Skool, MyICOR, YouTube, agent, runtime, Brain Fleet, Harlan, provider, send, notify, action route, KB, or atom
- limitation proof language such as no live, dry-run, preflight, contract-only, kernel/proof, synthetic, metadata-only, proposal-only, read-only, provider skipped, no browser, no extraction, no screenshot/keyframe, no model, no runtime, blocked, or parked

If that combination exists and no open continuation card is referenced, the ship check fails.

The target card itself does not count as the continuation. The closeout must name a separate open card for the remaining product promise.

Process-only cards must stay out of false-red territory. The detector excludes normal cleanup, split, budget, verifier, migration, readiness, preflight, source-maturity, audit, harness, and route-split work unless the card has a named product-capability promise. This keeps the gate useful instead of turning every synthetic verifier dogfood proof red.

## Recovery Build Order

The next build should not restart broad continuous sprinting. Use a feature program with short sprint cards and stop after each proof.

1. Ship the prevention gate first: `PROMISE-TO-PROOF-INTEGRITY-GATE-001`.
2. First product system: `WEB-GODMODE-LIVE-OPERATOR-002`.
3. Keep `WEB-GODMODE-LIVE-OPERATOR-002` scoped to one approved public source first. Prove real browser/session navigation, page text, transcript/description, outbound links/resources, screenshot/keyframe policy, artifact storage, stop controls, and no unauthorized private-source access.
4. Next proof pair: `BRAIN-FLEET-PROVIDER-EXECUTION-PROOF-002` and `EXTRACTOR-BRAIN-FLEET-LIVE-PROOF-002`, only as much as GOD-mode needs to route vision/model work safely.
5. YouTube runtime expansion: `YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002` plus `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002`.
6. Absorption/action closure: `EXTRACTION-TO-KB-ATOM-PERSISTENCE-002`, `BUILD-INTEL-REVIEW-TO-ACTION-PROOF-002`, and `ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002`.
7. Private/community navigation after public proof: `SKOOL-LIVE-NAVIGATION-PROOF-002` and `MYICOR-LIVE-NAVIGATION-PROOF-002`, using exact Steve-approved source packets and auth boundaries.

Continuous overnight runs are not appropriate for this program until the GOD-mode capture, Brain Fleet route, and absorption/action loop each pass at least one bounded proof.

## Proof

Applied repair:

```sh
npm run process:promise-to-proof-integrity-gate-check -- --apply --json
```

Result:

- 4/4 checks passed
- 28 continuation cards exist
- 28 continuation cards remain open
- 69 origin links recorded
- dogfood rejects partial V1 capability without continuation
- retro scan over existing closeout records reports 55 limited-capability closeout references and 0 missing-continuation failures

## Operator Rule

Future Builder closeouts must not use green gates to hide unfinished product capability.

If V1 does not implement the full idea, the closeout must say exactly what is missing and name the next open continuation card.
