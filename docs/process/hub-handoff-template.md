# Hub Handoff Template

Use this after a hub chat finishes a build slice.

```text
Hub handoff

Hub:
Backlog card:
Goal:

Changed files:
- 

Shared/Foundation files touched:
- none

Proof run:
- command:
- result:

What changed:
-

Known limits:
-

Ready state:
- ready for main-session review
- not committed
- not pushed

Hub-work manifest:
```json
{
  "schemaVersion": 1,
  "hub": "<sales|ops|strategy|marketing>",
  "cardId": "<card ID>",
  "changedFiles": [],
  "proofCommands": [],
  "handoffRef": "<handoff file or chat handoff reference>",
  "coordination": {
    "mainSessionApproved": false,
    "reason": ""
  },
  "committed": false,
  "pushed": false
}
```
```
