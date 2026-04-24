# Marketing Source Closeout Audit

Date: 2026-04-23

Purpose: state plainly what marketing intelligence is actually connected in Foundation, what is only a remembered old-system path, and what still needs a real closeout before the future Strategy Hub or marketing overlays should trust it.

## Straight Call

Foundation does **not** have a fully closed marketing-intelligence layer yet.

What exists right now is:

- the source map doctrine
- the old-system reference pattern
- partial source contracts

What does **not** exist yet is a clean, Benson-Crew-confirmed, fully connected marketing source stack.

## Current Source Reality

### Verified / usable now

- `SRC-STRATEGY-001`
  - strategy packet and doctrine are live
- `SRC-FUB-001`
  - usable for lead-origin and CRM context, not as a full marketing-performance system
- `SRC-SUPABASE-001`
  - KPI system is readable, but not yet locked as the marketing truth layer
- `SRC-GHL-001`
  - rebuild credential is live
  - contacts and pipeline reads are proven
  - not signed off as the complete Steve / MarketMasters / BCrew lead-flow truth yet
- `SRC-META-001`
  - rebuild tokens are proven for Steve and BCrew marketing contexts
  - readable does not yet equal fully lane-mapped or signed off
- `SRC-DATAFORSEO-001`
  - verified readable as a research / SEO data source
  - not yet promoted into a signed-off marketing performance truth layer

### Pending revalidation

- `SRC-GADS-001`
  - configured in env, but the current OAuth refresh returns `invalid_grant`
  - old system path was real, but rebuild auth is not currently healthy

### Explicit gaps

- `SRC-PUBLISH-001`
  - SocialPilot enterprise API is the current candidate
  - Steve has provided an API key and docs URL
  - auth context still needs validation because the enterprise API appears to require owner/user context, not only a base key
- `SRC-CONTENT-001`
  - still not a live content-performance source
- `YouTube`
  - referenced in doctrine, not yet a signed-off source contract
- `Search Console`
  - referenced in doctrine, not yet a signed-off source contract
- `Google Business Profile`
  - referenced in doctrine, not yet a signed-off source contract
- explicit remarketing audience sources
  - referenced in doctrine, not yet closed as source contracts

## What This Means

The current marketing layer is still mostly:

- blueprint
- source map
- old-system memory

It is **not yet**:

- fully connected
- brand-clean
- signed off for Benson Crew strategy use

## Brand-Boundary Risk

The real risk Steve raised is valid:

- some marketing inputs may still reflect Zahnd Team or Steve-lane systems
- the rebuild has not yet proven which inputs are truly Benson Crew-owned versus Steve-owned versus MarketMasters-owned

That means a future Strategy Hub could read the wrong brand lane unless this closes first.

## Exact Closeout Questions

Before marketing intelligence is “done enough,” Foundation needs explicit answers to:

1. Which live properties/accounts are Benson Crew?
2. Which are Steve personal / attraction?
3. Which are MarketMasters?
4. Which old-system connectors still authenticate successfully?
5. Which of those connectors point to the right brand/property/account today?
6. Which metrics should Foundation trust directly versus only as reference?

## Required Closeout Pass

### 1. Source inventory pass

For each marketing surface, capture:

- source ID
- platform/account/property name
- brand lane: `benson_crew`, `steve`, or `marketmasters`
- live or stale
- connected or not
- owner

Minimum surfaces:

- GA4
- Search Console
- Google Business Profile
- Google Ads
- Meta
- YouTube
- publishing/distribution platform
- GHL
- remarketing audience sources

### 2. Brand verification pass

For every connected source, verify:

- this is actually the Benson Crew property/account if it is supposed to be
- this is not still pointing at Zahnd Team or an old Steve-only asset by accident

### 3. Contract closeout pass

Promote the verified surfaces into real source contracts instead of leaving them as doctrine references.

## Best Immediate Next Step

Run a focused marketing connector audit against:

- `SOURCE-016`
- `SRC-GHL-001`
- `SRC-GADS-001`
- `SRC-META-001`
- `SRC-PUBLISH-001`
- missing `GA4` / `Search Console` / `Google Business Profile` / `YouTube` source contracts

## Bottom Line

The marketing source layer is not blocked by architecture anymore.

It is blocked by connector reality and brand/account verification.

That is the closeout job now.
