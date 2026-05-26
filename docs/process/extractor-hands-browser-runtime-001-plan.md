# EXTRACTOR-HANDS-BROWSER-RUNTIME-001 Plan

## What

Build the governed browser Hands layer for God Mode extractors.

Plain English: if Steve approves a source packet, the extractor must be able to use a browser like a careful human inside that packet: open the page, inspect what is visible, click/navigate only when allowed, capture evidence, and stop before it crosses auth, payment, form, download, or private-content boundaries.

## Why

The current public YouTube lane has strong video/audio/visual extraction, but that is not enough for Skool, MyICOR, public resource pages, GitHub/docs, sales pages, or communities. A no-click page read cannot become God Mode for sources that require Hands. The missing layer is not another plan or UI label; it is a controlled browser runtime with source-packet permissions and proof.

## Runtime Doctrine

- Local Playwright first.
- No Browserbase, hosted browser spend, or new paid browser service unless local reliability fails and Steve explicitly approves that fallback.
- Source packet approval defines the exact source boundary.
- All browser actions must stay inside source-packet boundaries.
- Approval does not start a worker by itself.
- The worker may only perform the actions explicitly allowed by the packet.
- Every useful claim must preserve source URL, artifact ID, timestamp/capture time, page title/hash where available, and stop reason.
- Discovered links become new source-packet candidates instead of being followed automatically.

## V1 Scope

Start with public/free exact source packets:

- approved public web pages
- approved public sales/offer pages
- approved public GitHub/docs/resource links

V1 may open and read an exact approved URL. It may collect visible text, title/meta, headings, safe links, and page evidence. It must not log in, submit forms, download files, purchase, opt in, mutate credentials, write external systems, create backlog cards, or follow adjacent links.

Clicks/navigation are part of the full Hands contract, but V1 only enables them when a packet explicitly names the selector/action, allowed next URL pattern, stop condition, and evidence target. Otherwise V1 is exact URL only.

## Acceptance Criteria

- A Hands runtime contract exists with allowed actions, forbidden actions, source-packet preconditions, stop reasons, artifact schema, and proof rules.
- The system can explain whether a source packet is:
  - `exact_public_read_ready`
  - `click_navigation_requires_packet_detail`
  - `auth_session_required`
  - `paid_or_private_blocked`
  - `purchase_or_form_blocked`
  - `unsupported_until_source_specific_runner`
- The parity gate cannot label a source family God Mode unless the family has source-appropriate Hands status.
- Skool/MyICOR remain blocked until Steve approves exact source-specific packet/session/content boundaries.
- YouTube comments stay operator-excluded and are not a Hands dependency.
- Focused proof rejects broad crawling, missing source packet, unbounded clicks, auth/session access, downloads, forms, purchases, external writes, and backlog mutation.

## Definition Of Done

- Add the Hands runtime contract and status mapping.
- Build the public exact-source runner first through `SOURCE-PACKET-WORKER-RUNNER-001`.
- Persist worker evidence into Foundation artifact/report truth.
- Surface Hands status in Dev/Foundation source views.
- Update God Mode parity proof so false Hands claims fail closed.

## Proof

Use the worker proof as the first executable proof:

```bash
npm run process:source-packet-worker-runner-check -- --json
```

Existing exact-public runtime proof:

```bash
npm run process:source-packet-public-web-runtime-check -- --json
```

## Not Next

- Do not open Skool, MyICOR, paid communities, private/member sources, or logged-in sessions from this card.
- Do not submit forms, buy, download, opt in, post, comment, message, or write externally.
- Do not auto-create backlog cards from extracted content.
- Do not treat a public exact-page read as full Hands for sources that require clicking/navigation.
- Do not use hosted browser tools before local Playwright is proven insufficient and Steve approves the fallback.
