# Old-System Agent Onboarding Harvest

Card: `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001`

Closeout key: `old-system-agent-onboarding-harvest-v1`

## Boundary

This is evidence harvest only. The old BCrew-Buddy system is not active truth, and raw private transcripts/profile content are not promoted into repo truth.

`AGENT-010` owns the new personal-agent onboarding contract.

## Evidence Read

| Source | Lines | SHA-256 | Use |
| --- | ---: | --- | --- |
| `~/bcrew-buddy-reference/docs/plans/bot-onboarding-coaching-plan.md` | 989 | `bb990e8abf92414b01ba858c16478d3f0604403c17f79d45cc865adfc12767e1` | Primary onboarding/coaching design evidence |
| `~/bcrew-buddy-reference/docs/procedures/new-user-onboarding.md` | 74 | `d82b15f6c98abe8e7eca35bb76b0a51cbec58c2752dd84f3ec0d0e0ab028ca4a` | Old onboarding flow evidence |
| `~/bcrew-buddy-reference/docs/procedures/agent-failure-escalation.md` | 79 | `3235019ba9a4a07b6300f62b3cd776f04fbf2431b69a415f049b0fcf4305f691` | Failure escalation pattern |
| `~/bcrew-buddy-reference/docs/agent-inventory.md` | 198 | `baaef085f41e82884dfb01ab9c38a5efa2317d4b5d7f00189edcef878e79d7e0` | Agent/persona inventory evidence |

## Keep

- Show role-specific value before setup or calibration.
- Make first useful read come from live/source-backed context.
- Use a short calibration interview rather than a feature lecture.
- Start personal agents read-only, then move to suggest/draft/approve only after trust is earned.
- Track engagement and pause/escalate non-response instead of sending repeated noise.
- Make failures visible to the owner, with auto-pause or blocked status when repeated failure patterns appear.

## Rebuild

- Calibration questions become part of the new private-profile contract, not scattered bot scripts.
- Daily coaching becomes a commitment loop: morning focus, source cross-check, drift flag, end-of-day review, and pattern learning.
- Feature introduction becomes contextual: introduce a capability only when the person shows the relevant need.
- Communication preference, cadence, and private memory scope become explicit profile fields.
- Old assistant/persona inventory becomes source evidence for `AGENT-010`, not live agent registry truth.

## Retire

- Do not copy the old Telegram token/email setup flow into Foundation truth.
- Do not reuse hardcoded calibration target lists.
- Do not treat old adoption states as current operating truth.
- Do not use feature dumps or naming prompts before value is demonstrated.
- Do not send repeated automated nudges when the person is not engaging.

## Profile Fields For AGENT-010

- core responsibilities
- Attract/Grow/Retain connection
- tools and systems checked
- information friction
- preferred morning value
- role-specific coaching challenge
- communication preference
- privacy and memory scope
- cadence preference

## Calibration Questions For AGENT-010

1. What are your top 3-5 core responsibilities?
2. How does your work connect to Attract, Grow, and Retain?
3. What tools and systems do you check most, and what info do you burn time finding?
4. What would be most useful to get every morning without asking?
5. What is your role-specific coaching or visibility challenge right now?
6. How do you prefer updates: short message, email summary, or voice note?

## Proof Requirements For AGENT-010

- Profile updates stay private/local and do not leak raw profile data into repo truth.
- Onboarding starts read-only and requires live-answer preflight plus capability registry/template proof.
- Engagement tracking flags non-response without repeated spam.
- Coaching loop stores commitments and visible failure states before any write action.
- Old-system implementation details are keep/rebuild/retire evidence, not active truth.

## Not Done

This does not implement `AGENT-010`.

This does not launch Harlan or any live agent runtime.

This does not run extraction, provider/model calls, external writes, Drive permission mutation, Telegram sends, Gmail sends, ClickUp sends, or Agent Feedback auto-send.
