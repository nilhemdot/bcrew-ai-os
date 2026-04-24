## ISA validation doctrine

Date: 2026-04-21

### What the system should prove on an ISA deal

For any deal marked `ISA Set Deal = Yes`, the review flow should try to prove:

1. the Owners row links to a real FUB person
2. the CRM record shows ISA evidence if available
3. the deal economics match the agent's locked contract package
4. the company can tell whether the ISA work was profitable or not

### ISA evidence to look for

- FUB person URL / person ID
- source lineage
- ISA tag
- appointment-set history
- owner / activity trail if available

Current proven example:
- person `116283` (`Fay Kerr-Stewart`) carries tag `ISA Set - Alyssa`

### How this should work operationally

- normal deals should not require contract re-review
- ISA deals should still be checked against the locked contract registry
- if the row is marked `ISA Set Deal = Yes` but no CRM evidence is found, flag it
- if CRM shows ISA evidence but the row is not marked `ISA Set Deal = Yes`, flag it
- if the row economics do not match the locked package, flag it
- if the company cannot tell profit or loss on the ISA work, flag it

### Finance hooks already present

- `(Input) Weekly Actuals` has expense category:
  - `Team | Canadian Team | Alyssa Razon`
- `(Input) Weekly Actuals` also has expense category:
  - `Team | Canadian Team | ISA Bonus`

This means the company already has the raw cost lanes needed to evaluate ISA economics.

### Deal-triggered CRM enrichment checks

A closed or pending-close deal is also a CRM-cleanup opportunity.

When a deal is reviewed, the linked FUB contact should be checked for:
- good lead source
- referral / introduction chain fields when applicable
- good client name formatting
- relationship links if there are multiple names
- birthdays from ID / intake if available
- updated buy address when the deal is a buy
- contact-health completion across the level 1 to 5 supporter / data-depth model where relevant

This should become part of the same review flow, not a separate forgotten cleanup task.

If the deal traces back to a referral / introduction, validate:
- `Name of Person Who Gave Referral/Introduction`
- `Lead Source Secondary Information`

### Why this matters

This is not just attribution cleanup.

It is also:
- appointment accountability
- agent accountability
- ISA team performance tracking
- profit / loss visibility on ISA-generated business
