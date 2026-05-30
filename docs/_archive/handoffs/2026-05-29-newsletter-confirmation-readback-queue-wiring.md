# Newsletter Confirmation Readback Queue Wiring

Closeout key: `newsletter-confirmation-readback-queue-wiring-v1`

## What Changed

The source-session prep queue now shows the newsletter confirmation readback step instead of hiding it as a standalone command.

- Newsletter readiness includes `newsletter-confirmation-readback`.
- The command is:

```bash
npm run newsletter:confirmation-readback -- --url=<newsletter-url> --account=ai@bensoncrew.ca --json
```

- The queue copy now says live signup is not enough; Gmail archive confirmation readback must prove subscribed status before recurring issue extraction.

## Boundary

This does not submit a real signup, click confirmation links, mutate Gmail, extract newsletter issues, write backlog, or unlock paid/auth work.

## Next

First live newsletter test sequence:

1. Run `newsletter:intake` dry-run.
2. Run a single approved live signup with all required flags.
3. Let Gmail current sync archive the source inbox.
4. Run `newsletter:confirmation-readback`.
5. Only then build recurring issue extraction.
