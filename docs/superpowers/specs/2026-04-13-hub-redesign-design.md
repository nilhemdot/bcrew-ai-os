# BCrew AI OS — Hub + Sub-Site Redesign

**Date:** 2026-04-13
**Status:** Design approved, ready for implementation

## Summary

Redesign the BCrew AI OS website from a single-page dashboard into a modular Hub + Sub-Site architecture. The home page becomes a premium launcher. Each hub (starting with Foundation) gets its own page with dedicated sidebar navigation. Includes a Harlan chat module on the home screen.

## Architecture

### Two-tier page structure

- **Home page** (`/`) — Centered launcher with hub cards and Harlan chat
- **Foundation sub-site** (`/foundation`) — Sidebar + content area, absorbs current dashboard functionality
- **Doc viewer** (`/doc`) — Unchanged, inherits visual polish
- **Future hubs** — Each gets its own HTML + JS file, same pattern as Foundation

### Routing

No SPA framework. Each hub is a separate HTML page served by Express. Links navigate between pages normally. Within Foundation, hash-based routing switches content sections without page reload (sidebar nav items update the main content area).

### File structure

```
public/
  index.html          → NEW home launcher page
  home.js             → NEW home page logic + Harlan chat
  foundation.html     → RENAMED from index.html (current dashboard)
  foundation.js       → RENAMED from app.js (current dashboard logic)
  doc.html            → UNCHANGED
  doc.js              → UNCHANGED
  styles.css          → EXTENDED with home page + chat styles
  assets/
    bc-logo.svg       → EXISTING
  fonts/              → EXISTING Stratum1 + Open Sans
```

### Server changes (server.js)

- `/` serves `public/index.html` (new home page)
- `/foundation` serves `public/foundation.html`
- `/doc` serves `public/doc.html` (unchanged)
- All `/api/*` endpoints unchanged

## Home Page Design

### Layout

Centered vertical flow, no sidebar. Full-viewport with gradient mesh background.

### Components (top to bottom)

1. **BC logo** — Real SVG badge, 120px wide, drop shadow, fade-in animation
2. **Kicker** — "BCREW AI OS" in Stratum1 700, uppercase, brand blue, letter-spacing 0.28em
3. **Title** — "COMMAND CENTER" in Stratum1 900, uppercase, clamp(28px, 4vw, 42px)
4. **Subtitle** — "The operating system for Benson Crew..." in Open Sans 400, muted gray
5. **Hub card grid** — 4-column responsive grid (auto-fit, minmax(220px, 1fr))
6. **Harlan chat module** — Fixed bottom-right, expandable
7. **Status bar** — Bottom, shows system health: "System online · Foundation live · X sources connected"

### Hub cards

Four cards, staggered fade-in (80ms apart):

| Hub | Icon | Color | Status |
|-----|------|-------|--------|
| Foundation | Building/pillars | Blue #0084C9 | Live (green pulse) |
| Marketing | Flag | Green #10b981 | Coming Soon |
| Strategy Team | Clock/compass | Amber #f59e0b | Coming Soon |
| Departments | People | Purple #8b5cf6 | Coming Soon |

Card styling:
- White with backdrop-filter blur (frosted glass)
- 18px border-radius
- Custom SVG icon in tinted container (52x52px, 14px border-radius)
- Hover: lift -4px, blue border glow, accent line appears at top, arrow slides in
- Status: green pulse dot + "LIVE" or muted dot + "COMING SOON"

### Visual polish

- **Background**: Gradient mesh (soft blue/gray radial gradients) + noise texture overlay
- **Cards**: `backdrop-filter: blur(16px)` frosted glass
- **Animations**: Logo fade-in (0.6s), text stagger (0.15s-0.35s), cards stagger (0.4s-0.64s)
- **Status bar**: Subtle, muted, with tiny colored dots

## Harlan Chat Module

### What it is

A chat interface for Steve's personal strategic assistant "Harlan" — positioned bottom-right of the home page. UI-only for now (no backend agent), but designed to feel real and premium.

### UI components

**Collapsed state (default):**
- Floating button, bottom-right corner, 56x56px
- Brand blue background with white chat icon
- Subtle shadow + scale hover effect
- Small green dot indicating "online"

**Expanded state:**
- Panel slides up from bottom-right, 380px wide × 520px tall
- Frosted glass background matching site aesthetic
- Rounded corners (20px top, 0 bottom-right)

**Chat header:**
- "HARLAN" in Stratum1 Bold uppercase
- Subtitle: "Strategic Assistant"
- Status pills (small, inline):
  - Model indicator (e.g., "Claude Opus")
  - Memory: "Connected" (green) or "Offline"
  - Sources: "5 Live" (green)
- Close button (×)

**Chat body:**
- Welcome message from Harlan:
  > "Hey Steve. I'm connected to Foundation — strategy docs, business memory, backlog, and decisions are all live. What do you want to dig into?"
- Message input at bottom with send button
- Messages display in clean bubbles (user right-aligned, Harlan left-aligned)

**Behavior (v1 mock):**
- Typing in the input and hitting send adds the message to the chat
- Harlan responds with a canned acknowledgment: "I hear you. The agent infrastructure isn't wired up yet, but the Foundation data is live and waiting."
- No real API calls — purely frontend mock to establish the UI pattern

## Foundation Sub-Site Design

### Layout

Two-column grid: sidebar (260px) + main content area. Same gradient mesh background as home.

### Sidebar

- **Back link**: "← All Hubs" at top, navigates to home page
- **Brand block**: "BCREW AI OS" kicker + "FOUNDATION" title + green live dot
- **Grouped nav** with uppercase group labels:

**Strategy group:**
- Overview (default active)
- North Star
- BHAG Model
- Agent Engine
- Financial Model
- Quarterly Priorities
- Governance
- Departments
- Core Values

**Operating Memory group:**
- Backlog
- Decisions
- Open Questions

**Sources group:**
- Source Registry
- Data Health

- Active item: blue left border (3px) + blue tint background
- Hover: subtle gray background
- Mobile (< 900px): sidebar stacks above, collapsible hamburger

### Main content area

- **Breadcrumb**: Home → Foundation → [Current page]
- **Hero card**: Page title + description + action button (e.g., "Print Strategy")
- **Content below**: All existing functionality from current dashboard, reorganized by nav section

### What moves from current site

The current `index.html` dashboard content maps to Foundation sections:

| Current section | Foundation nav item |
|----------------|-------------------|
| Hero + strategy document | Overview |
| Supporting strategy docs | Individual nav items (BHAG Model, Engine, etc.) |
| Source registry | Source Registry |
| Memory foundation | Data Health |
| Backlog | Backlog |
| Decisions + Open Questions + Parking Lot | Decisions / Open Questions |
| Status grid | Shown on Overview as status cards |

### Navigation behavior

Hash-based within Foundation: clicking sidebar items updates the main content area without full page reload. URL format: `/foundation#overview`, `/foundation#bhag-model`, etc.

## Visual Design System

### Colors (unchanged from brand)

- Primary: `#0084C9` (blue), `#000000` (black)
- Secondary: `#FFFFFF`, `#EBEBEB`
- Background: Gradient mesh (soft blue/gray radials over `#f4f6f9`)
- Surfaces: `rgba(255,255,255,0.82)` with `backdrop-filter: blur(16px)`
- Status: Green `#10b981`, Amber `#f59e0b`, Red `#ef4444`

### Typography (unchanged from brand)

- Headlines: Stratum1 900, uppercase
- Labels/kickers: Stratum1 700, uppercase, wide letter-spacing
- Body: Open Sans 400/600/700
- No Inter, Roboto, Arial, or system fonts

### Spacing and radius

- Card radius: 16-18px
- Button radius: 8px
- Nav item radius: 8px
- Card padding: 24-28px
- Section gaps: 16px

### Animations

- Page load: Logo 0.6s ease, text stagger 80ms, cards stagger 80ms
- Hover: 0.25s cubic-bezier ease, lift + glow
- Status dots: 2.5s ease-in-out pulse
- Nav transitions: 0.12s ease

## Mobile Responsiveness

### Breakpoints

- **< 900px**: Sidebar stacks above content, hub grid → 2 columns, chat panel → full width
- **< 520px**: Hub grid → 1 column, reduced padding, smaller headings, chat panel → full screen overlay

### Home page mobile

- Logo scales down
- Hub cards stack vertically
- Chat button stays fixed bottom-right
- Status bar wraps

### Foundation mobile

- Sidebar becomes a horizontal nav bar or hamburger menu at top
- Content takes full width
- All existing mobile fixes from the responsive CSS work carry over

## What's NOT in scope

- Backend agent infrastructure (Harlan chat is UI-only mock)
- Real chat API integration
- Authentication / role-based views
- Marketing hub content
- Strategy Team hub content
- Department hub content
- fal.ai / Recraft asset generation (using hand-crafted SVG icons)
