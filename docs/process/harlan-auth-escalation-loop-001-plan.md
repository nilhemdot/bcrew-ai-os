# HARLAN-AUTH-ESCALATION-LOOP-001 Plan

Closeout key: `harlan-auth-escalation-loop-v1`

## What

Build the Foundation-owned Harlan auth escalation loop that every extractor/Harlan/provider job must use before live paid/private provider probes or extractor proof work can run.

The v1 loop is a dry-run contract and proof. It records `auth_needed`, marks the item `blocked-auth`, prepares a Steve-only Harlan/Telegram/email notification draft, waits for `DONE`, silently re-verifies, resumes only after proof, and fails closed on timeout or failed reverify.

## Why

The old BCrew-Buddy system had useful auth behavior spread across scripts and runtime code, but it was not a Foundation-owned contract. Brain Fleet and extractor readiness need the useful parts harvested before live provider probes, paid/private course access, Skool/MyICOR work, or overnight extraction scale.

Operator value: Steve gets one predictable auth-needed workflow instead of provider/extractor jobs silently failing, retrying forever, or spamming him. This unlocks safer Brain Fleet route probes and later extractor proof while keeping Strategy and People parked.

## Acceptance Criteria

- `HARLAN-AUTH-ESCALATION-LOOP-001` has a 9.8+ Plan Critic row and approval file.
- The focused proof calls the real module function path for `evaluateHarlanAuthEscalationLoop()` and `buildHarlanAuthEscalationLoopDogfoodProof()`.
- The proof dogfoods real behavior branches: auth-needed blocked-auth, duplicate dedup, timeout fail-closed, DONE/reverify/resume, no credential mutation, and unsafe external-send rejection.
- The proof reads the named old-system source files and verifies the harvested behavior signals.
- Current Sprint remains on the May 20 Foundation/Brain Fleet sprint and advances to `BRAIN-FLEET-QUOTA-LEDGER-001` only after close-card proof.
- No substring-only proof is accepted; string/source checks are supporting source-harvest evidence only, while behavior is proven through the module and process proof path.

## Details

Existing code:

- `/Users/bensoncrew/bcrew-buddy-reference/scripts/auth-escalate.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/browser-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/myicor-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/src/web-extractor.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/src/reply-context.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/auth-escalation-protocol.md`

Existing docs:

- existing Harlan docs and runtime-gate verifier surfaces
- existing Current Sprint/backlog/check write guards

Existing scripts:

- existing `process:foundation-ship`, `foundation:verify`, System Health, repeated-failure, and backlog hygiene gates

Live backlog and Current Sprint truth:

- `HARLAN-AUTH-ESCALATION-LOOP-001` is the active P0 card.
- `BRAIN-FLEET-QUOTA-LEDGER-001` is the next card after closeout.

Build steps:

- Add `lib/harlan-auth-escalation-loop.js` with the event contract, notification contract, dedup policy, wait/DONE/reverify policy, timeout policy, old-system source refs, evaluator, and synthetic dogfood.
- Add `scripts/process-harlan-auth-escalation-loop-check.mjs` as the focused process proof and close-card writer.
- Add `docs/agents/harlan-auth-escalation-loop.md` and link it from `docs/agents/harlan.md`.
- Add approval, closeout, closeout registry, verifier coverage, package script, and Current Sprint/doc truth updates.
- Advance the Current Sprint active blocker to `BRAIN-FLEET-QUOTA-LEDGER-001` only when the close-card proof passes.

## Not Next

- No live Telegram, email, Gmail, Slack, ClickUp, Drive, or Agent Feedback sends from this proof.
- No credential, OAuth token, browser profile, provider config, `llm_credentials`, or `llm_routes` mutation.
- No live provider probes, model calls, paid/private source access, browser automation, broad crawl, or extractor runtime.
- No MEETING-VAULT-ACL-001 Phase B work and no Drive permission mutation.
- No Strategy, People, UI-side lane, or source extraction work.
- No external write and no provider/account workaround that violates terms.

## Risks

- Risk: v1 could drift into a live sender. Mitigation: proof rejects unsafe external-send mode and checks module/script source has no live notification implementation.
- Risk: auth-needed could be treated as green. Mitigation: event contract requires `blocked-auth`, and timeout/reverify failures are `fail_closed`.
- Risk: duplicate issues could spam Steve. Mitigation: dedup issue keys suppress duplicate notification attempts and max escalation count is two.
- Risk: a future extractor could mutate credentials while "fixing" auth. Mitigation: dogfood proves credential state remains unchanged and mutation fixtures fail.
- Repair path: if focused proof, System Health, repeated-failure, backlog hygiene, `foundation:verify`, or `process:foundation-ship` fails, keep the card active, repair the exact failing invariant, and do not advance to quota ledger.

## Tests

The focused proof must simulate and fail closed for:

- `auth_needed` turns into `blocked-auth`
- duplicate auth-needed issue is deduped and does not spam Steve
- timeout becomes `fail_closed`
- `DONE` triggers silent reverify and only then resumes
- credential state remains unchanged
- unsafe live external-send mode is rejected
- missing old-system source refs, missing `DONE`, or missing reverify are rejected

Gate decision tree: this is a P0 Foundation runtime/governance card with backlog, Current Sprint, verifier coverage, and closeout surfaces, so it needs static syntax checks, the focused process proof, and full ship gates. The focused gate stays proportional and fast, under 2 minutes by default, while `process:foundation-ship` runs the full served-code and verifier path.

## Proof Commands

```bash
node --check lib/harlan-auth-escalation-loop.js scripts/process-harlan-auth-escalation-loop-check.mjs lib/foundation-runtime-reliability-verifier.js scripts/foundation-verify.mjs
npm run process:harlan-auth-escalation-loop-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=HARLAN-AUTH-ESCALATION-LOOP-001 --planApprovalRef=docs/process/approvals/HARLAN-AUTH-ESCALATION-LOOP-001.json --closeoutKey=harlan-auth-escalation-loop-v1 --commitRef=HEAD
```

## Definition Of Done

- old-system source harvest is cited and verified
- Harlan auth escalation contract and dry-run proof pass
- live backlog row and Current Sprint truth are reconciled
- closeout registry and verifier coverage include the card
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` are green
- main is clean and pushed before the next card proceeds
