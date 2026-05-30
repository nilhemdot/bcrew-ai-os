# Newsletter Issue Extraction Readback

Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `creator-newsletter-issue-extraction-readback-v1`

The newsletter lane now has the next read-only step after confirmation:

1. `newsletter:intake` detects the signup form and source mailbox packet.
2. approved live signup can submit only through the gated flags.
3. `newsletter:confirmation-readback` proves subscribed/confirmation state from `SRC-GMAIL-001`.
4. `newsletter:issue-extraction` reads confirmed newsletter issue artifacts from the shared Gmail archive and extracts issue rows, implementation ideas, resource links, paid-gate signals, and unsubscribe/park signals.

Command:

```bash
npm run newsletter:issue-extraction -- --url=<newsletter-url> --account=ai@bensoncrew.ca --confirmed --json
```

Boundaries:

- Reads existing shared Gmail archive only.
- Does not click newsletter links, confirmation links, downloads, purchases, forms, or external sites.
- Does not mutate Gmail, credentials, backlog, source stacks, or external systems.
- Does not claim full newsletter automation or full God Mode.

Queue impact:

- Source-session readiness now shows `newsletter-issue-extraction` after confirmation readback.
- The Dev/source page can show the full newsletter chain instead of hiding issue extraction as a standalone command.

Next:

Run this on a real confirmed newsletter source after live signup and confirmation readback, then build source-stack scoring/writeback and downstream public/repo/community handoff from extracted links.
