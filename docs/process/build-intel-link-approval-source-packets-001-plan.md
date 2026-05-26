# BUILD-INTEL-LINK-APPROVAL-SOURCE-PACKETS-001 Plan

## What

Turn approval-required links from YouTube extraction into explicit source packets Steve can approve, hold, or reject.

Plain English: when a video description points to Skool, Gumroad, GitHub, docs, a free community, a paid community, a short link, or a social page, Steve should not have to wonder what "approve" means. The system should show the link, classify it, and record exactly what is allowed next.

## Why

The God Mode extractor is finding useful follow-up links, but a blind approval count is not enough. Some links are free public communities we can read. Some are paid/private communities. Some are purchase/download/opt-in pages. Some are social/noise. The system needs source packets so it can safely hand the right work to the right extractor without crawling too much or forgetting Steve's decision.

## Approval Decisions

V1 decision types:

- `approve_public_free_read`: public/free page or community; no login, no payment, no private/member content.
- `approve_sales_page_review`: public sales/offer page; review positioning, offer, funnel, claims, pricing signals, and CTA structure without submitting forms.
- `approve_free_community_bounded_read`: free/public community source; create an exact community source packet and wait for the right extractor boundary.
- `approve_login_bounded_read`: logged-in source may be valuable, but requires credential/session boundary and exact source rules before worker execution.
- `approve_paid_source_access`: Steve confirms BCrew already bought/has access; create a paid-source packet with exact login/scope rules before any worker runs.
- `park_purchase_candidate`: Steve has not bought it; park it with a value score so good creators can become possible purchases later.
- `hold_paid_private`: paid/private/auth/member/course content; keep parked until source-specific approval.
- `reject_noise`: social/noise/signup/irrelevant link; do not crawl.
- `manual_source_packet`: split ambiguous sources into exact packets, such as Chase AI free Skool versus Chase AI paid Skool.

Target UI flow:

1. Steve clicks a held link row.
2. Steve can choose a decision directly or click "Decide with AI."
3. In chat, Steve can write normal instructions, such as:
   - "free community, follow it and scrape public/free areas"
   - "sales page, review how he sells AI products"
   - "paid community, we bought it, log in and crawl it"
   - "paid community, did not buy it; park as possible purchase if creator keeps scoring high"
4. The AI turns that note into a source-packet preview.
5. The preview must say plainly:
   - what the system will do
   - what it will not do
   - what extractor/worker will eventually use it
   - what runtime lane would handle it after approval
   - what must be true before that runtime is allowed to run
   - whether credentials, purchase, budget, or source-specific approval are still required
6. Steve can approve, adjust the note, or reject.

The AI chat can propose a packet. It cannot crawl, log in, buy, submit forms, start a worker, or write backlog cards from chat alone.

## Acceptance Criteria

- Approval rows include exact URL, host, source video, creator, report artifact, current classification, and proposed decision.
- Steve can review a link and produce a source packet record without triggering a crawl immediately.
- A source packet records:
  - source packet ID
  - exact URL
  - source family
  - source type
  - access boundary
  - allowed actions
  - forbidden actions
  - approved by
  - approved at
  - budget/cadence
  - output destination
  - extractor that may use it
  - runtime plan: local Playwright first, hosted Browserbase/Browse-style fallback only if local reliability fails
  - required preconditions before any future worker run
  - proof that approval does not start the runtime
- Free/public Skool is not treated the same as paid/private Skool.
- Purchase/download/form/opt-in links remain held unless a separate packet says exactly what to do.
- The system never treats "approve link" as permission to crawl adjacent pages, paid spaces, member posts, private comments, downloads, payments, forms, or credentials.
- The Dev page can explain what happens after approval in plain English.
- Focused proof rejects vague approvals, missing source boundaries, paid/private auto-crawl, and crawl-on-approval behavior.

## Definition Of Done

- Add a source-packet evaluator module.
- Add a focused proof script exposed through `package.json`.
- Add a read-only/default mode that classifies current approval links into proposed source packets.
- Add an apply mode only for recording Steve-reviewed packet decisions; apply mode must not crawl.
- Add Dev page copy/actions or a clear source-packet preview so Steve can see what approving means.
- Prove source packets can be used by future workers while the approval action itself stays no-crawl.

## Details

Existing code/docs to reuse:

- `lib/dev-team-hub.js`
- `public/dev.js`
- `public/dev.html`
- `public/dev.css`
- `lib/youtube-resource-link-resolver.js`
- `lib/youtube-latest-20-full-watch-runner.js`
- `docs/process/course-source-auth-boundary-001-plan.md`
- `docs/process/skool-worker-001-plan.md`
- `docs/process/youtube-resource-link-resolver-001-plan.md`
- `docs/process/youtube-god-mode-autonomous-watch-scheduler-001-plan.md`

Correct flow:

`video extraction link -> approval review row -> Steve decision -> source packet -> future worker can run inside packet boundary -> extracted evidence enters Foundation pool`

Incorrect flow:

`video extraction link -> Steve says approve -> crawler starts roaming`

## Risks

- Risk: approval is too broad.
  - Repair path: packet requires exact URL and allowed actions.
- Risk: free and paid communities get blended.
  - Repair path: source packet has access boundary and source type.
- Risk: approval action accidentally starts crawling.
  - Repair path: focused proof rejects crawl-on-approval.
- Risk: too many links create noise.
  - Repair path: queue groups links by source family and creator.

## Tests

```bash
node --check lib/dev-team-hub.js lib/youtube-resource-link-resolver.js
npm run process:dev-team-hub-v0-check -- --json
```

```bash
npm run process:build-intel-link-approval-source-packets-check -- --json
```

V1 implementation note:

- `lib/build-intel-link-approval-source-packets.js` owns the no-crawl source packet preview, runtime plan, and validation rules.
- Every source packet preview includes a no-start runtime plan. The default runtime policy is local Playwright first; hosted Browserbase/Browse-style runtime is only a fallback if local browser reliability fails later.
- `scripts/process-build-intel-link-approval-source-packets-check.mjs` proves live approval links can become source-packet previews without browsing, crawling, writing backlog, or writing external systems.
- Dev Hub approval rows show the plain-English packet consequence and runtime consequence so Steve can tell what approval would do before approving.
- Operator-note parsing supports the future "Decide with AI" flow: Steve can leave a comment and the system maps it to the safest packet type before asking for confirmation.

V1.1 public web runtime note:

- `lib/source-packet-public-web-runtime.js` proves how a confirmed public/sales-page packet can become an exact one-page local browser/read worker run.
- The runtime accepts only approved `approve_public_free_read` or `approve_sales_page_review` packets for public web/GitHub-style sources.
- It does not follow discovered links. It turns them into new source-packet candidates so Steve can approve, hold, or reject them separately.
- It blocks Skool, paid/private/community/course links, broad page limits, auth sessions, downloads, form submissions, external writes, and backlog writes.
- Live Playwright mode exists behind an explicit `allowLive` flag and stays disabled in focused proof; the default proof is synthetic/no-network.
- Focused proof:

```bash
node --env-file-if-exists=.env scripts/process-source-packet-public-web-runtime-check.mjs --json
```

V1.2 approval decision ledger note:

- Source-packet approval decisions are durable records now, not chat residue and not preview-only UI.
- `lib/source-packet-approval-decision-ledger.js` converts Steve approve/hold/reject actions into source-crawl ledger rows under `build-intel-link-approval-source-packet-decisions`.
- The decision ledger target is a manual decision ledger, not a crawler queue.
- Recording a decision may write `source_crawl_targets`/`source_crawl_items` so the decision survives reloads, but it does not start a worker, crawl a link, log in, buy, submit, mutate credentials, write external systems, or create backlog cards.
- Approving a manual/ambiguous source packet fails closed until Steve adjusts the packet.
- Rejecting a link records a `reject_noise` packet so the same link should not keep resurfacing.
- Dev Hub can record approve/hold/reject from the link-review panel; the response explains in plain English that nothing ran.
- Focused proof:

```bash
npm run process:source-packet-approval-decision-ledger-check -- --json
```

## Not Next

- Do not crawl Skool, paid communities, courses, downloads, private/member content, comments, forms, or purchases.
- Do not mutate credentials.
- Do not auto-approve any links.
- Do not start a worker from the approval action.
- Do not auto-create backlog cards from source packets.
