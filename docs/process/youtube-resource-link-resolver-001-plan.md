# YOUTUBE-RESOURCE-LINK-RESOLVER-001 Plan

## What

Build the governed YouTube resource-link resolver for Build Intel source packets.

Plain English: when a creator video points to code, a GitHub repo, a skill package, docs, a template, or a resource page, the system should investigate the safe approved links and attach the useful result to the source packet. Steve should not have to manually click every link to find the real code or skill being discussed.

## Why

The video itself is only part of the intelligence. Often the implementation gold is in the description links: repos, docs, templates, download pages, Skool posts, Gumroad kits, or community resources.

If the extractor watches the video but ignores those links, Scoper may scope from incomplete evidence. If the system follows every link blindly, it can cross paid, private, login, download, purchase, or opt-in boundaries. This card creates the middle path.

## Acceptance Criteria

- Reads resource links already captured by approved public YouTube extraction.
- Classifies each link by action boundary:
  - safe public docs/repo/page
  - short link needing expansion approval/rules
  - Skool/community/member/login
  - Gumroad/download/purchase/opt-in
  - private/paid/auth source
  - irrelevant/social/profile
- Resolves safe public docs/repo/pages without Steve manually chasing them.
- Does not buy, download, opt in, submit forms, log in, mutate browser profiles, or crawl private/member/paid sources.
- Writes a source-packet summary that Scoper can read: what the link is, what useful implementation detail it adds, and whether it is resolved or blocked.
- Marks any safe public link that was not resolved yet as remaining Scoper work; queued public links are not a build-ready pass and are not Steve homework.
- Preserves source lineage back to video, report artifact, resource URL, classification, and resolver result.
- Emits approval-required items for blocked links with plain-English reason and allowed next decision.
- Keeps all output proposal-only; no backlog cards, sprint work, external writes, or auto approvals.

## Definition Of Done

- Add a resolver contract/check after link classification and before Scoper.
- Prove safe public repo/docs links can be resolved as read-only metadata and summarized into a Scoper-readable packet.
- Prove Skool/Gumroad/download/login/private links are blocked with exact reason.
- Prove Scoper rejects YouTube candidates whose resource links were ignored.
- Expose resolved vs blocked link counts in the Dev Data Pool when the read path is ready.
- Keep live public fetch explicit through `--live-fetch`; default proof uses deterministic fixtures plus live Foundation report readback without surprise internet work.

## Changed Files

- `lib/youtube-resource-link-resolver.js`
- `scripts/process-youtube-resource-link-resolver-check.mjs`
- `docs/process/youtube-resource-link-resolver-001-plan.md`
- `docs/process/approvals/YOUTUBE-RESOURCE-LINK-RESOLVER-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `package.json`

## Not Next

- Do not follow Skool, MyICOR, Gumroad, Calendly, paid, private, login, download, purchase, opt-in, or member links without a source packet approval.
- Do not bypass the existing approval-required link queue.
- Do not create backlog cards automatically from resolved links.
- Do not treat a short link as safe until the resolver can prove the final destination classification.

## Tests

- `node --check lib/youtube-resource-link-resolver.js`
- `node --check scripts/process-youtube-resource-link-resolver-check.mjs`
- `npm run process:youtube-resource-link-resolver-check -- --json`
- Resolver fixture with GitHub/docs links returns `resolved_public_metadata`.
- Resolver fixture with one Skool link returns `blocked_private_or_course_source`.
- Resolver fixture with one Gumroad/download link returns `blocked_purchase_or_checkout` or `blocked_download`.
- Scoper proof rejects a YouTube-derived candidate with missing `resourceLinkDispositions`.
