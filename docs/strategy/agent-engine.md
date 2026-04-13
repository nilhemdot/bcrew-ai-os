# Agent Engine

The Agent Engine turns the BHAG volume path into capacity math. It shows what productivity assumption the model is using, how many agents that assumption requires, and what pace the business needs now to start next year correctly.

## What the Engine Answers

- What productivity assumption is the model using?
- At that productivity level, how many agents does each target year require?
- How many agents do we need to start next year correctly?
- Is current recruiting pace strong enough to close the gap?

## Pillar Ownership

Every department should be explainable through one or more parts of the engine:

- **Attract**: Recruiting drives agent acquisition, Marketing creates trust and demand, and Operations/Onboarding turns joins into activated agents.
- **Grow**: Sales Leadership protects productivity through coaching, standards, training, and accountability.
- **Retain**: Operations removes friction, Retention handles proactive intervention and engagement, and Marketing provides leverage that helps agents keep winning.

## Engine Inputs

The live inputs below come from the BHAG builder calculator in `SRC-FREEDOM-BHAG-001`.

## Required Agent Path

The required-agent table below translates the BHAG volume path into required agent count at the current annual volume average per agent.

## Current Requirement

This is the live answer to the question: how many agents do we need to add now so we can start next year at the right level?

- The BHAG builder sets the next-year volume target.
- The current productivity assumption turns that target into a required start-of-year agent count.
- The live engine compares that requirement to current active agents and current recruiting pace.
- If productivity, split, or attrition changes, the required pace changes too.

## Attrition Note

The live engine currently exposes operating attrition pressure, but the planning attrition assumption inside the required recruiting formula still needs to be broken out as an explicit source-backed input.

For assumption definitions and interpretation rules, see the [Financial Model and Assumptions](financial-model-and-assumptions.md).
