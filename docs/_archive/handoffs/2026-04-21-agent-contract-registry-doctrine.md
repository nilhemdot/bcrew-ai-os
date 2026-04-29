## Agent contract registry doctrine

Date: 2026-04-21

### Rule

Do not re-read an agent contract on every deal.

Read the contract once, lock the package into a governed contract registry, then validate future deals against that package.

Only re-open contract review when:
- a deal exposes an exception
- the ClickUp roster / contract link changes
- the contract metadata changes
- the founder says the package changed

### First governed contract fields

- agent name
- contract source URL
- effective start date
- effective end date if any
- package type
- apprenticeship flag
- apprenticeship target owed to company
- apprenticeship rate
- company-deal split
- agent-deal split
- ISA override
- lease override
- mentor share if any
- cap threshold rules
- notes / exceptions
- last reviewed at
- reviewed by

### Validation workflow

1. Start with active agents and exception deals.
2. Pull the linked contract once.
3. Encode the package.
4. Compare new deals against the package.
5. Only queue review again if the contract package becomes stale.

### Why this matters

This keeps contract review governed without making every deal depend on manual contract re-reading.
