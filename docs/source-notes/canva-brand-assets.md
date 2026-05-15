# Canva Brand Assets Source Note

Last updated: 2026-05-15

## Current Situation

Steve wants Canva connected so AIOS can eventually use Benson Crew brand assets, create branded posts/designs, and push editable output into Canva for the team to adjust manually.

Tanner's current intake folder is:

- `https://www.canva.com/folder/FAHJp1pSJv0`

That folder is useful as an upstream inspection target, but it is not clean brand truth. The folder lives under a messy project/social-media-template structure and should not become the canonical Brand Kit or the AIOS approved asset registry.

## Old-System Context

The old system had a one-time Canva PKCE script and vaulted Canva credentials. It requested broad write scopes because the intended long-term use was design-tool integration for marketing content, but it did not produce a governed reusable Canva client or a clean asset registry.

Old-system lessons to keep:

- Canva should be an integration point for content/design workflows.
- Team-editable output matters: AI-generated assets should be pushed into Canva when humans need manual editing.
- Tanner and the team need an asset workflow that does not require Foundation access.

Old-system patterns not to repeat:

- one-off scripts per workflow
- printing token prefixes or writing access tokens as durable truth
- treating a messy Canva folder as canonical brand truth
- granting write capability before there is an approval, cost, ownership, and audit boundary

## Target Future Architecture

Use three separate layers:

1. Canva client foundation: governed OAuth/token handling and read-only metadata helpers.
2. Brand Ingredient Asset Library: Foundation-backed registry of approved staple assets with Canva provenance; Marketing Hub gives Tanner a safe curation surface.
3. Editable Canva output loop: approved AI-generated posts/designs can be uploaded/imported/created in Canva so the team can manually edit them.

The Brand Ingredient Asset Library should track at least:

- asset role: mascot, avatar, sold sign, logo, font, brand guideline, template, property image, proof/social post ingredient
- brand lane: Benson Crew, Steve Zahnd, Zahnd Team, MarketMasters, or other governed lane
- source: Canva folder/design/asset ID, upload source, or generated output
- approval status: intake, candidate, approved, deprecated, rejected
- owner/editor: Tanner or another marketing owner
- usage notes and rights/consent notes
- last synced/inspected timestamp

## Current Card Boundary

`CANVA-CLIENT-001` is only the client foundation. It must not create the asset library, upload assets, export designs, create designs, or wire Marketing Hub routes.

Follow-up backlog work should handle the library and editable output loop after the read-only client and admin-backed refresh token are proven.
