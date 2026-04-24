## SOURCE-008 row validation examples

Date: 2026-04-21

Purpose: preserve concrete Owners-row examples for the Owners <-> FUB join and attribution validation pass.

### Confirmed rows with populated FUB linkage

These rows in `ADMIN ONLY - Deal Data Entry` already contain:
- a populated `Client Follow UP Boss ID`
- a visible `ISA Set Deal` state
- a visible `Deal or Lease?` state

#### Row 16 - `T#26104`
- Client: `Sarah Schwalm`
- Address: `1 Redfern Ave`
- Lead source: `Met - In Person`
- Extra lead source: `Sphere`
- Company or Agent: `Agent`
- FUB URL: `https://zahndteam2.followupboss.com/2/people/view/136540`
- ISA Set Deal: `No`
- Deal or Lease?: `Lease`

#### Row 17 - `T#26098`
- Client: `Carol Paquin`
- Address: `163 Ross Lane`
- Lead source: `zahndteam.ca`
- Extra lead source: `Bensoncrew.ca Lead Capture`
- Company or Agent: `Company`
- FUB URL: `https://zahndteam2.followupboss.com/2/people/view/89785`
- ISA Set Deal: `No`
- Deal or Lease?: `Deal`

#### Row 18 - `T#26101`
- Client: `Tomasz Kowalski`
- Address: `Lot 66 Palace St`
- Lead source: `Import`
- Extra lead source: `Sphere`
- Company or Agent: `Agent`
- FUB URL: `https://zahndteam2.followupboss.com/2/people/view/114473`
- ISA Set Deal: `No`
- Deal or Lease?: `Deal`

### High-value exception example

#### Row 19 - `T#26100`
- Client: `Fay Kerr- Stewart`
- Address: `575 Conklin Road #1004`
- Type: `Sell`
- Lead source: `Google Search Call`
- Extra lead source: `Brantford Call`
- Ground zero: `No Extra Lead Source`
- Extra origin lead source: `ISA Appointment Set`
- Company or Agent: `Agent`
- Agent email: `matta@bensoncrew.ca`
- FUB URL: `https://zahndteam2.followupboss.com/2/people/view/116283`
- ISA Set Deal: `Yes`
- Deal or Lease?: `Lease`

Live FUB evidence from person `116283`:
- name: `Fay Kerr-Stewart`
- stage: `Lead`
- source: `BCrew Google Search Call Brantfo`
- source URL: `https://mattallman.com/seller-onboarding`
- assigned to: `Matt Allman`
- tags:
  - `ISA Set - Alyssa`
  - `Seller`
- deal stage: `Upcoming Closings - Pending Close`
- deal close date: `2026-05-01`

Current pay math on the row:
- Gross To Team: `1000`
- Net To Team: `1000`
- Split To Agent: `45%`
- Agent Portion: `$450`
- Company/Team Lead Portion: `$550`

Important finding:
- `Split To Agent` on this row is hard-entered, not formula-driven.
- `Agent Splits` row `41` (`2026 Matt Allman`) shows:
  - agent deal split: `50%`
  - company deal split: `50%`
- That means `T#26100` is already being treated as an exception row relative to Matt's normal split table.

Working interpretation:
- this row does **not** look like a missed ISA uplift
- it already appears to be carrying one, because company is taking `55%` instead of the normal `50%`

What still needs validation:
1. confirm the contract rule for Matt Allman ISA-set deals
2. confirm whether `45 / 55` is the correct override for this exact lease case
3. decide whether this should stay manual-by-row or be made rule-driven from contract + `ISA Set Deal`
4. decide how ISA cost is attached so the company can tell whether Alyssa's ISA work was profitable on this deal or at least profitable across a governed period

Why this example matters:
- it is the cleanest proof case for the next Owners validation run
- it joins the Owners row to a real FUB person
- it exposes where row-level economics are still manual and contract-dependent
- it proves the CRM already contains useful ISA evidence via tags

Finance hook already present:
- `(Input) Weekly Actuals` contains expense category `Team | Canadian Team | ISA Bonus`
- this means the company already has an ISA-cost lane, but it is not yet explicitly joined back to deal-level or governed period-level profitability reads
