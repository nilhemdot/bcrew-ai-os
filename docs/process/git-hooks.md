# Foundation Git Hooks

Plain English: these hooks make Foundation process gates harder to skip during a normal local commit and push.

Install them with:

```sh
npm run process:install-hooks
```

The installer sets:

```sh
git config core.hooksPath .githooks
```

## What The Hooks Do

- `pre-commit` runs lightweight static/syntax checks only on staged protected Foundation files.
- `pre-push` checks whether protected Foundation paths changed and requires a local `process:foundation-ship` proof for the pushed `HEAD`.
- foundation:verify does not run on every tiny commit.
- `npm run process:foundation-ship` remains the canonical full gate.

## Protected Foundation Paths

- `docs/rebuild/**`
- `docs/process/**`
- `docs/audits/**`
- `docs/handoffs/**`
- `lib/foundation-*.js`
- `lib/doctrine-propagation.js`
- `lib/backlog-hygiene.js`
- `lib/process-*.js`
- `scripts/foundation-verify.mjs`
- `scripts/process-*.mjs`
- `scripts/*backlog*.mjs`
- `scripts/*doctrine*.mjs`
- `package.json`
- `public/foundation*.html`
- `public/foundation*.js`
- `public/ops*.html`
- `public/ops*.js`

## Bypass

Git's `--no-verify` bypass exists and cannot be disabled locally. If a push must bypass the hook without `--no-verify`, provide both:

```sh
FOUNDATION_HOOK_BYPASS_REASON="why this cannot wait" \
FOUNDATION_HOOK_BYPASS_CARD="FOLLOW-UP-CARD-001" \
git push
```

The bypass is recorded locally in `.git/foundation-hook-bypass.log`. The follow-up card must exist or be created before the bypass is trusted in closeout.
