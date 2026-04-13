# Agent Engine

The Agent Engine is the live operating scoreboard for the business. It shows whether Attract, Grow, Retain, and financial truth are still strong enough to keep the plan working.

## What the Engine Answers

- Are we recruiting fast enough to close the capacity gap?
- Are active agents producing enough to make the model work?
- Is capacity compounding or leaking?
- Is the business staying financially true as those three move?

## Live Engine View

The live view below comes from `SRC-FREEDOM-ENGINE-001`. It should be read with the BHAG path, not in isolation.

## Core Engine Logic

The engine works because the metrics are connected, not independent.

- The BHAG builder sets the next-year starting target.
- The engine compares that target to current active agents, recruiting pace, production, and split.
- Required recruiting pace changes when the capacity gap or attrition assumption changes.
- Production and split show whether added capacity is economically true, not just numerically bigger.
- When recruiting pace, production, split, or attrition changes, the expected outcome changes with it.

The point of the engine is to show whether the whole model still holds, not whether one number looks good in isolation.

## Attrition Note

The engine currently uses two different attrition views:

- a planning attrition assumption inside the required recruiting formula
- a live operating pressure ratio based on current additions and losses

They are both useful, but they answer different questions and should not be read as if they are the same metric.

For assumption definitions and interpretation rules, see the [Financial Model and Assumptions](financial-model-and-assumptions.md).
