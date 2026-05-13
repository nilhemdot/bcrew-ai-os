# CONNECTOR-CREDENTIAL-001 Plan

## What

Create a no-secret connector credential and preflight registry that shows which provider/account credential classes exist, which source or workload they unlock, last probe status, owner, blocker reason, and whether the connector is safe to use.

## Why

Connector matrices answer what is missing, but not whether the system has the credential class needed to connect. The operator value is that future source work starts from known credential/preflight truth without copying secrets into docs or chat.

## Acceptance Criteria

- `CONNECTOR-CREDENTIAL-001` gets a Plan Critic pass score at or above 9.8; revise blocks Sprint Ready.
- Registry stores metadata only: source ID, connector key, provider, credential class, env var names or secret reference names, owner, status, last probe timestamp, blocker reason, and unlocked workload.
- No raw secret values are written to tracked docs, API payloads, logs, verifier output, or Plan Critic rows.
- Registry covers at least FUB, KPI Supabase, Google delegated Drive/Gmail/Sheets, ClickUp, Slack, Missive, LLM routes, Apify/Loom/YouTube candidate class, Skool future access, Real, SocialPilot, GA/GSC/GBP, and Telegram/WhatsApp candidate class.
- The proof command `npm run process:connector-credential-check -- --json` uses synthetic secret sentinels and proves they are redacted or absent.
- Connector matrix can consume registry status or at least link to its connector keys.

## Definition Of Done

- A reusable library exposes connector credential/preflight snapshot data.
- A focused proof verifies required fields, no-secret output, known connector coverage, and blocked/missing statuses.
- Foundation can show or consume connector readiness without exposing credentials.

## Details

Reuse existing code in source contracts, connector matrix, Google delegated health, LLM route tables, and env-reference patterns. Reuse existing docs in source notes and the connector/routing handoffs. Reuse existing scripts where safe health probes already exist, plus live backlog and Current Sprint truth. Add only metadata and probe-status representation in V1; do not run new external auth flows unless an existing safe health probe already exists.

The behavior proof uses actual registry builder function paths, synthetic secret fixtures, known connector rows, and a round-trip over the generated registry snapshot. It rejects weak marker-only proof and proves no raw secret output. Gate decision tree: static, focused, or full is chosen by blast radius; metadata-only library work can use focused proof, but server/source-surface changes require full `process:foundation-ship`.

This unlocks a real workflow for Steve and the team: faster and higher-quality connector decisions because missing credentials, blocked auth, and safe probes are visible without asking Steve to re-send secrets. The V1 is thin and proportional, with a fast focused no-secret proof expected to run in under 2 minutes before any full ship gate.

## Risks

- Risk: leaking secrets. Mitigation: never read or output secret values; use env var names and secret references only.
- Risk: treating credential presence as business trust. Mitigation: statuses distinguish credential, connector, source contract, extraction, atom, and routing.
- Risk: expanding into connector repair. Mitigation: repair is not in V1.
- Repair path: fail closed, remove unsafe fields, reopen `CONNECTOR-CREDENTIAL-001`, and keep connector repair cards scoped separately if proof finds blockers.

## Tests

- `npm run process:connector-credential-check -- --json`
- Synthetic no-secret sentinel proof
- Optional live-safe probe readbacks where existing health checks already exist
- `npm run process:foundation-ship -- --card=CONNECTOR-CREDENTIAL-001 --planApprovalRef=docs/process/approvals/CONNECTOR-CREDENTIAL-001.json --closeoutKey=connector-credential-v1 --commitRef=HEAD`

## Not Next

Do not rotate credentials, copy secrets, create new provider accounts, fix Google Ads auth, implement SocialPilot/Real/Skool/Mycro extraction, MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, or broaden public access.
