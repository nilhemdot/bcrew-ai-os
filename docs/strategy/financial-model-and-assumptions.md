# Financial Model and Assumptions

The strategy defines the destination. This document defines the math that validates whether the business can get there.

These values are the current working assumptions from the strategy model and must stay aligned to the live calculator as the rebuild continues.

## Active Assumptions

| Assumption | Current Value | Source |
|-----------|--------------|--------|
| Target GCI per active agent | $13K/month | Freedom KPI Sheet |
| Company split | 50% | Freedom KPI Sheet |
| Required monthly recruiting pace | 3.6 agents/month | Calculated from gap to target |
| Committed recruiting pace | 4/month (Steve 2, Scott 2) | Business strategy |
| Definition of "active agent" | Agent who produces, not just on roster | Reset September 2025 |

## How the Model Works

Agent count x GCI per agent x company split = revenue.

Scale the agent count while protecting per-agent productivity. If GCI drops as you add agents, the model breaks. If recruiting pace falls below required, the timeline slips.

## Where the Numbers Live

- **Freedom KPI Sheet** (Agent Engine tab): live scoreboard with current values
- **Freedom KPI Sheet** (BHAG Builder tab): 10-year projections with required agent counts
- **Owners Dashboard**: deal-level data, source of truth for production

Sheet ID: `1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw`

## Update Rule

If any assumption changes in the sheet, it should be reflected here and logged as a tracked strategic decision. Silent assumption changes are not acceptable.

## Key Risk

The $13K/month assumption was validated against the Freedom Sheet Agent Engine tab. The actual average as of early 2026 is closer to $9,451/month. That gap must be understood: $13K is the target for capacity-producing agents, not the roster average.
