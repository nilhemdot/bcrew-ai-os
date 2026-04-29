# 2026-04-26 Strategy Live Operating Truth Correction

## Why This Exists

Steve caught a real Strategy Hub failure during live use: the Strategy Evidence Packet was treating stale meeting/doc synthesis as if it were current operating truth.

The concrete bug:

- packet/advisor language implied the 10,000-agent path was behind even though live BHAG says the community path is ahead
- finance recommendations sounded like Weekly Actuals / finance truth needed to be installed from scratch even though `SRC-FINANCE-001` is signed off and live
- packet generation was too weighted toward shared-comms candidates and direct text artifacts, not live Owners / finance / FUB / KPI source facts

## Correction

Added live source-first guardrails:

- `getStrategyGoalTruthSnapshot()`
  - separates Team Goal `$2B`, Community Goal `10,000 Agents`, and Agent Engine active productive capacity
  - current proof: team volume behind, community path ahead, active productive capacity behind
- `getStrategyOperatingTruthSnapshot()`
  - adds live/current operating cards for:
    - `SRC-FINANCE-001`
    - `SRC-OWNERS-001`
    - `SRC-FUB-001`
    - `SRC-SUPABASE-001`
  - rule: shared-comms candidates are evidence/leads, not final operating truth
- Strategy Advisor context now includes:
  - `currentGoalTruth`
  - `currentOperatingTruth`
- Strategy packet generation now includes:
  - `current_goal_truth`
  - `current_operating_truth`
  - packet rules requiring live source truth before recommendations
- Strategic Execution UI now shows:
  - Live Goal Truth
  - Live Operating Truth
- `foundation:verify` now checks that these guardrails exist.

## Important Source Distinction

Current live distinction:

- Team Goal `$2B`: behind live volume pace.
- Community Goal `10,000 Agents`: ahead live agent/community pace.
- Agent Engine capacity: behind active productive Benson Crew agent requirement.
- Finance: Weekly Actuals / Cashflow Dash already exist and are signed off for current reality.
- KPI: read rules are locked; remaining work is health/freshness/schema drift and KPI quality/coaching layers.

## Backlog

- `STRATEGY-010` created and closed as the live goal/operating truth guardrail.
- `STRATEGY-004` enriched so review/promote work must stay source-first.
- `STRATEGY-009` remains the UI/UX cleanup card.
- `SYNTHESIS-FACTS-001` remains the broader reusable fact-contract hardening card.

## Next

1. Regenerate the Strategy Evidence Packet with the new operating truth bundle.
2. Re-test Strategy Advisor on the exact failure cases:
   - "Are we behind on 10,000 agents?"
   - "Do we need to install weekly finance truth?"
   - "What is actually unresolved in finance?"
3. Continue Strategy Hub build only after the packet stops treating stale meeting chatter as live source truth.
