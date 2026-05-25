# Gemini Dev UI/UX Audit - 2026-05-24

Source screenshots: current `/dev`, hub launcher v9, strategy hub v1, sales hub manager.
Reviewer model: Gemini API via `gemini-2.5-flash`.

## Summary

The current Dev Data Pool page feels inconsistent and overly busy, directly contradicting the design contract's intent for a 'fun and pro,' 'operational and scannable' hub page. It deviates significantly from canonical mockups, particularly in its 'blue pill' header treatment and the structure of its repeated cards. Typography hierarchy is mashed, card patterns are too numerous and lack consistent alignment, and the overall visual energy is cluttered rather than high-confidence BCrew real estate.

## Findings

- **HIGH - Blue Pill Header (.foundation-card):** The primary header is over-engineered and overfilled, mixing elements from hub cards (the large '07' number) with a complex gradient and too many stats. The 'f-title .hl' is a visual gimmick. This deviates from the 'calm cyan-to-blue band' and 'simple' blue pill specified in the contract (e.g., `strategy-hub.html`).
  Fix: Simplify the `.foundation-card` to align with `strategy-hub.html` or `sales-hub-manager.html`. Remove the `f-num` element. Reduce the `f-title` size to `var(--t-2xl)` (28px) or `var(--t-xl)` (22px) and remove the `.hl` highlight. Move the `f-bottom` stats into a separate, dedicated stat row or panel below the blue pill, as seen in `strategy-hub-v2.html`.
- **HIGH - Card Layout & Alignment (Director, Extractor, Source cards):** The `director-panel`, `extractor-grid`, and `source-grid` cards use `grid-template-rows` and lack stable grid tracks, causing content (titles, descriptions, meta-data, pills) to misalign vertically across cards in the same row when text length varies. This directly violates the contract's rule for repeated items.
  Fix: Re-architect card layouts using CSS Grid with `minmax` for content rows or fixed heights for specific elements (e.g., titles, description blocks) to ensure consistent vertical alignment of corresponding content across all cards in a row. Implement bottom-aligned action/chip rows as specified in the contract.
- **MEDIUM - Typography Hierarchy (Body Text & Custom Sizes):** Body text in `f-tag` and `source-card .summary` is `13px` (`--t-sm`), violating the 'Keep body text at 14px or larger' rule. Card titles (`extractor-card h3`, `source-card .title`) use `20px`, which is not a defined token. The smallest tags (`cap-list span`, `source-card .tags span`) use `10px`, smaller than `var(--t-micro)` (11px).
  Fix: Adjust all body text to `var(--t-base)` (14px). Standardize card titles to an existing token like `var(--t-lg)` (18px) or `var(--t-xl)` (22px). Standardize all smallest tags/pills to `var(--t-micro)` (11px).
- **MEDIUM - Pills & Badges (Director Cards):** The Director cards display a confusing array of pill-like elements, mixing status ('#BUILD-NOW'), action ('NEEDS APPROVAL'), and unbacked quality grades ('10 STRONG NEXT', '58 SCORES'). This violates the contract's guidance for status pills to 'use one meaning at a time' and to avoid letter grades unless source-backed and explained.
  Fix: Consolidate status to a single, clear pill (e.g., on the right side of the card). Remove or re-evaluate the 'STRONG NEXT' and 'SCORES' elements unless they are explicitly source-backed and their meaning is clearly explained on the page.
- **LOW - Card Accents (Blue Top Rules):** The blue top rule (`::before` pseudo-element) used on `director-card`, `extractor-card`, and `source-card` has inconsistent `left` positioning and `width` values (e.g., `left: 22px; width: 36px;` vs. `left: 18px; width: 34px;`).
  Fix: Standardize the `left` and `width` properties for all blue top rule `::before` elements across all card types to a single token-based value (e.g., `left: var(--s-4); width: var(--s-8);`).

## Rules To Promote

- All repeated cards in a grid must use stable row tracks to ensure vertical alignment of corresponding content elements (e.g., title, meta, body, action row) across the entire row, preventing content shifts due to variable text length. Use fixed/minmax row tracks, reserved title height, and bottom-aligned action rows.
- The top-page blue pill must be simple, using a calm cyan-to-blue gradient, one strong Stratum1 title, one useful sentence, and minimal status/action. Do not include large numerical identifiers or multiple statistical rows within the pill itself. Any aggregate stats should be presented in a separate section below the pill.
- Status pills must convey a single, clear state (e.g., active, pending, verified). Quality/rank badges are a distinct pattern from status pills and require source-backed data and on-page explanation for their meaning and calculation.
- All body text must use `var(--t-base)` (14px) or larger, unless explicitly defined as a compact label or micro-text element. All card titles must use an approved Stratum1 token (e.g., `var(--t-lg)` or `var(--t-xl)`).
- Standardize the visual treatment of card accents, such as top rules (`::before` elements), ensuring consistent positioning and sizing across all card patterns.

## Applied In Current Pass

- Simplified `/dev` blue pill by removing the `07` block and moving flow stats into a separate strip.
- Normalized typography away from custom 10/13/20/24/38px values into tokenized sizes where applicable.
- Kept Director counts as deliberate pills instead of floating sentence text.
- Kept source grades removed until source-value scoring is real.
- Saved post-patch screenshot: `/tmp/bcrew-dev-data-pool-gemini-audit-v6.png`.
