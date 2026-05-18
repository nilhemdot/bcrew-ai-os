# Harlan Operator Loop

Status: Contract v1
Last reviewed: 2026-05-18
Primary backlog: `HARLAN-OPERATOR-LOOP-V1-001`

This is Harlan's first useful Foundation operator loop.

It is a read-only, source-backed answer contract. It is not a live Harlan runtime launch, UI, voice/avatar feature, provider/model call, extraction run, external send, or write surface.

## Contract V1

Closeout: `harlan-operator-loop-v1`

Harlan's operator read must answer:

- what is true right now
- what changed
- what is broken
- what is blocked
- who owns it
- what happens next

Every section must cite declared source inputs. Current claims require fresh evidence stamps.

## Required Sources

| Input | Source |
| --- | --- |
| `current-sprint` | `/api/foundation/current-sprint` |
| `build-log` | `/api/foundation/build-log` |
| `system-health` | `/api/foundation-hub?view=full` |
| `nightly-audit` | Foundation Hub audit surface |
| `build-lane-telemetry` | Foundation Hub build-lane telemetry |
| `backlog` | Foundation Hub backlog rows |
| `source-action-routes` | Foundation Hub Action Router/source route truth |

## Fail-Closed Rules

- Memory is last-known context only, not current proof.
- Missing or stale source input blocks current wording.
- Missing section source refs block the answer.
- External writes, sends, extraction, provider/model calls, Drive mutation, and hidden workers require approval and are disabled here.
- If a required source is unavailable, the answer must say blocked or last-known.

## Not Done

This does not implement Harlan's runtime, private profile storage, UI, Telegram behavior, voice, avatar, extraction worker, model route, external Harlan home, or external-write authority.

## Update Trigger

Update this page when `HARLAN-OPERATOR-LOOP-V1-001`, Harlan runtime work, Foundation Hub source surfaces, build-lane telemetry, Action Router, or project reach changes.
