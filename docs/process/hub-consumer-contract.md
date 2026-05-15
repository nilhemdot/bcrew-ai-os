# Hub Consumer Contract

Foundation exposes hub data through read-only contracts. Hubs consume those contracts; they do not import Foundation internals, mutate Foundation state, or reach around source-health gates.

## Contract

The current contract is `foundation-hub-consumer-contract.v1`.

Each hub receives:

- `contractVersion`
- `hubKey`
- `readOnly: true`
- `mutationPosture: read_only_contract`
- `payloads.sourceHealth`

`payloads.sourceHealth` is derived from the connector uptime/source health layer and contains only sanitized connector/source status:

- connector group key and label
- health status
- source IDs
- connector IDs
- safe-to-use boolean
- credential status
- sanitized error text

No hub receives raw credentials, raw provider responses, Foundation DB handles, verifier internals, backlog write helpers, or sprint mutation helpers through this contract.

## Hub Mapping

- Sales: FUB, ClickUp, Google Workspace, KPI/Supabase
- Ops: ClickUp, Google Workspace, Missive, KPI/Supabase
- Marketing: Google Workspace, Slack, Missive, KPI/Supabase
- Strategy: ClickUp, FUB, Google Workspace, Slack, Missive, KPI/Supabase

## Forbidden Access

Hub code must not import:

- `lib/foundation-db.js`
- `lib/foundation-*.js`
- `scripts/foundation-verify.mjs`
- `scripts/process-*.mjs`
- verifier/check live-state helpers

Hub chats that need shared files like `server.js`, `lib/security-access.js`, `package.json`, or route registration must stop and return a handoff to the main Foundation session.

## Fixtures

Hub chats may use hub-owned fixtures under `fixtures/hubs/<hub>/` for frontend work while Foundation work is active. Fixtures are not operational truth. They exist so hub UI work can progress without touching Foundation state.

## Acceptance

The contract is valid only when `npm run process:foundation-ready-safe-hub-lane-check -- --json` proves:

- every hub gets a read-only contract
- source health rows come from the uptime/source-health layer or explicit fixtures
- shared-file requests stop for main-session integration review
- no hub sandbox manifest can commit or push shared Foundation edits
