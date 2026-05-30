# Source Handoff Dedupe And Public Queue Drain Closeout - 2026-05-28

## What Changed

The YouTube source-browser handoff queue now canonicalizes public source URLs before selecting runnable rows.

This fixes duplicate source work such as:

- `https://buildpartner.ai/4cp`
- `https://www.buildpartner.ai/4cp/`
- `https://buildpartner.ai/4cp?utm_source=youtube&session=...`

Those rows now collapse into one source row while preserving every original URL, source video ID, creator, report artifact ID, and disposition as provenance.

The queue also matches existing saved source runs by canonical URL, so a previously saved read is not falsely shown as a fresh runnable row just because the URL differs by `www`, tracking params, trailing slash, or session params.

## Live Run

After the dedupe fix, the live safe public/free queue dropped from 5 runnable rows to 4:

- `https://buildpartner.ai/4cp`
- `https://hostinger.com/web-apps-hosting/claude-code-hosting`
- `https://the-ai-playbook.com/4cp`
- `https://theincubator.xyz/eng/4cp`

Ran:

```bash
npm run source:youtube-handoff -- --json --apply --max-runs=4
```

Result:

- batch `source-god-mode-youtube-handoff:20260528124937`
- 4/4 rows completed healthy
- 13 pages read
- 9 hands events
- evidence persisted to `source-god-mode-youtube-handoff-runs`
- no provider calls
- no forms submitted
- no downloads
- no purchases
- no posts/comments/messages
- no credential mutation
- no Scoper promotion
- no backlog writes

Post-run dry-run:

- `runnableRows: 0`
- `alreadyRunRows: 696`
- `parkedRows: 463`
- `duplicateRows: 75`

## Current Source-Session State

The safe public/read-only part is drained. The remaining work is correctly blocked behind source sessions, source-specific runners, or approval.

Readiness proof:

```bash
npm run process:source-session-readiness-check -- --json
```

Live state:

- status: `waiting_for_credentials_or_sessions`
- prep rows: 276
- free Skool/session rows: 88
- newsletter rows: 16
- non-Skool community runner rows: 4
- paid/auth rows: 168
- missing credentials/session metadata:
  - `skool / ai@bensoncrew.ca`
  - `creator-newsletters / ai@bensoncrew.ca`
  - `myicor-mcp-oauth / myicor-authorized-member`

## Proofs

Passed:

```bash
node --check lib/source-god-mode-youtube-handoff.js
node --check scripts/process-source-god-mode-youtube-handoff-check.mjs
node --check scripts/process-dev-team-hub-v0-check.mjs
npm run process:source-god-mode-youtube-handoff-check -- --json
npm run source:youtube-handoff -- --json --max-runs=5
npm run source:youtube-handoff -- --json --apply --max-runs=4
npm run source:youtube-handoff -- --json --max-runs=5
npm run process:source-session-readiness-check -- --json
npm run process:dev-team-hub-v0-check -- --json
```

## Morning Next

Do not start Scoper first.

Next real unlock is source session setup while Steve is awake:

1. Add or authorize `skool / ai@bensoncrew.ca`.
2. Add or authorize `creator-newsletters / ai@bensoncrew.ca`.
3. Authorize or decide MyICOR MCP OAuth for `myicor-authorized-member`.
4. Rerun `npm run process:source-session-readiness-check -- --json`.
5. Run the first real free-community proof only after the session broker shows a ready row.
6. Keep paid/private/auth extraction parked until Steve approves exact source packets and boundaries.

## 13:06 Continuation Readback

Additional commits pushed after this closeout:

- `13bc829a` - expose source handoff duplicate counts on the Dev page and require the focused proof to keep them visible.
- `ea096cdf` - balance the source-session cluster preview so Skool, newsletter, non-Skool community, and paid/auth clusters can all surface in the bounded preview.

What changed:

- Dev source-browser queue now shows duplicate variants folded instead of hiding canonicalization.
- Source-session cluster preview is phase-balanced instead of using all preview slots on earlier-ranked clusters.
- Dev proof now requires non-Skool community and paid/auth cluster visibility, not only Skool cluster visibility.
- No live signup, auth crawl, purchase, download, post/comment/message, Scoper promotion, or backlog write was added.

Live source/session state after the continuation:

- YouTube safe public/free source-browser queue remains drained.
- Source handoff readback: 1,234 evidence rows, 1,159 queued canonical rows, 75 duplicate variants folded, 696 already read, 463 parked, 0 runnable rows.
- Source-session prep: 276 prep rows, 88 free Skool rows, 16 newsletter rows, 4 non-Skool community runner rows, 168 paid/auth rows, 0 runnable-now rows, 0 raw-secret rows.
- Source-session readiness remains `waiting_for_credentials_or_sessions`.
- Missing credentials/session proofs remain:
  - `skool / ai@bensoncrew.ca`
  - `creator-newsletters / ai@bensoncrew.ca`
  - `myicor-mcp-oauth / myicor-authorized-member`
- myICOR public MCP preflight passed and found MCP server `myicor-mcp` version `1.15.0`; unauthenticated tools/list correctly returns 401 and needs OAuth before extraction.

Freshness repair:

- `gmail-extract-latest` forced run succeeded; 3 archived threads scanned, 0 new candidates.
- `missive-extract-latest` forced run succeeded; 3 archived threads scanned, 0 new candidates.
- `intelligence-synthesis-spine-refresh` forced run succeeded; 129 facts, 8 synthesized items.
- `intelligence-action-router-proposals` forced run succeeded; 2 proposal-only routes created, 0 approved/applied.
- `process:synthesis-router-freshness-trigger-check -- --json` returned live freshness `fresh`.
- Dev Hub active extraction lanes show synthesis-router `live`.

Post-push health:

- `foundation:verify`: 519/519 passed after dashboard and worker restart on `ea096cdf`.
- `process:system-health-nightly-audit-check -- --json`: healthy, 0 risk, 0 watch, 0 scheduled-job risk.
- `backlog:hygiene -- --json`: healthy, 858 cards, 0 findings.
- `process:credential-vault-session-broker-check -- --json`: healthy; raw secret printed false.

Morning talk track update:

- The system is not blocked by public page/source-browser work anymore; that queue is drained.
- The next unlock is not more public crawling. It is source identity/session setup for free Skool, newsletter signup lane, and myICOR MCP OAuth while Steve is awake.
- Non-Skool community rows are now visible as their own runner gap instead of being hidden behind Skool cluster volume.

## 09:13 EDT Scheduled Runtime Update

Closed the remaining safe autopilot gap for public source expansion:

- Added scheduled Foundation job `source-god-mode-youtube-handoff`.
- Schedule: daily 08:15 America/Toronto, after the public YouTube watcher window.
- Command: `npm run source:youtube-handoff -- --apply --json --max-runs=10`.
- Mutation posture: explicit `operational_write` allowlist.
- Allowed work: bounded public/free source-browser reads, repo deep-review reads, and governed source-crawl/report artifact persistence.
- Still forbidden: auth unless Source Session Broker marks the row ready, form submits, newsletter submits, purchases, downloads, posts/comments/messages, credential mutation, normal Chrome profiles, provider calls, Scoper promotion, and backlog writes.

Proofs passed after scheduling:

```bash
node --check lib/foundation-jobs.js
node --check lib/foundation-job-mutation-allowlist.js
node --check scripts/process-source-god-mode-youtube-handoff-check.mjs
npm run process:source-god-mode-youtube-handoff-check -- --json
npm run process:foundation-job-mutation-allowlist-check -- --json
npm run source:youtube-handoff -- --json --max-runs=10
npm run process:dev-team-hub-v0-check -- --json
npm run process:source-session-readiness-check -- --json
npm run foundation:job -- --job=source-god-mode-youtube-handoff --force --actor=codex-overnight-source-handoff-schedule-proof
npm run process:system-health-nightly-audit-check -- --json
```

Live readback after the change:

- Source handoff queue remains drained: 1,234 evidence rows, 1,159 canonical rows, 75 duplicate variants folded, 696 already read, 463 parked, 0 runnable, 0 run commands.
- First scheduled-job ledger proof ran as `job-source-god-mode-youtube-handoff-20260528131358-lfjqws`; it exited `no_runnable_rows` and started no source-browser work.
- System Health initially caught the new job as overdue because it had no prior run; after the ledger proof, System Health returned healthy with 0 scheduled-job risks.
- Dev Hub proof is healthy and still shows 0 public/free rows ready, 463 parked, 24 legacy approval review rows, and 276 source-session prep rows.
- Source-session readiness remains honest blocked-preflight: missing `skool / ai@bensoncrew.ca`, `creator-newsletters / ai@bensoncrew.ca`, and `myicor-mcp-oauth / myicor-authorized-member`.

Morning note: the safe public source expansion loop is now scheduled. If Steve authorizes sessions/credentials while awake, rerun readiness and then let the scheduled handoff drain newly runnable rows instead of manual babysitting.

## 09:20 EDT Morning Wrap Check

Additional audit/readiness sweep before Steve regroup:

- `process:myicor-extraction-preflight-check -- --json` is not green, but it did not touch MyICOR content.
- The useful MyICOR truth still passed inside that proof: source contract exists, connector posture is blocked, approval packet draft is complete, no paid/private auth was used, no course map/content was inspected, no screenshots/transcripts/downloads/model calls/downstream writes happened, and unsafe preflight variants are rejected.
- The failures are process-history drift:
  - approved plan hash no longer matches the current plan snapshot, so this needs Steve/reviewer re-approval before anyone updates approval truth;
  - the focused proof still expects old MyICOR/Skool preflight cards to be present in the active Current Sprint even though the active sprint has rolled forward;
  - Current Sprint overlay metadata is carrying old done-this-sprint items without Plan Critic rows.
- Parked call: do not "fix" the approval hash unattended. That would fabricate approval. Treat this as a historical-proof repair/re-approval item, not as a source extraction blocker.

Morning regroup truth:

- Public YouTube catch-up is complete.
- Safe public/free source-browser queue is drained and now scheduled daily.
- Source-session work is honestly blocked on identity/session setup for Skool, creator newsletters, and MyICOR OAuth.
- Full God Mode is not done until those session lanes run real proofs.
- No paid/private/auth extraction, newsletter signup, forms, downloads, purchases, posts/comments/messages, credential mutation, or Scoper promotion was done while Steve slept.
