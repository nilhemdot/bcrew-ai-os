# Extractor Overnight Run Guard Closeout

Closeout key: `extractor-overnight-run-guard-v1`
Card: `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`
Report artifact: `proof:extractor-overnight-run-guard-001`
Guard policy key: `youtube-godmode-guarded-extraction`

## What Shipped

- Added the governed overnight extraction run envelope for public YouTube God Mode extraction.
- Added quotas for creators, videos, Gemini calls, subscription-brain calls, runtime, estimated tokens, and estimated API cost.
- Added fail-closed checks for private/auth/paid/member/comment/course surfaces, purchases/downloads/opt-ins/forms, credential/profile mutation, external writes, auto backlog promotion, missing artifact namespace, stale active runs, and duplicate recent fingerprints.
- Persisted a morning-review report, proposal-only atoms, and evidence hits into Foundation truth.
- Persisted guard policy/report truth without creating a new source-crawl target; the subscription mini-brain adapter card owns any future runnable target.

## Result

- Status: `healthy`
- Safe pilot max: 5 public videos / 1 creator / 60 minutes
- Stale active runs: 0
- Dogfood cases: 7

## Next

Continue `SUBSCRIPTION-BRAIN-EXTRACTOR-ADAPTER-001` before Mark last-50 or creator latest-20 scale-up.

## Not Next

- Do not run Mark last-50 or broader latest-20 extraction yet.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, Discord, Reddit login-only, comments, members, paid, private, auth-required, or course sources.
- Do not purchase, download, opt in, book, submit forms, send external messages, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from findings.
- Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or Drive permission mutation.

## Proof Commands

- `node --check lib/extractor-overnight-run-guard.js`
- `node --check scripts/process-extractor-overnight-run-guard-check.mjs`
- `npm run process:extractor-overnight-run-guard-check -- --close-card --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run foundation:verify -- --json-summary`
