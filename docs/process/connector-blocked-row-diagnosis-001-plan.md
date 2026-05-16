# CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001 Plan

Card: `CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001`
Sprint: `connector-blocked-row-diagnosis-2026-05-16`
Closeout key: `connector-blocked-row-diagnosis-v1`

## What

Diagnose and repair the remaining system-health connector watch row without touching credentials, OAuth, external source systems, or hub features.

The current blocked connector group is `google-workspace`. The underlying row is `google-delegated-calendar`: credentials are present and readable, but Calendar is not scheduled as an atom-producing source. That is a non-blocking readiness note, not a credential outage. The fix is to keep that note visible while stopping it from poisoning the whole Google Workspace connector group.

## Why

Steve should never have to ask which hidden count is making Foundation yellow. Health surfaces must name the exact connector, the reason, and the next action. They must also distinguish real credential/auth blockers from accepted manual or future-source posture.

Operator value: Steve gets a useful product behavior, not just a green check. The Foundation health report tells him whether Google Workspace is actually usable for hubs, what is blocked if anything is blocked, and what to do next without querying JSON by hand. This unlocks faster hub decisions with better source-health quality.

## Acceptance Criteria

- Google Workspace no longer reports `blocked` solely because Google Calendar is readable but not atom-producing yet.
- The credential registry keeps the Calendar note visible as non-blocking metadata.
- If a connector group is truly blocked in the future, system health names the blocked connector row and plain-English reason instead of only reporting a count.
- The generated `docs/handoffs/system-health-2026-05-16.*` report has no hidden connector blocked count.
- No credentials, OAuth scopes, external source data, hub features, or paid-source auth are changed.

## Definition Of Done

- `CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001` is moved through Sprint Ready, Building Now, and Done This Sprint with Plan Critic proof and closeout.
- Plan Critic score is `9.8+` before build proceeds.
- Focused dogfood proves both sides:
  - current Google Workspace health is not blocked by the non-blocking Calendar readiness note;
  - a synthetic blocked connector still creates a named system-health finding with the connector label and reason.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse:

- `lib/connector-credential-registry.js`
- `lib/connector-uptime-monitor.js`
- `lib/foundation-system-health.js`
- `scripts/process-system-health-nightly-audit-check.mjs`

Existing docs to reuse:

- `docs/handoffs/system-health-2026-05-16.md`
- `docs/handoffs/system-health-2026-05-16.json`

Existing scripts to reuse:

- `process:system-health-nightly-audit-check`
- `foundation:verify`
- `process:foundation-ship`

Live backlog and Current Sprint truth to reuse:

- `CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001`
- `connector-blocked-row-diagnosis-2026-05-16`

Add the smallest model distinction needed: a credential row can carry a readiness note without being a blocking credential/auth row. Use that for `google-delegated-calendar`; do not generalize future paid/community source blockers into green status.

The proof must exercise real behavior through actual function paths and process paths, not substring-only markers. The focused proof calls `buildConnectorCredentialRegistrySnapshot`, `buildConnectorUptimeSnapshot`, and `buildFoundationSystemHealthSnapshot`, then runs the system-health report process. It should reject weak substring-only proof by requiring the actual connector rows and finding objects to carry the expected statuses, labels, and reasons.

## Risks

- Risk: hiding a real connector blocker by over-broadly reclassifying blocked credentials.
  - Guard: only mark the Calendar readiness note non-blocking; synthetic blocked credentials must still produce blocked connector health.
- Risk: fixing the visible count but leaving future hidden counts.
  - Guard: system-health connector blocked findings must include connector labels and reasons.
- Risk: mutating source/auth state while diagnosing health.
  - Guard: this card is read-only against external systems and local credential values.

## Tests

Gate decision: focused proof first, then full ship gate because the blast radius touches Foundation connector health and system-health rollup. Static checks alone are not enough; `foundation:verify` and `process:foundation-ship` are required.

The focused proof should stay fast and proportional, targeted under 2 minutes, with the full ship gate as the final safety check.

```bash
npm run process:connector-blocked-row-diagnosis-check -- --json
npm run process:system-health-nightly-audit-check -- --json --write-report
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001 --planApprovalRef=docs/process/approvals/CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001.json --closeoutKey=connector-blocked-row-diagnosis-v1 --commitRef=HEAD
```

## Repair Path

If Google Workspace still reports blocked, do not silence system health. Inspect the connector rows and either repair the classification or park the row as an intentional operator-visible manual/auth decision with its own scoped card. If synthetic blocked connectors are not named in findings, fix the system-health finding builder before closing this card.
