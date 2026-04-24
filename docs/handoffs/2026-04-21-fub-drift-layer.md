# FUB Drift Layer

Date: `2026-04-21`

## What Went Live

The first governed source-drift slice is now live for FUB lead sources.

Live outputs:

- backend diffing on top of:
  - `fub_lead_source_snapshots`
  - `fub_lead_source_rules`
- drift buckets in the Foundation FUB panel:
  - new names with no rule
  - open classification rows
  - legacy / invalid names still live
  - governed names not seen in the current snapshot
  - stale snapshot age
- change-feed events:
  - `source_drift_detected`
  - `source_drift_cleared`

## Proof

Live change event written:

- entity: `fub_lead_source_snapshots`
- entity id: `owner`
- event: `source_drift_detected`

Example summary:

- `FUB source drift on Support / Owner account: 11 open classifications, 2 legacy / invalid sources, 7 governed sources not seen now`

## Why This Matters

This is the first real move away from:

- manual catching
- terminal-only review
- silent taxonomy drift

It gives Foundation one governed pattern we can reuse on:

- Freedom structure drift
- Owners governed-list drift
- later strategy / decision change visibility

## Still Open

- route drift findings into `Ops Hub -> Deal Review Inbox`
- decide which drift surfaces deserve external notifications versus in-app visibility only
- extend the same pattern to other governed sources
