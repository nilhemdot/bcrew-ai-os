# Harlan Auth Escalation Loop

Status: Foundation contract
Closeout: `harlan-auth-escalation-loop-v1`

## Purpose

This is the Foundation-owned auth-needed loop for Harlan, Brain Fleet, and extractor jobs.

When a provider, extractor, or Harlan job hits 2FA/auth-needed, the job does not treat the run as incomplete or green. It emits `auth_needed`, records a `blocked-auth` event, prepares a Steve-only Harlan-on-Telegram notification draft, waits for `DONE`, silently re-verifies, and resumes only after the verifier passes.

## V1 Behavior

1. Job emits `auth_needed` with source system, route, account label, blocker, action needed, and artifact ref.
2. Foundation records `blocked-auth`.
3. Harlan prepares the Steve-only notification through the declared Telegram operator lane.
4. Duplicate issue keys are deduped so Steve is not spammed.
5. The job waits for `DONE`.
6. After `DONE`, the job silently re-verifies the auth state.
7. If reverify passes, the job resumes.
8. If `DONE` never arrives or reverify fails, the job fails closed.

## Proof Boundary

The v1 proof is dry-run only. It does not send Telegram, email, Gmail, Slack, ClickUp, Drive, or Agent Feedback messages.

Default operator communications live in Telegram. Email is not part of the default Harlan auth-escalation path unless Steve explicitly approves a separate route.

It does not mutate credentials, OAuth tokens, browser profiles, provider config, `llm_credentials`, or `llm_routes`.

It does not run live provider probes, model calls, paid/private source access, browser automation, broad crawls, or extractor runtime.

## Old-System Evidence

The useful old-system patterns were harvested from:

- `/Users/bensoncrew/bcrew-buddy-reference/scripts/auth-escalate.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/browser-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/scripts/myicor-auth.cjs`
- `/Users/bensoncrew/bcrew-buddy-reference/src/web-extractor.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/src/reply-context.ts`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/auth-escalation-protocol.md`

## Update Trigger

Update this page when Harlan notification delivery, Telegram routing, extractor auth-needed behavior, Brain Fleet provider probes, or source-specific paid/private auth approval changes.
