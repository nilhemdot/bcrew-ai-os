# UI Menu Layout Polish Manual Review

Date: 2026-04-30
Card: `UI-MENU-LAYOUT-POLISH-001`
Closeout key: `ui-menu-layout-polish-v1`

Manual review method:
- Served changed worktree locally at `http://localhost:3001`.
- Generated headless Chrome screenshots for every required route and viewport under `/tmp/ui-menu-layout-polish-screens/`.
- Ran Chrome DevTools Protocol checks for every route at desktop `1440x900` and mobile `390x844`.
- Screenshots are inspection evidence only and are not stored in the repo.

Criteria checked on each route and viewport:
- no horizontal overflow
- no overlapping text
- mobile nav usable
- active route visible
- target route reachable by hash
- current truth / next card visible without digging
- cards and panels are not awkwardly nested

Additional browser metrics:
- Desktop viewport: `documentElement.clientWidth = 1440`; `scrollWidth = 1440` on every required route.
- Mobile viewport: `documentElement.clientWidth = 390`; `scrollWidth = 390` on every required route.
- Mobile nav toggle display: `flex` on every required route.
- Active route text present on every required route.
- Live final split after proof artifacts were added: 79 current docs, 135 archive/history docs, 5 private/local metadata rows, and 0 current/archive leaks.

Failures: 0

| Route | Viewport | Status | Notes |
| --- | --- | --- | --- |
| /foundation#current-state | desktop 1440x900 | pass | Current truth panel shows `RECENT-BUILDS-BILLION-DOLLAR-UI-001`; no horizontal overflow. |
| /foundation#systems | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#backlog | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#build-log | desktop 1440x900 | pass | Route hash reached and active nav visible; no Recent Work redesign inspected beyond unchanged reachability. |
| /foundation#system-health | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#source-overview | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#source-docs | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#source-sheets | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#source-apis | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#source-connectors | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#inventory-docs | desktop 1440x900 | pass | Default Current Docs view shows current docs and archive/history docs preserved separately; live final split is 79 current and 135 archive/history after proof artifacts. |
| /foundation#inventory-archive-history | desktop 1440x900 | pass | Archive / History route shows preserved evidence and is not mixed into the default current-doc lane. |
| /foundation#capabilities-skills | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#capabilities-plugins | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#capabilities-agents | desktop 1440x900 | pass | Route hash reached and active nav visible. |
| /foundation#current-state | mobile 390x844 | pass | Current truth panel appears near top; mobile nav toggle visible; no horizontal overflow. |
| /foundation#systems | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#backlog | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#build-log | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#system-health | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#source-overview | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#source-docs | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#source-sheets | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#source-apis | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#source-connectors | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#inventory-docs | mobile 390x844 | pass | Current Docs route reachable by hash; no horizontal overflow; private/local docs remain metadata-only. |
| /foundation#inventory-archive-history | mobile 390x844 | pass | Archive / History route reachable by hash; preserved history shown separately. |
| /foundation#capabilities-skills | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#capabilities-plugins | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |
| /foundation#capabilities-agents | mobile 390x844 | pass | Route hash reached; mobile nav toggle visible; no horizontal overflow. |

Known limits:
- This is route/viewport manual visual proof plus browser overflow metrics, not a persistent screenshot archive.
- This card does not redesign Recent Work, changelog, daily summary, source lifecycle, Strategy, Scoper, Agent Factory, corpus, research, or action-review workflows.
