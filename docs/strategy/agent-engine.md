# Agent Engine

The Agent Engine turns the BHAG volume path into capacity math. It shows what productivity assumption the model is using, how many agents that assumption requires this year and next, and what pace the business needs now to start next year correctly.

## What the Engine Answers

- What productivity assumption is the model using?
- At that productivity level, how many agents does each target year require?
- How many agents does this year require, and what do we need to start next year correctly?
- Is current recruiting pace strong enough to close the gap?

## Pillar Ownership

Every department should be explainable through one or more parts of the engine:

- **Attract**: Recruiting owns agent acquisition and conversion. Marketing creates inbound demand, credibility, and attraction. Operations/Onboarding converts new agents into activated, productive team members.
- **Grow**: Sales Leadership protects productivity through coaching, standards, training, and accountability.
- **Retain**: Operations removes friction, Retention handles proactive intervention and engagement, and Marketing helps agents keep winning through brand leverage, reusable assets, and lead generation.

## Engine Inputs

The live inputs below come from the BHAG builder calculator in `SRC-FREEDOM-BHAG-001`.

- Targets are based on active, capacity-producing agents only.
- Owners, leadership, and known zero-production agents are excluded from the count.

## Required Agent Path

The required-agent table below translates the BHAG volume path into required agent count at the current productivity assumption.

## Current Requirement

This is the live answer to two questions:

- How many active agents does this year require?
- What do we need to do now so we can start next year at the right level?

- The BHAG builder sets the current-year and next-year volume targets.
- The current productivity assumption turns those targets into required agent counts.
- The live engine compares that requirement to current active agents and current recruiting pace.
- If productivity, split, or attrition changes, the required pace changes too.

## Attrition Note

The planning attrition assumption now comes from the BHAG builder. The live engine also exposes operating attrition pressure. Those are different numbers and should not be read as the same metric.

For assumption definitions and interpretation rules, see the [Financial Model and Assumptions](financial-model-and-assumptions.md).
