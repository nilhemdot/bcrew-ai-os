# EXTRACTOR-BRAIN-FLEET-PROOF-001 Plan

## What

Run the first governed extractor proof through Brain Fleet without starting fresh source/runtime extraction.

V1 uses the existing approved public YouTube transcript artifact `SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys` (`The AI Team Setup Nobody Talks About`) because it is already archived under `SRC-YOUTUBE-INTEL-001`, has the Steve manual-priority marker, and records the transcript capture method. The proof records Brain Fleet ledger truth, persists a proof report artifact, creates idempotent intelligence atoms and atom hits, stores training notes/summary, stores Build Intel review-route items, applies duplicate/staleness guards, and logs skipped/error reasons.

Provider execution is skipped for this deterministic proof and recorded as a stop condition. This card does not fetch transcripts, crawl YouTube, call models, run Skool/MyICOR/Loom, or write externally.

## Why

Foundation needs one end-to-end governed extractor proof before fresh public YouTube runtime work or paid/private extraction. Steve needs to see that an approved source item can move through ledger, artifact, provenance, atom, review, guard, and stop-condition controls without breaking Foundation health or turning extraction into hidden side effects.

## Operator Value

Useful operator behavior: Steve can open the closeout and see exactly which source item was used, which Brain Fleet route/account/model was ledgered, what artifact and atoms were persisted, which review routes need human review, what was skipped, and why the proof did not mutate credentials or write outside local Foundation truth. This unlocks the real workflow of approving one public YouTube runtime item from visible proof instead of trusting a builder chat claim.

## Root Invariant

Root invariant: an extractor proof is only green when the approved source artifact, Brain Fleet ledger row, persisted proof artifact, atoms, atom hits, review routes, training notes, dedup/staleness guard, and skipped/error reasons all exist as actual local Foundation truth and agree with each other. The check must prove that invariant through the actual function path, DB rows, closeout artifact, live backlog/current-sprint truth, and synthetic failing cases; it must not silence, suppress, or bypass a stale active-sprint/check symptom.

## Acceptance Criteria

- The focused proof selects only `SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys`.
- The source item validates exact source ID, artifact type, title, URL, content length, Steve manual-priority marker, transcript capture method, and freshness window.
- Brain Fleet ledger truth records workload, route, model, account label, status, artifact refs, quota/reset posture, failure reason, and stop condition.
- Provider execution is explicitly skipped for deterministic proof; the skipped status is visible and not classified away.
- A proof report artifact is persisted in `intelligence_report_artifacts`.
- At least three intelligence atoms and atom hits are persisted with source/artifact/report provenance and stable dedup hashes.
- Training notes and summary are stored in the proof report artifact.
- Build Intel review-route items are stored as action-required items in the proof artifact and remain proposal-only.
- Duplicate/staleness guard proves stable atom dedup hashes, unique review route IDs, and a stale-after date.
- Skool, MyICOR, Loom, private video, paid course, and authorized browser paths remain skipped until exact source approvals.
- Dogfood rejects missing source, stale source, private source, OpenClaw-only route selection, raw transcript leakage, and direct downstream writes.
- Current Sprint advances to `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001` only after raw-green gates pass.

## Definition Of Done

Done means `EXTRACTOR-BRAIN-FLEET-PROOF-001` is live `done`, closeout key `extractor-brain-fleet-proof-v1` is registered, Current Sprint active blocker is `YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001`, and Foundation ship gates pass raw green.

Command-proven done requires:

- `node --check lib/extractor-brain-fleet-proof.js scripts/process-extractor-brain-fleet-proof-check.mjs`
- `npm run process:extractor-brain-fleet-proof-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=EXTRACTOR-BRAIN-FLEET-PROOF-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-BRAIN-FLEET-PROOF-001.json --closeoutKey=extractor-brain-fleet-proof-v1 --commitRef=HEAD`

## Details

Reuse existing shipped work:

- `BRAIN-FLEET-QUOTA-LEDGER-001` for `llm_calls` ledger truth.
- `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001` and OpenClaw adapter boundary route truth.
- `BUILD-INTEL-EXTRACTION-IMPLEMENTATION` for deterministic public transcript observation extraction.
- `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001` for proposal-only Build Intel review items.
- `intelligence_report_artifacts`, `intelligence_atoms`, and `intelligence_atom_hits` for persisted local proof rows.

Implementation files:

- `lib/extractor-brain-fleet-proof.js`
- `scripts/process-extractor-brain-fleet-proof-check.mjs`
- `docs/process/extractor-brain-fleet-proof-001-plan.md`
- `docs/process/approvals/EXTRACTOR-BRAIN-FLEET-PROOF-001.json`
- `docs/_archive/handoffs/2026-05-20-extractor-brain-fleet-proof-closeout.md`
- `lib/foundation-build-closeout-model-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `scripts/foundation-verify.mjs`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

Behavior proof is actual function and process path, not substring proof: `buildExtractorBrainFleetProofSnapshot()` validates the selected source item, builds Build Intel observations/review routes through existing modules, creates ledger-ready records, creates atom/report write sets, applies dedup/staleness guards, and exposes skipped reasons. `process:extractor-brain-fleet-proof-check -- --close-card --json` writes the Brain Fleet ledger row, proof report artifact, atoms, atom hits, Plan Critic row, backlog state, and Current Sprint overlay through existing stores.

## Risks

- Risk: the proof looks green while provider execution silently ran. Mitigation: no provider call path exists in the module, ledger status is `skipped`, stop condition is `provider_execution_disabled_for_proof`, and dogfood checks the boundary.
- Risk: OpenClaw becomes the extractor architecture by default. Mitigation: v1 requires a non-OpenClaw extraction route for the deterministic proof; OpenClaw remains adapter-only.
- Risk: stale or unapproved source content becomes accepted doctrine. Mitigation: exact source validation, freshness guard, detected-only atom status, Build Intel review routes, and proposal-only downstream posture.
- Risk: Build Intel review routes become automatic backlog/action writes. Mitigation: review route items are action-required proof items only, with `proposalOnly: true`, no backlog/atom/KB/external writes, and human review required.
- Risk: Skool/MyICOR/Loom bleed into this card. Mitigation: skipped reasons explicitly log that those paid/private source paths remain blocked until exact approvals.
- Rollback/repair: if proof rows are wrong, rerun the focused check after repairing the module. Atom/report writes are stable/idempotent; do not delete source archives or mutate credentials to make the proof green.

## Tests

Gate decision tree: full.

Static proof is `node --check`. Focused proof writes local Foundation proof rows only under `--close-card` and verifies them. Final proof is full `process:foundation-ship` because this card touches live DB rows, Current Sprint, backlog state, closeout registry, verifier coverage, and current plan/state truth.

The focused proof is bounded and should stay under 2 minutes in normal local DB conditions; heavy raw-green gates still run sequentially after close-card because correctness matters more than parallel speed. Do not run DB-heavy Foundation checks in parallel.
