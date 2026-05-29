# Source Session Profile Probe Checkpoint

Date: 2026-05-29
Card: `SOURCE-SESSION-BROKER-001`
Closeout: `source-session-profile-probe-v1`

## What Changed

Added a local `source:session-probe` preflight for source-session work. It opens one exact URL in an isolated source browser profile, reads page/auth/browser state, asks the Source Session Broker for the decision, and writes a local-only report.

The probe can now distinguish:

- ready isolated session/profile
- login or credential wall
- MyICOR wrong Start Free/profile-creation branch
- MyICOR Google SSO MFA or human verification
- browser-state blockers

## What It Does Not Do

This is not full Skool/MyICOR extraction. It does not log in, submit credentials, send Harlan live, join communities, sign up for newsletters, buy, download, post, message, mutate profiles, mutate credentials, use Browserbase, or call a model.

## Proof

Focused proof: `npm run process:source-session-profile-probe-check -- --json`

Dogfood fixtures cover a ready free-community page, a login wall, a MyICOR Start Free/profile branch, and a MyICOR MFA number-match page. All paths stay local/proposal-only and produce the correct broker/auth-resume packet shape.

## Next

Use this probe before the first real Skool free-community or MyICOR source-session run. If it returns ready, run the bounded source-specific worker. If it returns auth-needed, use the dry-run Harlan packet and reverify before resuming. If it returns wrong-signup or blocked, clear only the isolated source profile and retry the exact approved login path.
