# Hub + Sub-Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign BCrew AI OS from a single-page dashboard into a Hub + Sub-Site architecture with a home launcher, Foundation sub-site with sidebar nav, and Harlan chat module.

**Architecture:** Multi-page Express app. Home page (`/`) is a centered launcher with hub cards. Foundation (`/foundation`) is its own page with grouped sidebar navigation and hash-based content switching. Harlan chat is a UI-only floating panel on the home page. All existing API endpoints and data rendering logic are preserved.

**Tech Stack:** Vanilla HTML/CSS/JS, Express, PostgreSQL (existing), Stratum1 + Open Sans fonts, CSS animations, no frameworks.

**Spec:** `docs/superpowers/specs/2026-04-13-hub-redesign-design.md`

---

### Task 1: Server Route Changes

**Files:**
- Modify: `server.js:268-278`

This task adds the `/foundation` route and updates the catch-all to serve the new home page.

- [ ] **Step 1: Add the foundation route before the catch-all**

In `server.js`, replace lines 268-278:

```javascript
app.get('/doc', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'doc.html'))
})

app.use('/api', (_req, res) => {
  sendApiError(res, 404, 'api_not_found', 'API endpoint not found.')
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})
```

With:

```javascript
app.get('/doc', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'doc.html'))
})

app.get('/foundation', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'foundation.html'))
})

app.use('/api', (_req, res) => {
  sendApiError(res, 404, 'api_not_found', 'API endpoint not found.')
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})
```

- [ ] **Step 2: Verify the server still starts**

Run: `node server.js &` then `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/`
Expected: 200 (the current index.html still serves)
Kill the server after.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add /foundation route for sub-site architecture"
```

---

### Task 2: Foundation HTML + JS (Rename and Adapt Current Dashboard)

**Files:**
- Create: `public/foundation.html` (based on current `public/index.html`)
- Create: `public/foundation.js` (based on current `public/app.js`)
- Modify: `public/index.html` will be replaced in Task 3

The current `index.html` becomes `foundation.html` with a sidebar nav layout replacing the old sidebar. The current `app.js` becomes `foundation.js` with hash-based content switching added.

- [ ] **Step 1: Copy current index.html to foundation.html**

Run: `cp public/index.html public/foundation.html`

- [ ] **Step 2: Copy current app.js to foundation.js**

Run: `cp public/app.js public/foundation.js`

- [ ] **Step 3: Rewrite foundation.html with sidebar nav layout**

Replace the entire contents of `public/foundation.html` with a new layout that has:
- A two-column grid: sidebar (260px) + main content
- Sidebar with "← All Hubs" back link, "BCREW AI OS / FOUNDATION" brand block
- Grouped nav: Strategy (Overview, North Star, BHAG Model, Agent Engine, Financial Model, Quarterly Priorities, Governance, Departments, Core Values), Operating Memory (Backlog, Decisions, Open Questions), Sources (Source Registry, Data Health)
- Main content area with breadcrumb + dynamic content container
- Script tag pointing to `/foundation.js`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Foundation · BCrew AI OS</title>
    <link rel="stylesheet" href="/styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  </head>
  <body class="foundation-page">
    <div class="found-bg"></div>
    <div class="found-shell">
      <aside class="found-sidebar">
        <a class="found-back" href="/">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          All Hubs
        </a>

        <div class="found-brand">
          <div class="found-brand-kicker">BCrew AI OS</div>
          <h2 class="found-brand-title">Foundation</h2>
        </div>

        <nav class="found-nav" id="found-nav">
          <div class="found-nav-group">
            <div class="found-nav-label">Strategy</div>
            <a class="found-nav-item found-nav-active" href="#overview" data-section="overview">Overview</a>
            <a class="found-nav-item" href="#bhag-model" data-section="bhag-model">BHAG Model</a>
            <a class="found-nav-item" href="#agent-engine" data-section="agent-engine">Agent Engine</a>
            <a class="found-nav-item" href="#quarterly-priorities" data-section="quarterly-priorities">Quarterly Priorities</a>
            <a class="found-nav-item" href="#governance" data-section="governance">Governance</a>
            <a class="found-nav-item" href="#departments" data-section="departments">Departments</a>
            <a class="found-nav-item" href="#core-values" data-section="core-values">Core Values</a>
          </div>

          <div class="found-nav-group">
            <div class="found-nav-label">Operating Memory</div>
            <a class="found-nav-item" href="#backlog" data-section="backlog">Backlog</a>
            <a class="found-nav-item" href="#decisions" data-section="decisions">Decisions</a>
            <a class="found-nav-item" href="#open-questions" data-section="open-questions">Open Questions</a>
          </div>

          <div class="found-nav-group">
            <div class="found-nav-label">Sources</div>
            <a class="found-nav-item" href="#source-registry" data-section="source-registry">Source Registry</a>
            <a class="found-nav-item" href="#data-health" data-section="data-health">Data Health</a>
          </div>
        </nav>

        <button class="found-mobile-toggle" id="found-mobile-toggle" aria-label="Toggle navigation">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </aside>

      <main class="found-main" id="found-main">
        <div class="found-breadcrumb">
          <a href="/">Home</a>
          <span class="found-breadcrumb-sep">›</span>
          <span>Foundation</span>
          <span class="found-breadcrumb-sep">›</span>
          <span class="found-breadcrumb-active" id="found-breadcrumb-page">Overview</span>
        </div>

        <div id="found-content">
          <p>Loading Foundation...</p>
        </div>
      </main>
    </div>

    <script src="/foundation.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Rewrite foundation.js with hash-based navigation**

Replace the entire contents of `public/foundation.js`. This file must:
- Keep ALL existing rendering functions from app.js (renderStatusCard, renderMarkdownBlock, renderSection, renderTable, renderBacklogItem, renderTeamBoard, renderDecisionCard, renderCaptureItem, etc.)
- Add a route map that maps hash sections to render functions
- On load + hashchange, render the appropriate section into `#found-content`
- Update active nav item and breadcrumb on navigation
- Fetch data from `/api/source-of-truth` and `/api/foundation-hub` once on load, cache it

The key sections and what they render:

| Hash | Content |
|------|---------|
| `#overview` | Hero + status grid + strategy document with all sections |
| `#bhag-model` | Loads doc via `/api/doc?path=docs/strategy/bhag-model.md` |
| `#agent-engine` | Loads doc via `/api/doc?path=docs/strategy/agent-engine.md` |
| `#quarterly-priorities` | Loads doc via `/api/doc?path=docs/strategy/quarterly-priorities.md` |
| `#governance` | Loads doc via `/api/doc?path=docs/strategy/governance.md` |
| `#departments` | Loads doc via `/api/doc?path=docs/strategy/department-mandates.md` |
| `#core-values` | Loads doc via `/api/doc?path=docs/strategy/core-values.md` |
| `#backlog` | Backlog panel from foundation-hub data |
| `#decisions` | Decisions + parking lot from foundation-hub data |
| `#open-questions` | Open questions from foundation-hub data |
| `#source-registry` | Source registry sections from source-of-truth data |
| `#data-health` | Memory status grid from foundation-hub data |

For strategy doc pages (BHAG Model through Core Values), fetch from `/api/doc` and render with the existing `renderMarkdownBlock` from doc.js. Reuse the doc viewer's rendering approach — fetch the doc content and render it inline in the foundation content area.

The `#overview` section renders the full current dashboard view (hero + status grid + strategy document sections).

- [ ] **Step 5: Verify foundation page loads**

Restart server, visit `http://localhost:3000/foundation`
Expected: Foundation page loads with sidebar nav, Overview shows the strategy content

- [ ] **Step 6: Test hash navigation**

Click sidebar items, verify content changes and breadcrumb updates.
Test: `http://localhost:3000/foundation#backlog` — should show backlog
Test: `http://localhost:3000/foundation#bhag-model` — should show BHAG doc

- [ ] **Step 7: Commit**

```bash
git add public/foundation.html public/foundation.js
git commit -m "feat: create Foundation sub-site with sidebar navigation"
```

---

### Task 3: Home Page HTML

**Files:**
- Overwrite: `public/index.html` (replace current dashboard with new home launcher)

- [ ] **Step 1: Replace index.html with the new home launcher**

Replace the entire contents of `public/index.html` with the home page that has:
- BC logo SVG (inline from `/assets/bc-logo.svg`)
- "BCREW AI OS" kicker + "COMMAND CENTER" title + subtitle
- 4 hub cards in a responsive grid (Foundation=live, Marketing/Strategy Team/Departments=coming soon)
- Each card: custom SVG icon, title, description, status indicator, hover arrow
- Status bar at bottom
- Container for Harlan chat (populated by home.js)
- Script tag pointing to `/home.js`

Use the exact markup from the approved mockup (the level-10-home.html brainstorm file) but adapted for production — real paths, no mockup chrome.

- [ ] **Step 2: Verify home page loads**

Visit `http://localhost:3000/`
Expected: Home launcher page with hub cards, brand logo, gradient background

- [ ] **Step 3: Verify Foundation link works**

Click the Foundation hub card.
Expected: Navigates to `/foundation` and shows the Foundation sub-site

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: create home launcher page with hub cards"
```

---

### Task 4: Home JS + Harlan Chat Module

**Files:**
- Create: `public/home.js`

- [ ] **Step 1: Create home.js with Harlan chat module**

Create `public/home.js` that implements:

**Hub card click handlers:**
- Foundation card links to `/foundation`
- Coming-soon cards show a subtle "Coming Soon" tooltip or do nothing

**Harlan chat module:**
- Collapsed state: floating button bottom-right (56x56px, brand blue, chat icon SVG, green online dot)
- Click toggle opens/closes the chat panel
- Expanded state: 380x520px panel sliding up from bottom-right
- Chat header: "HARLAN" title, "Strategic Assistant" subtitle, status pills (Claude Opus, Memory Connected, 5 Sources Live), close button
- Chat body: scrollable message area with welcome message from Harlan
- Chat input: text input + send button at bottom
- Send behavior: adds user message bubble (right-aligned), then after 500ms adds Harlan response bubble (left-aligned) with canned response
- Escape key closes chat
- Messages stored in a JS array (session only, no persistence)

**Status bar:**
- Fetch `/api/source-of-truth` to get system status counts
- Update status bar text with real counts (e.g., "5 sources connected")

- [ ] **Step 2: Verify chat toggle works**

Visit `http://localhost:3000/`, click the chat button.
Expected: Chat panel slides up with Harlan welcome message and status pills.

- [ ] **Step 3: Verify message sending**

Type a message, press Enter or click Send.
Expected: User message appears right-aligned, Harlan response appears after brief delay.

- [ ] **Step 4: Commit**

```bash
git add public/home.js
git commit -m "feat: add Harlan chat module to home page"
```

---

### Task 5: CSS — Home Page, Foundation Sidebar, Chat Module, Animations

**Files:**
- Modify: `public/styles.css`

This is the largest task. Add all new styles BEFORE the existing `/* ── RESPONSIVE ── */` media queries. The existing foundation/dashboard styles stay — they're still used by foundation.js for rendering content cards, status cards, backlog boards, etc.

- [ ] **Step 1: Add CSS custom properties for new surfaces**

Add to the existing `:root` block:

```css
--surface-glass: rgba(255, 255, 255, 0.82);
--surface-glass-hover: rgba(255, 255, 255, 0.92);
--purple: #8b5cf6;
--purple-bg: rgba(139, 92, 246, 0.08);
```

- [ ] **Step 2: Add gradient mesh background class**

```css
/* ── GRADIENT MESH BACKGROUND ── */
.home-bg,
.found-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0,132,201,0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 90%, rgba(0,132,201,0.04) 0%, transparent 50%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(16,185,129,0.02) 0%, transparent 60%),
    linear-gradient(180deg, #f4f6f9 0%, #edf0f4 40%, #e8ecf1 100%);
  z-index: 0;
  pointer-events: none;
}
```

- [ ] **Step 3: Add home page layout styles**

All home page styles: `.home`, `.home-content`, `.home-logo`, `.home-kicker`, `.home-title`, `.home-subtitle`, `.hub-grid`, `.hub-card`, `.hub-icon`, `.hub-meta`, `.hub-status`, `.hub-arrow`, `.home-statusbar` — matching the approved mockup exactly.

Key properties:
- `.home`: min-height 100vh, flex column, center, padding 60px 40px, position relative, z-index 1
- `.hub-grid`: grid, auto-fit minmax(220px, 1fr), gap 16px, max-width 960px
- `.hub-card`: background var(--surface-glass), backdrop-filter blur(16px), border-radius 18px, padding 28px 22px, transition 0.25s, staggered animation
- Hover: translateY(-4px), border-color brand with glow shadow, accent line at top via ::before

- [ ] **Step 4: Add hub card animation keyframes**

```css
@keyframes logoIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(16,185,129,0.4); }
  50% { box-shadow: 0 0 14px rgba(16,185,129,0.7); }
}
```

- [ ] **Step 5: Add Foundation sidebar and layout styles**

All foundation layout styles: `.found-shell`, `.found-sidebar`, `.found-back`, `.found-brand`, `.found-nav-group`, `.found-nav-label`, `.found-nav-item`, `.found-nav-active`, `.found-main`, `.found-breadcrumb`, `.found-mobile-toggle`

Key properties:
- `.found-shell`: display grid, grid-template-columns 260px 1fr, min-height 100vh, position relative, z-index 1
- `.found-sidebar`: background var(--surface-glass), backdrop-filter blur(20px), border-right, padding 24px 18px, overflow-y auto, position sticky, top 0, height 100vh
- `.found-nav-item`: padding 8px 12px, border-radius 8px, font-size 13px, font-weight 600, border-left 3px solid transparent
- `.found-nav-active`: background brand-glow, color brand-dark, border-left-color brand

- [ ] **Step 6: Add Harlan chat module styles**

All chat styles: `.harlan-toggle`, `.harlan-panel`, `.harlan-header`, `.harlan-status-pills`, `.harlan-pill`, `.harlan-body`, `.harlan-messages`, `.harlan-msg`, `.harlan-msg-user`, `.harlan-msg-harlan`, `.harlan-input-row`, `.harlan-input`, `.harlan-send`

Key properties:
- `.harlan-toggle`: position fixed, bottom 24px, right 24px, width 56px, height 56px, border-radius 50%, background brand, z-index 100, box-shadow
- `.harlan-panel`: position fixed, bottom 24px, right 24px, width 380px, height 520px, background var(--surface-glass), backdrop-filter blur(20px), border-radius 20px 20px 0 20px, z-index 100, flex column, box-shadow large, transform-origin bottom right, transition 0.25s
- `.harlan-panel[hidden]`: display none
- `.harlan-header`: padding 18px 20px, border-bottom, flex with title/pills/close
- `.harlan-body`: flex 1, overflow-y auto, padding 16px 20px
- `.harlan-msg-user`: background brand, color white, margin-left auto, border-radius 14px 14px 4px 14px
- `.harlan-msg-harlan`: background var(--surface-inset), border, border-radius 14px 14px 14px 4px
- `.harlan-input-row`: padding 12px 16px, border-top, flex, gap 8px

- [ ] **Step 7: Update responsive breakpoints**

Extend the existing `@media (max-width: 900px)` block with:

```css
.found-shell { grid-template-columns: 1fr; }
.found-sidebar { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--border); }
.found-nav { display: none; }
.found-nav.found-nav-open { display: block; }
.found-mobile-toggle { display: flex; }
.hub-grid { grid-template-columns: repeat(2, 1fr); }
.harlan-panel { width: 100%; right: 0; bottom: 0; border-radius: 20px 20px 0 0; }
```

Extend the existing `@media (max-width: 520px)` block with:

```css
.hub-grid { grid-template-columns: 1fr; }
.home { padding: 40px 16px 24px; }
.home-logo { width: 80px; }
.home-title { font-size: 24px; }
.harlan-panel { height: 100vh; width: 100%; border-radius: 0; }
```

Add a default hide for the mobile toggle at desktop:

```css
.found-mobile-toggle { display: none; }
```

- [ ] **Step 8: Verify visual output**

Visit `http://localhost:3000/` — verify gradient background, frosted cards, animations
Visit `http://localhost:3000/foundation` — verify sidebar styling, active states
Resize browser to < 520px — verify mobile layout

- [ ] **Step 9: Commit**

```bash
git add public/styles.css
git commit -m "feat: add home page, foundation sidebar, and chat module styles"
```

---

### Task 6: Polish and Integration Verification

**Files:**
- Possibly modify: any file that needs small fixes

- [ ] **Step 1: Full smoke test**

1. Visit `/` — home page loads with logo, cards, status bar, chat button
2. Click Foundation card → navigates to `/foundation`
3. Foundation sidebar shows, Overview is active, content loads
4. Click "BHAG Model" in sidebar → content switches, breadcrumb updates
5. Click "Backlog" → backlog board renders with team boards and lanes
6. Click "Decisions" → decision cards render
7. Click "← All Hubs" → back to home page
8. Click chat button → Harlan panel opens with welcome message
9. Type message, send → message appears, Harlan responds
10. Close chat → panel closes
11. Resize to mobile → layout adapts, sidebar collapses
12. Visit `/doc?path=docs/strategy/bhag-model.md` → doc viewer still works

- [ ] **Step 2: Fix any issues found in smoke test**

Address any rendering, navigation, or styling issues.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete hub + sub-site redesign with Foundation and Harlan chat"
```

---

## File Summary

| File | Action | Responsibility |
|------|--------|---------------|
| `server.js` | Modify | Add `/foundation` route |
| `public/index.html` | Overwrite | New home launcher page |
| `public/home.js` | Create | Home page logic + Harlan chat |
| `public/foundation.html` | Create | Foundation sub-site with sidebar nav |
| `public/foundation.js` | Create | Foundation content switching + all existing render functions |
| `public/styles.css` | Modify | Add home, foundation sidebar, chat, animation styles |
| `public/doc.html` | Unchanged | Doc viewer (inherits gradient background from CSS) |
| `public/doc.js` | Unchanged | Doc viewer logic |
| `public/app.js` | Keep for reference | Original dashboard JS (superseded by foundation.js) |
