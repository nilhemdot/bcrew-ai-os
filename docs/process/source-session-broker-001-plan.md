# SOURCE-SESSION-BROKER-001 Plan

## What

Build the closed-loop source session broker for God Mode extractors.

Plain English: when an approved source needs an account, the extractor should not stop and wait for Steve to babysit it. It should try the existing isolated browser profile first, use the approved credential reference from macOS Keychain when allowed, handle source-specific login recipes, emit `auth_needed` when MFA or human verification blocks it, wait for the human-agent DONE signal, silently reverify, then resume or fail closed.

## Steve Requirement Locked

- Free/public source work should mostly just go once the source policy says it is safe.
- Free source identity defaults to `ai@bensoncrew.ca`; `crewbert@bensoncrew.ca` is fallback when a named operator identity is needed.
- Paid courses and communities should use approved paid accounts or accounts Steve moves to the AIOS source identity.
- Steve should not have to be present every time the system logs in.
- If MFA, a login challenge, a verification email, or a source-specific blocker appears, the system messages Steve through the human-agent auth flow, waits briefly, then resumes only after reverify passes.
- If the human does not clear the blocker, the job fails closed with an auth-needed artifact instead of guessing.
- Future team-member agents can use the same pattern for team-authorized systems, but high-risk actions need a separate action policy.

## Gold Standard Flow

1. Receive an approved source packet or standing-approved free-source policy.
2. Pick the source identity:
   - `ai@bensoncrew.ca` for default free/source intake
   - `crewbert@bensoncrew.ca` only where a named operator identity is needed
   - approved paid account for paid platforms
   - per-human delegated account for future team-member agents
3. Try the existing isolated browser profile for that source/account.
4. If the session is healthy, run the bounded source worker.
5. If the source offers a native read-only connector/MCP, prefer that over browser navigation after the connector scope is approved.
6. If the profile is not healthy and a login recipe exists, use the macOS Keychain secretRef inside the local broker only.
7. If login hits MFA, challenge, verification, missing credential, missing login recipe, or expired session, emit `auth_needed`.
8. Human-agent loop notifies Steve, waits for DONE, silently reverifies the session, then resumes or fails closed.
9. Every run records status, artifact ref, source/account labels, stop reason, and raw-secret-hidden posture.

## MyICOR Route

MyICOR/myICOR is one paid course/training platform instance, not its own source family.

Steve surfaced a likely better route than browser-only extraction: MyICOR says an AI can connect through its MCP and get read-only access across the library. If that is available, the source broker should prefer the native read-only connector/MCP first because it is cleaner, easier to cite, and likely covers more material than page navigation.

This means native read-only connector/MCP first, browser Hands second, and Google OAuth sign-in through the existing paid account if the connector cannot answer the job.

MyICOR paid account auth rule from Steve on 2026-05-26:

- MyICOR is Google OAuth sign-in, not a separate MyICOR password login.
- Correct entry points are `https://myicor.com/` Sign in / Log in and `https://app.myicor.com/login`.
- Do not use Start Free, signup, or onboarding for the paid-account path.
- Do not ask for or vault a MyICOR password unless Steve later confirms MyICOR has a separate password login.
- If an existing MyICOR browser session redirects to onboarding, clear only the bad MyICOR session state or use a clean source profile, then retry the Google sign-in path.

Expected MyICOR read-only MCP scope from Steve's note:

- lessons
- articles
- podcast transcripts
- Tool Stack
- Growth Assignment progress
- Workstreams
- citations for everything pulled

The short version: lessons, articles, podcast transcripts, Tool Stack, Growth Assignment progress, and Workstreams should be available through the approved read-only route if MyICOR's MCP works as described.

Required boundary before using it:

- exact MyICOR connector source packet
- approved account/session identity
- read-only scope only
- citation and storage rules
- no write scopes
- no purchase/account/profile mutation
- browser Hands fallback only for gaps the connector cannot answer

## Broker Contract

The broker owns:

- source identity selection
- isolated browser profile path
- macOS Keychain secretRef metadata
- broker-only raw secret retrieval
- source-specific login recipes
- native read-only connector/MCP preference when available
- auth-needed event creation
- wait/resume/fail-closed state
- local-only auth artifacts
- no-secret logging

The extractor owns:

- source packet
- allowed pages/areas
- read/watch/click/extract behavior
- evidence artifacts
- downstream atoms/hits/Director input

The action policy owns:

- purchases
- stock trading
- banking
- external sends
- posting/commenting/messaging
- profile/account changes

Those are not normal source-session actions.

## Source Policies

### Public/Free Resources

- Standing-approved when classified as public/free.
- Read public pages, repos, docs, and safe resources.
- Stop on login, private area, paid gate, purchase, unexpected form, or unsafe download.

### Creator Newsletters

- Standing-approved after linked to an approved creator/source and classified free/no-purchase.
- Use `ai@bensoncrew.ca` by default.
- Store generated credentials in macOS Keychain.
- Route issues into `AIOS Sources/Newsletters`.
- Stop on payment, phone/credit-card demand, profile mutation, posting, comments, messages, or unexpected private area.

### Free Skool/Community

- Standing-approved source type after classified free/community and attached to an approved source identity/session boundary.
- Use source identity.
- Inspect allowed free areas only.
- Stop on paid, private/member-only, DM, post, comment, account change, unsafe download, or unapproved form.

### Paid Skool/Private Community

- Requires exact paid/private packet first.
- Use isolated paid Skool profile or approved credential route.
- Stop on purchase, profile mutation, post/comment/DM, unapproved area, unsafe download, or external write.

### Paid Course/Training Platforms

- Requires exact paid platform packet first.
- Prefer native read-only connector/MCP when available and approved.
- Otherwise use isolated paid-course browser profile, or Keychain login recipe if present.
- Stop on purchase, profile mutation, form, unapproved area, unsafe download, external write, or connector write scope.

### Future Team-Member Systems

- Requires per-human authorization and source/action policy.
- Future team-member systems use the same broker shape, but with per-human authorization instead of Steve's source identity.
- Read or act only inside the user-approved policy.
- Money movement, trading, legal signatures, purchases, and external sends require separate explicit action policies.

## What Is Built In This Slice

- Generic source credential commands in `credentials:vault`:
  - `source:add`
  - `source:status`
  - `source:delete`
- Broker contract module and dogfood proof.
- Paid-source mapper integration:
  - isolated persistent browser profile
  - Keychain login path for MyICOR when a credential exists
  - auth-needed artifact when unattended login/session fails
  - member/profile/purchase/form/download/action blockers
  - local-only artifacts under `.openclaw`
- MyICOR read-only MCP/native connector preference represented in the contract.
- Live backlog and seed truth for `SOURCE-SESSION-BROKER-001`.

## Not Next

- Do not store or print passwords in chat, git, Postgres, logs, reports, or UI.
- Do not create real external accounts from the proof.
- Do not submit live newsletter signups from the proof.
- Do not buy, trade, bank, post, comment, message, mutate profiles, mutate credentials, or send external notifications from the proof.
- Do not broad-crawl paid/private course content.
- Do not treat MyICOR MCP as approved until the exact read-only connector packet is confirmed.
- Do not treat a dry-run Harlan auth-needed artifact as live notification delivery; `HARLAN-AUTH-LIVE-DELIVERY-002` remains the live-delivery continuation.

## Definition Of Done

- Focused proof passes.
- Live backlog card exists.
- Seed backlog card exists.
- Approval file validates.
- Paid-source mapper fails closed with `auth-needed.json` when profile/session/credential/MFA blocks.
- Credential CLI stores source passwords only in macOS Keychain and never prints raw secrets.
- Broker dogfood proves:
  - healthy persistent profile can run
  - MyICOR native read-only MCP is preferred when available and approved
  - MyICOR MCP cannot run without approved read-only scope
  - missing Keychain credential emits auth-needed
  - MFA emits auth-needed instead of success
  - free source identity can create a free-source account only under policy
  - stock trading/money actions are blocked as separate action policies
  - paid/private source without boundary is blocked
  - raw secret is absent from proof output

## Proof Commands

- `node --check lib/source-session-broker.js scripts/process-source-session-broker-check.mjs scripts/run-supervised-paid-source-map.mjs scripts/credentials-vault.mjs`
- `npm run process:source-session-broker-check -- --apply --json`
- `npm run process:source-session-broker-check -- --json`
- `npm run process:credential-vault-session-broker-check -- --json`
- `node scripts/run-supervised-paid-source-map.mjs --source=myicor --unattended --maxPages=2 --maxDepth=1`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
