# UI Menu Layout Polish Baseline

Before build: `16cf8ba`

Owned card: `UI-MENU-LAYOUT-POLISH-001`
Closeout key: `ui-menu-layout-polish-v1`

## Baseline Counts

Live `/api/system-inventory` before the build:
- Tracked docs: 211
- Private/local metadata rows: 5
- Current docs after split: 78
- Archive/history docs after split: 133
- Docs deleted: 0

Category snapshot:
- Active doctrine: 15
- Process & runbooks: 22
- Source notes: 14
- Specs: 11
- Strategy reference: 10
- Agent personas: 4
- User profile: 2
- Recent handoffs - active: 7
- Recent audits - active: 7
- Plan history: 4
- Archive: 115
- Local-private: 5

## Before Build Findings

- Default System Inventory current-doc view did not have a separate archive/history route.
- The default docs view mixed current operator docs and preserved evidence.
- Live `foundation1100Review.phaseGReadiness.nextPlanCard` still pointed to `PLAIN-ENGLISH-SWEEP-001`.
- `UI-MENU-LAYOUT-POLISH-001` was scoped/P1, not done.

## Split Target

Current docs:
- `Active doctrine`
- `Process & runbooks`
- `Source notes`
- `Specs`
- `Strategy reference`
- `Agent personas`
- `User profile`

Archive/history docs:
- `Archive`
- `Plan history`
- `Recent audits - active`
- `Recent handoffs - active`
- `docs/_archive/**`
- `docs/rebuild/plan-history/**`
- retired, superseded, history, or archive paths

Private/local docs stay metadata-only. No private content, quotes, summaries, or raw tokens are part of this proof.

## Required Routes

- `/foundation#current-state`
- `/foundation#systems`
- `/foundation#backlog`
- `/foundation#build-log`
- `/foundation#system-health`
- `/foundation#source-overview`
- `/foundation#source-docs`
- `/foundation#source-sheets`
- `/foundation#source-apis`
- `/foundation#source-connectors`
- `/foundation#inventory-docs`
- `/foundation#inventory-archive-history`
- `/foundation#capabilities-skills`
- `/foundation#capabilities-plugins`
- `/foundation#capabilities-agents`
