var SALES_SECTION_ALIASES = {
  '': 'gls-dashboard',
  dashboard: 'gls-dashboard',
  'gls-system': 'gls-system',
  'gls-dashboard': 'gls-dashboard',
  'stale-listings': 'gls-opportunities',
  opportunities: 'gls-opportunities',
  cases: 'gls-cases',
  gaps: 'gls-results',
  results: 'gls-results',
  playbooks: 'gls-playbooks',
}

var currentSalesHubPayload = null
var SALES_MANAGER_VIEW_STORAGE_KEY = 'bcrew.sales.glsManagerView'
var SALES_MANAGER_VIEWS = [
  { key: 'active', label: 'Active' },
  { key: 'needs_owner', label: 'Needs owner' },
  { key: 'needs_plan', label: 'Needs plan' },
  { key: 'adjusted', label: 'Adjusted' },
  { key: 'snoozed', label: 'Snoozed' },
  { key: 'blocked_failed', label: 'Blocked / failed' },
  { key: 'sold_closed', label: 'Sold / closed' },
  { key: 'all', label: 'All' },
]

function loadSalesManagerView() {
  try {
    var saved = window.localStorage && window.localStorage.getItem(SALES_MANAGER_VIEW_STORAGE_KEY)
    return SALES_MANAGER_VIEWS.some(function(view) { return view.key === saved }) ? saved : 'active'
  } catch (error) {
    return 'active'
  }
}

var salesManagerView = loadSalesManagerView()

function parseSalesHash(raw) {
  var clean = String(raw || '').replace(/^#/, '')
  var parts = clean.split('?')
  return {
    section: parts[0] || '',
    params: new URLSearchParams(parts.slice(1).join('?')),
  }
}

function normalizeSection(raw) {
  var key = parseSalesHash(raw).section
  return SALES_SECTION_ALIASES[key] || key || 'gls-dashboard'
}

function getSection() {
  return normalizeSection(window.location.hash)
}

function getAdminHeaders() {
  try {
    var token = window.localStorage && window.localStorage.getItem('BCREW_ADMIN_TOKEN')
    return token ? { 'X-Admin-Token': token } : {}
  } catch (error) {
    return {}
  }
}

function fetchJson(url) {
  return fetch(url, { cache: 'no-store', headers: getAdminHeaders() }).then(function(response) {
    if (!response.ok) throw new Error(url + ' returned ' + response.status)
    return response.json()
  })
}

function postJson(url, body) {
  var headers = getAdminHeaders()
  headers['Content-Type'] = 'application/json'
  return fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: headers,
    body: JSON.stringify(body || {}),
  }).then(function(response) {
    if (!response.ok) throw new Error(url + ' returned ' + response.status)
    return response.json()
  })
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}

function getSalesStatusNode() {
  var root = document.getElementById('sales-content')
  if (!root) return null
  var node = document.getElementById('sales-save-status')
  if (!node) {
    node = el('div', 'sales-save-status')
    node.id = 'sales-save-status'
    node.setAttribute('role', 'status')
    root.parentNode.insertBefore(node, root)
  }
  return node
}

function setSalesStatus(message, type) {
  var node = getSalesStatusNode()
  if (!node) return
  node.textContent = message || ''
  node.className = 'sales-save-status sales-save-status-' + (type || 'info')
  node.hidden = !message
}

function el(tag, className, text) {
  var node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-CA').format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return 'Missing'
  var date = new Date(value + 'T12:00:00')
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) return 'Missing'
  var date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getTorontoDateKey(value) {
  var date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) date = new Date()
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  var values = Object.fromEntries(parts.map(function(part) {
    return [part.type, part.value]
  }))
  return [values.year, values.month, values.day].join('-')
}

function addDaysToDateKey(dateKey, days) {
  var base = dateKey ? new Date(dateKey + 'T12:00:00') : new Date()
  if (Number.isNaN(base.getTime())) base = new Date()
  base.setDate(base.getDate() + Number(days || 0))
  return getTorontoDateKey(base)
}

function formatRefreshAge(ageMs) {
  if (!Number.isFinite(Number(ageMs))) return ''
  var minutes = Math.max(0, Math.round(Number(ageMs) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min old'
  if (minutes < 60) return minutes + ' min old'
  var hours = Math.round(minutes / 60)
  return hours === 1 ? '1 hr old' : hours + ' hr old'
}

function getSalesFreshnessCopy(report) {
  var payload = currentSalesHubPayload || {}
  var meta = payload.meta || {}
  var cache = meta.cache || {}
  var refreshedAt = report.generatedAt || meta.generatedAt
  var stamp = refreshedAt ? formatDateTime(refreshedAt) : 'time unavailable'
  var age = formatRefreshAge(cache.ageMs)
  if (cache.status === 'forced_refresh' || cache.status === 'refresh') {
    return 'Fresh from ClickUp ' + stamp + '.'
  }
  if (cache.status === 'stale_background_refresh') {
    return 'Last ClickUp refresh ' + stamp + '. Showing AIOS cache now while a background refresh runs.'
  }
  if (cache.status === 'shared_refresh') {
    return 'ClickUp refresh is already running. Showing the latest AIOS view.'
  }
  return 'Last ClickUp refresh ' + stamp + (age ? ' · AIOS cache ' + age + '.' : '.')
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return 'n/a'
  return Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1) + '%'
}

function getScoreboard(report) {
  return report.scoreboard || {
    currentActive: {},
    allTimeFunnel: {},
    activePipeline: {},
    resolvedResults: {},
    outcomeSummary: {},
    leaderPerformance: [],
    conversionRates: [],
    weeklyCohorts: [],
    movedSoldCases: [],
  }
}

function formatDualCount(metric) {
  return formatNumber(metric?.listingCount || 0) + ' listings · ' + formatNumber(metric?.caseCount || 0) + ' cases'
}

function formatCaseMetric(metric) {
  return formatNumber(metric?.caseCount || 0) + ' cases · ' + formatNumber(metric?.listingCount || 0) + ' listings'
}

function formatDays(value) {
  if (value == null || Number.isNaN(Number(value))) return 'n/a'
  return formatNumber(value) + ' days'
}

function setActiveNav(section) {
  var activeSection = section
  if (['gls-opportunities', 'gls-cases', 'gls-playbooks', 'gls-results'].includes(section)) activeSection = 'gls-system'
  document.querySelectorAll('.found-nav-item').forEach(function(item) {
    item.classList.remove('found-nav-active')
    if (item.dataset.section === activeSection) item.classList.add('found-nav-active')
  })
  var labels = {
    'gls-dashboard': 'GLS Dashboard',
    'gls-system': 'GLS Manager',
    'gls-opportunities': 'Opportunities',
    'gls-cases': 'Cases',
    'gls-playbooks': 'Playbooks',
    'gls-results': 'Results',
  }
  var page = document.getElementById('found-breadcrumb-page')
  if (page) page.textContent = labels[section] || 'GLS Dashboard'
}

function getGlsSystem(report) {
  return report.system || {
    name: 'GLS System',
    fullName: 'Get Listings Sold',
    purpose: 'Identify stale active listings, assign ownership, create a game plan, and track movement.',
    workflow: [],
    playbooks: [],
    threshold: { defaultDays: report.thresholdDays || 30 },
  }
}

function renderMetric(label, value, helper, className) {
  var card = el('article', ['sales-metric', className].filter(Boolean).join(' '))
  card.appendChild(el('div', 'sales-metric-label', label))
  card.appendChild(el('div', 'sales-metric-value', formatNumber(value)))
  if (helper) card.appendChild(el('p', 'sales-metric-helper', helper))
  return card
}

function renderHero(report, options) {
  var opts = options || {}
  var system = getGlsSystem(report)
  var hero = el('section', 'sales-hero')
  var left = el('div')
  left.appendChild(el('div', 'found-brand-kicker', opts.kicker || 'Sales Hub system'))
  left.appendChild(el('h1', 'sales-title', opts.title || system.name))
  left.appendChild(el('p', 'sales-subtitle', opts.subtitle || (system.fullName + ': ' + system.purpose)))
  hero.appendChild(left)

  var action = el('div', 'sales-hero-action')
  action.appendChild(el('p', 'sales-data-freshness', getSalesFreshnessCopy(report)))
  var refresh = document.createElement('button')
  refresh.type = 'button'
  refresh.className = 'secondary-button sales-refresh-button'
  refresh.textContent = 'Refresh from ClickUp'
  refresh.addEventListener('click', function() {
    refresh.disabled = true
    refresh.textContent = 'Refreshing...'
    setSalesStatus('Refreshing GLS data from ClickUp...', 'info')
    load({ refresh: true })
  })
  action.appendChild(refresh)
  action.appendChild(el('p', 'sales-source-line', report.source.sourceId + ' · AIOS cached view · Active listings only · ' + (report.thresholdDays || 30) + '+ day threshold. GLS edits save to AIOS immediately; refresh only pulls new ClickUp listing/date/status changes.'))
  hero.appendChild(action)
  return hero
}

function renderActivePipelineDashboard(report) {
  var scoreboard = getScoreboard(report)
  var active = scoreboard.activePipeline || {}
  var section = el('section', 'sales-panel sales-dashboard-panel sales-dashboard-panel-active')
  section.appendChild(el('h2', null, 'Active GLS pipeline'))
  section.appendChild(el('p', 'sales-panel-copy', 'Cases still being worked right now. Sold and failed cases leave this active view.'))
  var grid = el('div', 'sales-metric-grid sales-metric-grid-dashboard')
  grid.appendChild(renderMetric('Active GLS cases', active.total?.caseCount, formatCaseMetric(active.total)))
  grid.appendChild(renderMetric('Needs owner', active.unassigned?.caseCount, formatCaseMetric(active.unassigned)))
  grid.appendChild(renderMetric('Assigned', active.takenOn?.caseCount, formatCaseMetric(active.takenOn)))
  grid.appendChild(renderMetric('Game plans', active.gamePlanCreated?.caseCount, formatCaseMetric(active.gamePlanCreated)))
  grid.appendChild(renderMetric('Adjusted / implemented', active.implemented?.caseCount, formatCaseMetric(active.implemented)))
  grid.appendChild(renderMetric('Stuck', active.stuck?.caseCount, (active.stuckThresholdDays || 14) + '+ days open.'))
  section.appendChild(grid)
  return section
}

function renderTotalCasesDashboard(report) {
  var scoreboard = getScoreboard(report)
  var funnel = scoreboard.allTimeFunnel || {}
  var active = scoreboard.activePipeline || {}
  var outcomes = scoreboard.outcomeSummary || {}
  var section = el('section', 'sales-panel sales-dashboard-panel sales-dashboard-panel-total')
  section.appendChild(el('h2', null, 'Total GLS cases'))
  section.appendChild(el('p', 'sales-panel-copy', 'All-time persisted GLS cases. This is where sold, failed, and conversion outcomes belong. Date filters can layer on later.'))
  var grid = el('div', 'sales-metric-grid sales-metric-grid-dashboard')
  grid.appendChild(renderMetric('Identified', funnel.identified?.caseCount, formatCaseMetric(funnel.identified)))
  grid.appendChild(renderMetric('Taken on', funnel.takenOn?.caseCount, formatCaseMetric(funnel.takenOn)))
  grid.appendChild(renderMetric('Adjusted / implemented', outcomes.adjustedOrImplemented?.caseCount, formatCaseMetric(outcomes.adjustedOrImplemented)))
  grid.appendChild(renderMetric('Sold', outcomes.soldClosed?.caseCount, formatCaseMetric(outcomes.soldClosed)))
  grid.appendChild(renderMetric('Failed', outcomes.failed?.caseCount, 'No action, blocked, cancelled, or expired.'))
  grid.appendChild(renderMetric('Still active', active.total?.caseCount, formatCaseMetric(active.total)))
  section.appendChild(grid)
  return section
}

function renderManagerSummary(report) {
  var scoreboard = getScoreboard(report)
  var active = scoreboard.activePipeline || {}
  var projectTaskIds = new Set()
  ;(report.projectSuggestions || []).forEach(function(project) {
    ;(project.taskIds || []).forEach(function(taskId) {
      projectTaskIds.add(taskId)
    })
  })
  var individualRows = (report.staleListings || []).filter(function(listing) {
    return !projectTaskIds.has(listing.taskId)
  }).length
  var totalCases = active.total?.caseCount || 0
  var planCases = active.gamePlanCreated?.caseCount || 0
  var section = el('section', 'sales-panel sales-manager-summary')
  section.appendChild(el('h2', null, 'Manager queue'))
  section.appendChild(el('p', 'sales-panel-copy', 'Work the current active GLS cases: assign an owner, create the game plan, and update movement.'))
  var grid = el('div', 'sales-metric-grid sales-manager-metric-grid')
  grid.appendChild(renderMetric('Needs owner', active.unassigned?.caseCount, formatCaseMetric(active.unassigned)))
  grid.appendChild(renderMetric('Smart projects', (report.projectSuggestions || []).length, 'Grouped address cases to manage together.'))
  grid.appendChild(renderMetric('Individual rows', individualRows, 'Current stale listings not inside a project group.'))
  grid.appendChild(renderMetric('No game plan yet', Math.max(0, totalCases - planCases), formatNumber(planCases) + ' active cases have a game plan.'))
  section.appendChild(grid)
  return section
}

function renderManagerFilters(report) {
  var counts = Object.fromEntries(SALES_MANAGER_VIEWS.map(function(view) {
    return [view.key, countManagerView(report, view.key)]
  }))
  var section = el('section', 'sales-panel sales-manager-toolbar')
  var top = el('div', 'sales-manager-toolbar-top')
  top.appendChild(el('h2', null, 'Manager view'))
  var actions = el('div', 'sales-manager-toolbar-actions')
  actions.appendChild(el('p', 'sales-panel-copy', 'Default hides snoozed, blocked, failed, sold, cancelled, and expired cases.'))
  var printButton = document.createElement('button')
  printButton.type = 'button'
  printButton.className = 'secondary-button sales-save-button'
  printButton.textContent = 'Print / PDF'
  printButton.addEventListener('click', function() {
    window.print()
  })
  actions.appendChild(printButton)
  top.appendChild(actions)
  section.appendChild(top)

  var row = el('div', 'sales-manager-filter-row')
  SALES_MANAGER_VIEWS.forEach(function(view) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'sales-manager-filter' + (salesManagerView === view.key ? ' sales-manager-filter-active' : '')
    button.textContent = view.label + ' · ' + formatNumber(counts[view.key] || 0)
    button.addEventListener('click', function() {
      setSalesManagerView(view.key)
    })
    row.appendChild(button)
  })
  section.appendChild(row)
  return section
}

function renderMetrics(report) {
  return renderActivePipelineDashboard(report)
}

function renderDashboardExecSummary() {
  var section = el('section', 'sales-exec-summary')
  var purpose = el('article', 'sales-exec-summary-card sales-exec-summary-purpose')
  purpose.appendChild(el('div', 'sales-metric-label', 'Purpose'))
  purpose.appendChild(el('p', null, 'Get Listings Sold (GLS) exists to move stale active listings: assign a sales leader, get the agent to a real game plan, reposition the listing, and track whether it sells or fails.'))
  section.appendChild(purpose)

  var workflow = el('article', 'sales-exec-summary-card')
  workflow.appendChild(el('div', 'sales-metric-label', 'Workflow'))
  var steps = el('div', 'sales-workflow-strip')
  ;['Identify stale', 'Assign owner', 'Create game plan', 'Adjust / reposition', 'Sold or failed'].forEach(function(step) {
    steps.appendChild(el('span', 'sales-workflow-chip', step))
  })
  workflow.appendChild(steps)
  section.appendChild(workflow)
  return section
}

function renderScorePair(label, metric, helper) {
  var item = el('article', 'sales-score-item')
  item.appendChild(el('div', 'sales-gap-title', label))
  item.appendChild(el('div', 'sales-gap-status', formatDualCount(metric || {})))
  if (helper) item.appendChild(el('p', null, helper))
  return item
}

function renderLeaderPerformance(report) {
  var rows = getScoreboard(report).leaderPerformance || []
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Sales leader scoreboard'))
  section.appendChild(el('p', 'sales-panel-copy', 'Who owns active cases and who gets listings repositioned or sold.'))
  if (!rows.length) {
    section.appendChild(el('p', 'empty-state', 'No GLS leader performance yet.'))
    return section
  }
  var table = el('div', 'sales-leader-performance-table')
  ;['Leader', 'Active', 'Plans', 'Adj/Impl', 'Sold', 'Stuck', 'Failed', 'Win rate'].forEach(function(label) {
    table.appendChild(el('div', 'sales-table-head', label))
  })
  rows.forEach(function(row) {
    table.appendChild(el('div', 'sales-table-name', row.name))
    table.appendChild(el('div', null, formatNumber(row.activeCases)))
    table.appendChild(el('div', null, formatNumber(row.gamePlanCases)))
    table.appendChild(el('div', null, formatNumber(row.adjustedOrImplementedCases)))
    table.appendChild(el('div', null, formatNumber(row.soldCases)))
    table.appendChild(el('div', null, formatNumber(row.stuckCases)))
    table.appendChild(el('div', null, formatNumber(row.noActionOrBlockedCases)))
    table.appendChild(el('div', null, formatPercent(row.winRate)))
  })
  section.appendChild(table)
  return section
}

function renderAllTimeFunnel(report) {
  var funnel = getScoreboard(report).allTimeFunnel || {}
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'All-time conversion funnel'))
  section.appendChild(el('p', 'sales-panel-copy', 'Persisted history across active and resolved GLS cases.'))

  var grid = el('div', 'sales-score-grid')
  grid.appendChild(renderScorePair('Identified', funnel.identified, 'Entered GLS after crossing the stale threshold.'))
  grid.appendChild(renderScorePair('Taken on', funnel.takenOn, 'Leader assigned or case moved past identified.'))
  grid.appendChild(renderScorePair('Connected', funnel.connected, 'Agent contacted or later.'))
  grid.appendChild(renderScorePair('Game plan created', funnel.gamePlanCreated, 'Game plan yes or action-plan status.'))
  grid.appendChild(renderScorePair('Implemented', funnel.implemented, 'Plan implemented or listing moved.'))
  grid.appendChild(renderScorePair('Adjusted/relisted', funnel.adjustedRelisted, 'Reset date changed after GLS entry or adjusted outcome.'))
  grid.appendChild(renderScorePair('Conditional/firm', funnel.moved, 'Listing moved to conditional, firm, or closed.'))
  grid.appendChild(renderScorePair('Sold/closed', funnel.soldClosed, 'Outcome or status is closed/sold.'))
  grid.appendChild(renderScorePair('Not taken on', funnel.notTakenOn, 'Identified with no leader/action yet.'))
  grid.appendChild(renderScorePair('No action / blocked', funnel.noActionOrBlocked, 'Reviewed and intentionally not worked or blocked.'))
  section.appendChild(grid)
  return section
}

function renderConversionRates(report) {
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Conversion rates'))
  section.appendChild(el('p', 'sales-panel-copy', 'Case rate is the primary GLS management rate. Listing rate stays beside it so multi-unit projects remain visible.'))
  var list = el('div', 'sales-conversion-list')
  ;(getScoreboard(report).conversionRates || []).forEach(function(rate) {
    var row = el('article', 'sales-conversion-row')
    row.appendChild(el('strong', null, rate.label))
    row.appendChild(el('span', null, 'Cases ' + formatPercent(rate.caseRate) + ' (' + formatNumber(rate.caseNumerator) + '/' + formatNumber(rate.caseDenominator) + ')'))
    row.appendChild(el('span', null, 'Listings ' + formatPercent(rate.listingRate) + ' (' + formatNumber(rate.listingNumerator) + '/' + formatNumber(rate.listingDenominator) + ')'))
    list.appendChild(row)
  })
  section.appendChild(list)
  return section
}

function renderWeeklyCohorts(report) {
  var cohorts = getScoreboard(report).weeklyCohorts || []
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Weekly cohort view'))
  section.appendChild(el('p', 'sales-panel-copy', 'Each row starts with the week a GLS case entered the system and tracks how many cases were taken on, adjusted, sold, or are still open.'))
  if (!cohorts.length) {
    section.appendChild(el('p', 'empty-state', 'No persisted GLS case history with entry dates yet.'))
    return section
  }
  var table = el('div', 'sales-cohort-table')
  table.appendChild(el('div', 'sales-cohort-head', 'Week'))
  table.appendChild(el('div', 'sales-cohort-head', 'Identified'))
  table.appendChild(el('div', 'sales-cohort-head', 'Taken on'))
  table.appendChild(el('div', 'sales-cohort-head', 'Adjusted'))
  table.appendChild(el('div', 'sales-cohort-head', 'Sold'))
  table.appendChild(el('div', 'sales-cohort-head', 'Still open'))
  cohorts.slice(0, 10).forEach(function(cohort) {
    table.appendChild(el('div', null, formatDate(cohort.weekStart)))
    table.appendChild(el('div', null, formatNumber(cohort.casesIdentified)))
    table.appendChild(el('div', null, formatNumber(cohort.takenOnCases)))
    table.appendChild(el('div', null, formatNumber(cohort.adjustedCases)))
    table.appendChild(el('div', null, formatNumber(cohort.soldCases)))
    table.appendChild(el('div', null, formatNumber(cohort.stillOpenCases)))
  })
  section.appendChild(table)
  section.appendChild(el('p', 'sales-source-line', 'Cells show grouped GLS cases.'))
  return section
}

function renderDashboard(report) {
  var wrap = el('div')
  wrap.appendChild(renderHero(report, {
    kicker: 'Get Listings Sold system',
    title: 'Get Listings Sold (GLS) Dashboard',
    subtitle: 'Current active cases first, then total GLS case outcomes across history.',
  }))
  wrap.appendChild(renderDashboardExecSummary())
  wrap.appendChild(renderActivePipelineDashboard(report))
  wrap.appendChild(renderTotalCasesDashboard(report))
  wrap.appendChild(renderLeaderPerformance(report))
  wrap.appendChild(renderWeeklyCohorts(report))
  wrap.appendChild(renderMovedCases(report))
  return wrap
}

function isMovedOutcome(outcomeStatus) {
  return ['adjusted', 'conditional', 'firm', 'closed'].includes(outcomeStatus || '')
}

function renderMovedCases(report) {
  var scoreboard = getScoreboard(report)
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Moved / sold cases'))
  section.appendChild(el('p', 'sales-panel-copy', 'When a stale listing gets adjusted, goes conditional, firms up, or closes, the tracked GLS case shows here so the result does not disappear from the active listing list.'))

  var moved = (scoreboard.movedSoldCases || []).slice(0, 12)

  if (!moved.length) {
    section.appendChild(el('p', 'empty-state', 'No tracked GLS cases have moved, firmed, or closed yet.'))
    return section
  }

  var list = el('div', 'sales-case-list')
  moved.forEach(function(item) {
    var row = el('article', 'sales-case-row')
    var title = el('strong', 'sales-listing-title', item.listingProject || item.key)
    row.appendChild(title)
    row.appendChild(el('div', 'sales-listing-meta', [
      item.agent || 'Unassigned agent',
      item.salesLeader ? 'Leader ' + item.salesLeader : 'No leader assigned',
      item.dateEnteredGls ? 'Entered GLS ' + formatDate(item.dateEnteredGls) : '',
      item.dateAdjusted ? 'Adjusted ' + formatDate(item.dateAdjusted) : '',
      item.daysFromEntryToMovementOrSale != null ? formatNumber(item.daysFromEntryToMovementOrSale) + ' days to movement' : '',
      formatNumber(item.listingCount || 0) + ' listings · ' + formatNumber(item.caseCount || 1) + ' case',
    ].filter(Boolean).join(' · ')))
    var pills = el('div', 'sales-listing-status-row')
    pills.appendChild(renderStatusPill('Outcome: ' + labelFromOptions(report.outcomeStatusOptions || [], item.currentOutcome || 'open', item.currentOutcome || 'open'), getOutcomeClass(item.currentOutcome || 'open')))
    pills.appendChild(renderStatusPill('Case: ' + labelFromOptions(report.caseStatusOptions || [], item.caseStatus || 'identified', item.caseStatus || 'identified'), 'status-pill status-pill-neutral'))
    row.appendChild(pills)
    list.appendChild(row)
  })
  section.appendChild(list)
  return section
}

function renderProjectSuggestions(report, options) {
  var interactive = !options || options.interactive !== false
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Smart project suggestions'))
  section.appendChild(el('p', 'sales-panel-copy', 'When one agent has multiple stale listings at the same base address, GLS flags them as a likely project so the team can handle them with one project-level game plan.'))

  if (!report.projectSuggestions || !report.projectSuggestions.length) {
    section.appendChild(el('p', 'empty-state', 'No likely project groups found in the current stale list.'))
    return section
  }

  var list = el('div', 'sales-project-list')
  report.projectSuggestions.forEach(function(project) {
    var card = el('article', 'sales-project-card')
    var header = el('div', 'sales-project-card-head')
    var headerText = el('div')
    headerText.appendChild(el('div', 'sales-gap-title', project.baseAddress))
    headerText.appendChild(el('div', 'sales-gap-status', project.listingCount + ' listings · ' + project.agent))
    header.appendChild(headerText)
    var statusRow = el('div', 'sales-listing-status-row')
    statusRow.appendChild(renderStatusPill('Leader: ' + (project.assignedLeaderName || 'unassigned'), project.assignedLeaderName ? 'status-pill status-pill-success' : 'status-pill status-pill-neutral'))
    statusRow.appendChild(renderStatusPill('Case: ' + labelFromOptions(report.caseStatusOptions || [], project.caseStatus || 'identified', project.caseStatus || 'identified'), 'status-pill status-pill-neutral'))
    statusRow.appendChild(renderStatusPill('Outcome: ' + labelFromOptions(report.outcomeStatusOptions || [], project.outcomeStatus || 'open', project.outcomeStatus || 'open'), getOutcomeClass(project.outcomeStatus || 'open')))
    statusRow.appendChild(renderStatusPill('Game plan: ' + labelFromOptions(report.actionPlanStateOptions || [], project.actionPlanState || 'unknown', project.actionPlanState || 'unknown'), project.actionPlanState === 'yes' ? 'status-pill status-pill-success' : 'status-pill status-pill-neutral'))
    var snooze = getSnoozeState(project, report)
    if (snooze.active) statusRow.appendChild(renderStatusPill('Snoozed until ' + formatDate(snooze.until), 'status-pill status-pill-warning'))
    if (snooze.expired) statusRow.appendChild(renderStatusPill('Snooze expired ' + formatDate(snooze.until), 'status-pill status-pill-risk'))
    header.appendChild(statusRow)
    card.appendChild(header)
    card.appendChild(el('p', 'sales-project-suggestion', project.suggestion))
    card.appendChild(renderCaseHistory(project.caseHistory || [], 'No project case history yet. The next assignment, game-plan, outcome, or adjustment save will appear here.'))
    if (interactive) {
      card.appendChild(renderProjectControls(project, report))
    } else {
      var link = el('a', 'secondary-button sales-save-button', 'Manage in GLS Manager')
      link.href = '#gls-system'
      card.appendChild(link)
    }
    var ul = el('ul', 'sales-project-member-list')
    ;(project.listings || []).slice(0, 6).forEach(function(listing) {
      ul.appendChild(el('li', null, listing.title + ' · ' + formatNumber(listing.daysSinceReset) + ' days'))
    })
    card.appendChild(ul)
    list.appendChild(card)
  })
  section.appendChild(list)
  return section
}

function renderGlsSystem(report) {
  var wrap = el('div')
  var managerReport = getFilteredSalesManagerReport(report)
  wrap.appendChild(renderHero(report, {
    kicker: 'GLS System work queue',
    title: 'GLS Manager',
    subtitle: 'Manage active stale-listing cases: assign ownership, create the game plan, and update movement.',
  }))
  wrap.appendChild(renderManagerSummary(report))
  wrap.appendChild(renderManagerFilters(report))
  wrap.appendChild(renderProjectSuggestions(managerReport))
  wrap.appendChild(renderOpportunitiesSection(managerReport))
  return wrap
}

function getActionPlanLabel(match) {
  if (!match || match.status === 'source_unavailable') return 'KPI unavailable'
  if (match.status === 'matched_action_plan') return 'Action plan found'
  if (match.status === 'matched_missing_action_plan') return 'Plan missing'
  return 'No KPI match'
}

function getActionPlanClass(match) {
  if (!match || match.status === 'source_unavailable') return 'status-pill status-pill-risk'
  if (match.status === 'matched_action_plan') return 'status-pill status-pill-success'
  if (match.status === 'matched_missing_action_plan') return 'status-pill status-pill-warning'
  return 'status-pill status-pill-neutral'
}

function labelFromOptions(options, key, fallback) {
  var match = (options || []).find(function(option) {
    return option.key === key
  })
  return (match && match.label) || fallback || key || 'Unknown'
}

function getOutcomeClass(outcomeStatus) {
  if (['closed', 'firm'].includes(outcomeStatus)) return 'status-pill status-pill-success'
  if (['conditional', 'adjusted'].includes(outcomeStatus)) return 'status-pill status-pill-warning'
  if (outcomeStatus === 'lost') return 'status-pill status-pill-risk'
  return 'status-pill status-pill-neutral'
}

function getCaseAssignment(item) {
  return item?.salesLeaderAssignment || item || {}
}

function getCaseSnooze(item) {
  var assignment = getCaseAssignment(item)
  return assignment.glsSnooze || item?.glsSnooze || null
}

function getSnoozeState(item, report) {
  var snooze = getCaseSnooze(item)
  var until = snooze && String(snooze.until || '').trim()
  var today = report?.today || getTorontoDateKey()
  var active = Boolean(until && until >= today)
  return {
    active: active,
    until: until || '',
    reason: snooze?.reason || '',
    expired: Boolean(until && until < today),
  }
}

function caseIsSoldClosed(item) {
  var assignment = getCaseAssignment(item)
  var text = [
    assignment.outcomeStatus,
    assignment.caseStatus,
    item?.clickUpStatus,
  ].filter(Boolean).join(' ').toLowerCase()
  return ['firm', 'closed'].includes(assignment.outcomeStatus || '') || /\b(firm|closed|sold)\b/.test(text)
}

function caseIsBlockedFailed(item) {
  var assignment = getCaseAssignment(item)
  return assignment.caseStatus === 'blocked' ||
    ['no_action', 'cancelled', 'expired'].includes(assignment.outcomeStatus || '')
}

function caseHasGamePlan(item) {
  var assignment = getCaseAssignment(item)
  return assignment.actionPlanState === 'yes' ||
    ['action_plan_created', 'action_plan_implemented', 'adjusted', 'closed'].includes(assignment.caseStatus || '')
}

function caseIsAdjusted(item) {
  var assignment = getCaseAssignment(item)
  return assignment.outcomeStatus === 'adjusted' ||
    assignment.caseStatus === 'adjusted' ||
    assignment.caseStatus === 'action_plan_implemented' ||
    Boolean(assignment.adjustedAt || item?.adjustedAt)
}

function caseMatchesManagerView(item, viewKey, report) {
  var assignment = getCaseAssignment(item)
  var snooze = getSnoozeState(item, report)
  var failed = caseIsBlockedFailed(item)
  var soldClosed = caseIsSoldClosed(item)
  var active = !failed && !soldClosed && !snooze.active

  if (viewKey === 'all') return true
  if (viewKey === 'snoozed') return snooze.active
  if (viewKey === 'blocked_failed') return failed
  if (viewKey === 'sold_closed') return soldClosed
  if (viewKey === 'needs_owner') return active && !assignment.assignedLeaderKey
  if (viewKey === 'needs_plan') return active && !caseHasGamePlan(item)
  if (viewKey === 'adjusted') return active && caseIsAdjusted(item)
  return active
}

function countManagerView(report, viewKey) {
  return (report.staleListings || []).filter(function(listing) {
    return caseMatchesManagerView(listing, viewKey, report)
  }).length
}

function setSalesManagerView(viewKey) {
  salesManagerView = SALES_MANAGER_VIEWS.some(function(view) { return view.key === viewKey }) ? viewKey : 'active'
  try {
    if (window.localStorage) window.localStorage.setItem(SALES_MANAGER_VIEW_STORAGE_KEY, salesManagerView)
  } catch (error) {}
  if (currentSalesHubPayload) render(currentSalesHubPayload)
}

function getFilteredSalesManagerReport(report) {
  var viewKey = salesManagerView || 'active'
  var filteredProjectSuggestions = (report.projectSuggestions || []).filter(function(project) {
    return caseMatchesManagerView(project, viewKey, report) ||
      (project.listings || []).some(function(listing) {
        return caseMatchesManagerView(listing, viewKey, report)
      })
  })
  var filteredGroups = (report.groups || []).map(function(group) {
    var listings = (group.listings || []).filter(function(listing) {
      return caseMatchesManagerView(listing, viewKey, report)
    })
    return Object.assign({}, group, {
      listings: listings,
      staleCount: listings.length,
      oldestDays: listings.reduce(function(max, listing) {
        return Math.max(max, listing.daysSinceReset || 0)
      }, 0),
    })
  }).filter(function(group) {
    return group.listings.length > 0
  })

  return Object.assign({}, report, {
    projectSuggestions: filteredProjectSuggestions,
    groups: filteredGroups,
    staleListings: (report.staleListings || []).filter(function(listing) {
      return caseMatchesManagerView(listing, viewKey, report)
    }),
    managerView: viewKey,
    managerViewCounts: Object.fromEntries(SALES_MANAGER_VIEWS.map(function(view) {
      return [view.key, countManagerView(report, view.key)]
    })),
  })
}

function renderStatusPill(label, className) {
  return el('span', className || 'status-pill status-pill-neutral', label)
}

function isNoisyCaseHistoryEvent(event) {
  return event &&
    event.title === 'Current state captured' &&
    (event.source === 'sales-listing-case-sync' || event.actor === 'Sales Hub check' || event.actor === 'GLS sync')
}

function visibleCaseHistory(history) {
  var events = Array.isArray(history) ? history.slice() : []
  var hasMeaningfulEvent = events.some(function(event) {
    return !isNoisyCaseHistoryEvent(event)
  })
  if (!hasMeaningfulEvent) return events
  return events.filter(function(event) {
    return !isNoisyCaseHistoryEvent(event)
  })
}

function renderCaseHistory(history, fallback) {
  var events = visibleCaseHistory(history).reverse()
  var details = document.createElement('details')
  details.className = 'sales-case-history'
  var summary = el('summary', null, 'Case history' + (events.length ? ' · ' + events.length : ''))
  details.appendChild(summary)

  if (!events.length) {
    details.appendChild(el('p', 'sales-case-history-empty', fallback || 'No saved history yet. Future saves will appear here.'))
    return details
  }

  var list = el('div', 'sales-case-history-list')
  events.slice(0, 8).forEach(function(event) {
    var item = el('div', 'sales-case-history-item')
    item.appendChild(el('div', 'sales-case-history-title', event.title || 'Case updated'))
    var meta = [
      event.at ? formatDateTime(event.at) : '',
      event.actor || '',
      event.listingCount > 1 ? 'Applied to ' + formatNumber(event.listingCount) + ' listings' : '',
    ].filter(Boolean).join(' · ')
    if (meta) item.appendChild(el('div', 'sales-case-history-meta', meta))
    if (event.note) item.appendChild(el('p', 'sales-case-history-note', event.note))
    ;(event.changes || []).slice(0, 4).forEach(function(change) {
      item.appendChild(el('div', 'sales-case-history-change', (change.label || change.field) + ': ' + (change.from || 'blank') + ' -> ' + (change.to || 'blank')))
    })
    list.appendChild(item)
  })
  details.appendChild(list)
  return details
}

function stopControlToggle(control) {
  ;['click', 'mousedown', 'pointerdown'].forEach(function(eventName) {
    control.addEventListener(eventName, function(event) {
      event.stopPropagation()
    })
  })
}

function getActionPlanCopy(listing) {
  var match = listing.shoppingListMatch || {}
  if (match.status === 'matched_action_plan') {
    return 'KPI plan: ' + match.actionPlan
  }
  if (match.status === 'matched_missing_action_plan') {
    return 'KPI row matched, but action plan is blank. Sales leader should get the next price/listing action from the agent.'
  }
  if (match.status === 'source_unavailable') {
    return match.reason || 'KPI Shopping List could not be read.'
  }
  return 'No safe KPI Shopping List match. Confirm whether the agent has a Shopping List row for this listing, then create or collect the plan.'
}

function getSalesLeaderName(leaderKey) {
  var report = currentSalesHubPayload && currentSalesHubPayload.listingInventory
  var match = (report?.salesLeaders || []).find(function(leader) {
    return leader.key === leaderKey
  })
  return match ? match.name : ''
}

function finishSalesSave(control, message) {
  if (control) control.disabled = false
  setSalesStatus(message + ' Cards stayed open. Use Refresh from ClickUp when you need source changes.', 'success')
}

function applyCaseUpdates(target, updates) {
  if (!target || !updates) return
  var assignment = target.salesLeaderAssignment || target
  if (Object.prototype.hasOwnProperty.call(updates, 'assignedLeaderKey')) {
    assignment.assignedLeaderKey = updates.assignedLeaderKey || ''
    assignment.assignedLeaderName = getSalesLeaderName(updates.assignedLeaderKey) || ''
  }
  ;['caseStatus', 'outcomeStatus', 'actionPlanState', 'actionPlanNoReason', 'actionPlanText'].forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) assignment[key] = updates[key] || ''
  })
  if (Object.prototype.hasOwnProperty.call(updates, 'snoozeUntil') || Object.prototype.hasOwnProperty.call(updates, 'clearSnooze')) {
    assignment.glsSnooze = updates.clearSnooze ? null : {
      until: updates.snoozeUntil || '',
      reason: updates.snoozeReason || '',
      snoozedAt: new Date().toISOString(),
      snoozedBy: 'Sales Hub user',
    }
    if (target !== assignment) target.glsSnooze = assignment.glsSnooze
  }
}

function saveLeaderAssignment(listing, leaderKey, select) {
  var taskId = listing && listing.taskId
  if (select) select.disabled = true
  setSalesStatus('Saving assignment...', 'info')
  postJson('/api/sales-hub/listing-assignment', {
    taskId: taskId,
    assignedLeaderKey: leaderKey,
  }).then(function() {
    applyCaseUpdates(listing, { assignedLeaderKey: leaderKey })
    finishSalesSave(select, 'Saved assignment.')
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'Sales leader assignment could not be saved.', 'error')
    if (select) select.disabled = false
  })
}

function saveGroupAssignment(group, leaderKey, select) {
  if (select) select.disabled = true
  setSalesStatus('Saving group assignment...', 'info')
  postJson('/api/sales-hub/group-assignment', {
    agentName: group.agent,
    assignedLeaderKey: leaderKey,
  }).then(function(response) {
    ;(group.listings || []).forEach(function(listing) {
      applyCaseUpdates(listing, { assignedLeaderKey: leaderKey })
    })
    finishSalesSave(select, 'Saved ' + formatNumber(response.updatedCount || 0) + ' listings.')
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'Sales leader group assignment could not be saved.', 'error')
    if (select) select.disabled = false
  })
}

function saveProjectUpdate(project, updates, control, message) {
  if (control) control.disabled = true
  setSalesStatus('Saving project case...', 'info')
  postJson('/api/sales-hub/project-case', Object.assign({
    projectKey: project.key,
    assignedLeaderKey: project.assignedLeaderKey || '',
    caseStatus: project.caseStatus || 'identified',
    outcomeStatus: project.outcomeStatus || 'open',
    actionPlanState: project.actionPlanState || 'unknown',
    actionPlanNoReason: project.actionPlanNoReason || '',
    actionPlanText: project.actionPlanText || '',
  }, updates || {})).then(function(response) {
    applyCaseUpdates(project, updates || {})
    ;(project.listings || []).forEach(function(listing) {
      applyCaseUpdates(listing, updates || {})
    })
    finishSalesSave(control, message || ('Saved project case to ' + formatNumber(response.updatedCount || 0) + ' listings.'))
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'GLS project update could not be saved.', 'error')
    if (control) control.disabled = false
  })
}

function saveCaseUpdate(listing, updates, control, message) {
  if (control) control.disabled = true
  setSalesStatus('Saving listing case...', 'info')
  postJson('/api/sales-hub/listing-case', Object.assign({
    taskId: listing.taskId || listing.clickUpTaskId,
    assignedLeaderKey: listing.salesLeaderAssignment?.assignedLeaderKey || listing.assignedLeaderKey || '',
    caseStatus: listing.salesLeaderAssignment?.caseStatus || listing.caseStatus || 'identified',
    outcomeStatus: listing.salesLeaderAssignment?.outcomeStatus || listing.outcomeStatus || 'open',
    actionPlanState: listing.salesLeaderAssignment?.actionPlanState || listing.actionPlanState || 'unknown',
    actionPlanNoReason: listing.salesLeaderAssignment?.actionPlanNoReason || listing.actionPlanNoReason || '',
    actionPlanText: listing.salesLeaderAssignment?.actionPlanText || listing.actionPlanText || '',
  }, updates || {})).then(function() {
    applyCaseUpdates(listing, updates || {})
    finishSalesSave(control, message || 'Saved listing case.')
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'Sales listing case could not be updated.', 'error')
    if (control) control.disabled = false
  })
}

function renderProjectControls(project, report) {
  var wrap = el('div', 'sales-project-controls')
  var pendingActionPlanState = project.actionPlanState || 'unknown'
  wrap.appendChild(renderLeaderSelect(project.assignedLeaderKey || '', report.salesLeaders || [], function(value, select) {
    saveProjectUpdate(project, { assignedLeaderKey: value }, select)
  }, 'Assign sales leader for GLS project ' + project.baseAddress))
  wrap.appendChild(renderCaseSelect('Case status', project.caseStatus || 'identified', report.caseStatusOptions || [], function(value, select) {
    saveProjectUpdate(project, { caseStatus: value }, select)
  }))
  wrap.appendChild(renderCaseSelect('Outcome', project.outcomeStatus || 'open', report.outcomeStatusOptions || [], function(value, select) {
    saveProjectUpdate(project, { outcomeStatus: value }, select)
  }))

  var note = document.createElement('textarea')
  note.className = 'sales-action-plan-note'
  note.rows = 3
  note.placeholder = (project.actionPlanState === 'no') ? 'Why no project-level game plan?' : 'Project-level game plan'
  note.value = (project.actionPlanState === 'no')
    ? (project.actionPlanNoReason || '')
    : (project.actionPlanText || '')
  stopControlToggle(note)
  wrap.appendChild(renderCaseSelect('Game plan?', pendingActionPlanState, report.actionPlanStateOptions || [], function(value) {
    pendingActionPlanState = value
    note.placeholder = (value === 'no') ? 'Why no project-level game plan?' : 'Project-level game plan'
  }))
  wrap.appendChild(note)

  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary-button sales-save-button'
  button.textContent = 'Save to all ' + project.listingCount
  button.addEventListener('click', function() {
    var updates = { actionPlanState: pendingActionPlanState }
    if (pendingActionPlanState === 'yes') updates.caseStatus = 'action_plan_created'
    if (pendingActionPlanState === 'no') {
      updates.actionPlanNoReason = note.value
      updates.actionPlanText = ''
    } else {
      updates.actionPlanText = note.value
      updates.actionPlanNoReason = ''
    }
    saveProjectUpdate(project, updates, button)
  })
  wrap.appendChild(button)
  var clearButton = document.createElement('button')
  clearButton.type = 'button'
  clearButton.className = 'secondary-button sales-save-button'
  clearButton.textContent = 'Clear note'
  clearButton.addEventListener('click', function() {
    note.value = ''
    saveProjectUpdate(project, {
      actionPlanState: pendingActionPlanState,
      actionPlanNoReason: '',
      actionPlanText: '',
    }, clearButton)
  })
  wrap.appendChild(clearButton)
  wrap.appendChild(renderSnoozeControls(project, report, function(updates, control, message) {
    saveProjectUpdate(project, updates, control, message)
  }))
  return wrap
}

function renderLeaderSelect(value, leaders, onChange, ariaLabel) {
  var select = document.createElement('select')
  select.className = 'sales-leader-select'
  if (ariaLabel) select.setAttribute('aria-label', ariaLabel)

  var empty = document.createElement('option')
  empty.value = ''
  empty.textContent = 'Unassigned'
  select.appendChild(empty)

  ;(leaders || []).forEach(function(leader) {
    var option = document.createElement('option')
    option.value = leader.key
    option.textContent = leader.name
    select.appendChild(option)
  })

  select.value = value || ''
  select.addEventListener('change', function() {
    onChange(select.value, select)
  })
  stopControlToggle(select)
  return select
}

function renderLeaderAssignment(listing, leaders) {
  var wrap = el('div', 'sales-leader-assignment')
  var label = el('label', null, 'Sales leader')
  var select = renderLeaderSelect(listing.salesLeaderAssignment?.assignedLeaderKey || '', leaders, function(_value, select) {
    saveLeaderAssignment(listing, select.value, select)
  }, 'Assign sales leader for ' + listing.title)
  label.appendChild(select)
  wrap.appendChild(label)
  return wrap
}

function renderCaseSelect(labelText, value, options, onChange) {
  var label = el('label', null, labelText)
  var select = document.createElement('select')
  select.className = 'sales-leader-select'
  ;(options || []).forEach(function(option) {
    var node = document.createElement('option')
    node.value = option.key
    node.textContent = option.label
    select.appendChild(node)
  })
  select.value = value || (options && options[0] && options[0].key) || ''
  select.addEventListener('change', function() {
    onChange(select.value, select)
  })
  stopControlToggle(select)
  label.appendChild(select)
  return label
}

function renderCaseControls(listing, report) {
  var assignment = listing.salesLeaderAssignment || listing
  var wrap = el('div', 'sales-case-controls')
  wrap.appendChild(renderCaseSelect('Case status', assignment.caseStatus || 'identified', report.caseStatusOptions || [], function(value, select) {
    saveCaseUpdate(listing, { caseStatus: value }, select)
  }))
  wrap.appendChild(renderCaseSelect('Outcome', assignment.outcomeStatus || 'open', report.outcomeStatusOptions || [], function(value, select) {
    saveCaseUpdate(listing, { outcomeStatus: value }, select)
  }))
  return wrap
}

function renderSnoozeControls(target, report, onSave) {
  var wrap = el('div', 'sales-snooze-box')
  var snooze = getSnoozeState(target, report)
  if (snooze.active) {
    wrap.appendChild(el('div', 'sales-snooze-current', 'Snoozed until ' + formatDate(snooze.until)))
  } else if (snooze.expired) {
    wrap.appendChild(el('div', 'sales-snooze-current sales-snooze-expired', 'Snooze expired ' + formatDate(snooze.until)))
  }

  var reason = document.createElement('input')
  reason.type = 'text'
  reason.className = 'sales-snooze-reason'
  reason.placeholder = 'Snooze note'
  reason.value = snooze.reason || ''
  stopControlToggle(reason)
  wrap.appendChild(reason)

  var customRow = el('div', 'sales-snooze-custom')
  var dateInput = document.createElement('input')
  dateInput.type = 'date'
  dateInput.className = 'sales-snooze-date'
  dateInput.min = report.today || getTorontoDateKey()
  dateInput.value = snooze.until || addDaysToDateKey(report.today, 14)
  stopControlToggle(dateInput)
  customRow.appendChild(dateInput)
  var untilButton = document.createElement('button')
  untilButton.type = 'button'
  untilButton.className = 'secondary-button sales-save-button'
  untilButton.textContent = 'Until'
  untilButton.addEventListener('click', function() {
    var until = dateInput.value || addDaysToDateKey(report.today, 14)
    onSave({
      snoozeUntil: until,
      snoozeReason: reason.value,
    }, untilButton, 'Snoozed until ' + formatDate(until) + '.')
  })
  customRow.appendChild(untilButton)
  wrap.appendChild(customRow)

  var quickRow = el('div', 'sales-snooze-actions')
  ;[
    { label: '2w', days: 14 },
    { label: '30d', days: 30 },
  ].forEach(function(option) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'secondary-button sales-save-button'
    button.textContent = option.label
    button.addEventListener('click', function() {
      var until = addDaysToDateKey(report.today, option.days)
      onSave({
        snoozeUntil: until,
        snoozeReason: reason.value,
      }, button, 'Snoozed until ' + formatDate(until) + '.')
    })
    quickRow.appendChild(button)
  })

  var clear = document.createElement('button')
  clear.type = 'button'
  clear.className = 'secondary-button sales-save-button'
  clear.textContent = 'Clear'
  clear.disabled = !snooze.until
  clear.addEventListener('click', function() {
    onSave({
      clearSnooze: true,
      snoozeUntil: '',
      snoozeReason: '',
    }, clear, 'Snooze cleared.')
  })
  quickRow.appendChild(clear)
  wrap.appendChild(quickRow)
  return wrap
}

function renderActionPlanControls(listing, report) {
  var assignment = listing.salesLeaderAssignment || listing
  var wrap = el('div', 'sales-action-plan-box')
  var pendingActionPlanState = assignment.actionPlanState || 'unknown'

  var note = document.createElement('textarea')
  note.className = 'sales-action-plan-note'
  note.rows = 3
  note.placeholder = (assignment.actionPlanState === 'no') ? 'Why no action plan?' : 'Plan / next move'
  note.value = (assignment.actionPlanState === 'no')
      ? (assignment.actionPlanNoReason || '')
      : (assignment.actionPlanText || '')
  stopControlToggle(note)
  wrap.appendChild(renderCaseSelect('Game plan?', pendingActionPlanState, report.actionPlanStateOptions || [], function(value) {
    pendingActionPlanState = value
    note.placeholder = (value === 'no') ? 'Why no action plan?' : 'Plan / next move'
  }))
  wrap.appendChild(note)

  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary-button sales-save-button'
  button.textContent = 'Save game plan'
  button.addEventListener('click', function() {
    var updates = { actionPlanState: pendingActionPlanState }
    if (pendingActionPlanState === 'yes') updates.caseStatus = 'action_plan_created'
    if (pendingActionPlanState === 'no') {
      updates.actionPlanNoReason = note.value
      updates.actionPlanText = ''
    } else {
      updates.actionPlanText = note.value
      updates.actionPlanNoReason = ''
    }
    saveCaseUpdate(listing, updates, button)
  })
  wrap.appendChild(button)
  var clearButton = document.createElement('button')
  clearButton.type = 'button'
  clearButton.className = 'secondary-button sales-save-button'
  clearButton.textContent = 'Clear note'
  clearButton.addEventListener('click', function() {
    note.value = ''
    saveCaseUpdate(listing, {
      actionPlanState: pendingActionPlanState,
      actionPlanNoReason: '',
      actionPlanText: '',
    }, clearButton)
  })
  wrap.appendChild(clearButton)
  return wrap
}

function renderListing(listing, report) {
  var item = el('article', 'sales-listing-row')
  var main = el('div', 'sales-listing-main')
  var title = el('a', 'sales-listing-title', listing.title)
  title.href = listing.url
  title.target = '_blank'
  title.rel = 'noopener noreferrer'
  main.appendChild(title)
  var assignment = listing.salesLeaderAssignment || listing
  var outcomeStatus = assignment.outcomeStatus || listing.outcomeStatus || 'open'
  var caseStatus = assignment.caseStatus || listing.caseStatus || 'identified'
  main.appendChild(el('div', 'sales-listing-meta', [
    formatNumber(listing.daysSinceReset) + ' days',
    'Reset ' + formatDate(listing.resetDate),
    listing.clickUpStatus,
    listing.price ? 'Price ' + listing.price : '',
    'Leader ' + (assignment.assignedLeaderName || 'unassigned'),
    'Case ' + labelFromOptions(report.caseStatusOptions || [], caseStatus, caseStatus),
    'Outcome ' + labelFromOptions(report.outcomeStatusOptions || [], outcomeStatus, outcomeStatus),
  ].filter(Boolean).join(' · ')))
  var pills = el('div', 'sales-listing-status-row')
  pills.appendChild(renderStatusPill('Case: ' + labelFromOptions(report.caseStatusOptions || [], caseStatus, caseStatus), 'status-pill status-pill-neutral'))
  pills.appendChild(renderStatusPill('Outcome: ' + labelFromOptions(report.outcomeStatusOptions || [], outcomeStatus, outcomeStatus), getOutcomeClass(outcomeStatus)))
  pills.appendChild(renderStatusPill('Game plan: ' + labelFromOptions(report.actionPlanStateOptions || [], assignment.actionPlanState || 'unknown', assignment.actionPlanState || 'unknown'), (assignment.actionPlanState === 'yes') ? 'status-pill status-pill-success' : 'status-pill status-pill-neutral'))
  var snooze = getSnoozeState(listing, report)
  if (snooze.active) pills.appendChild(renderStatusPill('Snoozed until ' + formatDate(snooze.until), 'status-pill status-pill-warning'))
  if (snooze.expired) pills.appendChild(renderStatusPill('Snooze expired ' + formatDate(snooze.until), 'status-pill status-pill-risk'))
  main.appendChild(pills)
  item.appendChild(main)

  var next = el('div', 'sales-listing-next')
  next.appendChild(renderLeaderAssignment(listing, report.salesLeaders || []))
  next.appendChild(renderCaseControls(listing, report))
  next.appendChild(renderActionPlanControls(listing, report))
  next.appendChild(renderSnoozeControls(listing, report, function(updates, control, message) {
    saveCaseUpdate(listing, updates, control, message)
  }))
  next.appendChild(el('span', getActionPlanClass(listing.shoppingListMatch), getActionPlanLabel(listing.shoppingListMatch)))
  next.appendChild(el('span', 'sales-listing-next-copy', getActionPlanCopy(listing)))
  next.appendChild(renderCaseHistory(assignment.caseHistory || [], 'No listing case history yet. The next save will appear here.'))
  item.appendChild(next)
  return item
}

function renderAgentGroup(group, report) {
  var details = document.createElement('details')
  details.className = 'sales-agent-group'

  var summary = el('summary', 'sales-agent-summary')
  var left = el('div')
  left.appendChild(el('strong', null, group.agent))
  left.appendChild(renderAgentStats(group))
  summary.appendChild(left)
  var right = el('div', 'sales-agent-actions')
  right.appendChild(renderLeaderSelect('', report.salesLeaders || [], function(value, select) {
    saveGroupAssignment(group, value, select)
  }, 'Assign all stale listings for ' + group.agent))
  summary.appendChild(right)
  details.appendChild(summary)

  var body = el('div', 'sales-agent-body')
  group.listings.forEach(function(listing) {
    body.appendChild(renderListing(listing, report))
  })
  details.appendChild(body)
  return details
}

function renderAgentStats(group) {
  var listings = group.listings || []
  var assigned = listings.filter(function(listing) {
    return Boolean(listing.salesLeaderAssignment?.assignedLeaderKey)
  }).length
  var planYes = listings.filter(function(listing) {
    return listing.salesLeaderAssignment?.actionPlanState === 'yes'
  }).length
  var adjusted = listings.filter(function(listing) {
    return isMovedOutcome(listing.salesLeaderAssignment?.outcomeStatus || '')
  }).length

  var wrap = el('div', 'sales-agent-pill-row')
  wrap.appendChild(el('span', 'sales-agent-pill', group.staleCount + ' stale'))
  wrap.appendChild(el('span', 'sales-agent-pill', 'oldest ' + group.oldestDays + 'd'))
  wrap.appendChild(el('span', assigned ? 'sales-agent-pill sales-agent-pill-good' : 'sales-agent-pill', assigned + ' assigned'))
  wrap.appendChild(el('span', planYes ? 'sales-agent-pill sales-agent-pill-good' : 'sales-agent-pill', planYes + ' plans'))
  wrap.appendChild(el('span', adjusted ? 'sales-agent-pill sales-agent-pill-good' : 'sales-agent-pill', adjusted + ' moved'))
  return wrap
}

function renderOpportunitiesSection(report) {
  var section = el('section', 'sales-panel')
  var projectTaskIds = new Set()
  ;(report.projectSuggestions || []).forEach(function(project) {
    ;(project.taskIds || []).forEach(function(taskId) {
      projectTaskIds.add(taskId)
    })
  })
  var individualGroups = (report.groups || []).map(function(group) {
    var listings = (group.listings || []).filter(function(listing) {
      return !projectTaskIds.has(listing.taskId)
    })
    return Object.assign({}, group, {
      listings: listings,
      staleCount: listings.length,
      oldestDays: listings.reduce(function(max, listing) {
        return Math.max(max, listing.daysSinceReset || 0)
      }, 0),
    })
  }).filter(function(group) {
    return group.listings.length > 0
  })

  section.appendChild(el('h2', null, 'Individual listing rows'))
  section.appendChild(el('p', 'sales-panel-copy', 'Use these rows only when the listing is not part of a grouped project. Project members are managed from the project cards above.'))

  if (!individualGroups.length) {
    section.appendChild(el('p', 'empty-state', 'All current stale listings are covered by project cards or there are no individual stale listings right now.'))
  } else {
    individualGroups.forEach(function(group) {
      section.appendChild(renderAgentGroup(group, report))
    })
  }

  return section
}

function renderStaleListings(report) {
  var wrap = el('div')
  wrap.appendChild(renderHero(report))
  wrap.appendChild(renderMetrics(report))
  wrap.appendChild(renderProjectSuggestions(report))
  wrap.appendChild(renderOpportunitiesSection(report))
  return wrap
}

function renderCases(report) {
  var wrap = el('div')
  wrap.appendChild(renderHero(report))
  wrap.appendChild(renderMetrics(report))

  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'GLS cases'))
  section.appendChild(el('p', 'sales-panel-copy', 'AIOS keeps these cases after a listing is adjusted, so the work does not disappear just because the ClickUp reset date changes.'))

  if (!report.trackedCases || !report.trackedCases.length) {
    section.appendChild(el('p', 'empty-state', 'No tracked cases yet. Run the stale-listing case sync from the Sales Hub proof command.'))
  } else {
    var list = el('div', 'sales-case-list')
    report.trackedCases.forEach(function(item) {
      var row = el('article', 'sales-case-row')
      var title = item.listingUrl ? el('a', 'sales-listing-title', item.listingTitle || item.clickUpTaskId) : el('strong', 'sales-listing-title', item.listingTitle || item.clickUpTaskId)
      if (item.listingUrl) {
        title.href = item.listingUrl
        title.target = '_blank'
        title.rel = 'noopener noreferrer'
      }
      row.appendChild(title)
      row.appendChild(el('div', 'sales-listing-meta', [
        item.agentName || 'Unassigned agent',
        item.assignedLeaderName ? 'Leader ' + item.assignedLeaderName : 'No leader assigned',
        item.staleSinceDate ? 'Hit stale ' + formatDate(item.staleSinceDate) : '',
        item.adjustedAt ? 'Adjusted ' + formatDate(item.adjustedAt) : '',
      ].filter(Boolean).join(' · ')))
      var casePills = el('div', 'sales-listing-status-row')
      casePills.appendChild(renderStatusPill('Case: ' + labelFromOptions(report.caseStatusOptions || [], item.caseStatus || 'identified', item.caseStatus || 'identified'), 'status-pill status-pill-neutral'))
      casePills.appendChild(renderStatusPill('Outcome: ' + labelFromOptions(report.outcomeStatusOptions || [], item.outcomeStatus || 'open', item.outcomeStatus || 'open'), getOutcomeClass(item.outcomeStatus || 'open')))
      casePills.appendChild(renderStatusPill('Game plan: ' + labelFromOptions(report.actionPlanStateOptions || [], item.actionPlanState || 'unknown', item.actionPlanState || 'unknown'), item.actionPlanState === 'yes' ? 'status-pill status-pill-success' : 'status-pill status-pill-neutral'))
      row.appendChild(casePills)
      row.appendChild(renderCaseControls(item, report))
      row.appendChild(renderActionPlanControls(item, report))
      row.appendChild(renderCaseHistory(item.caseHistory || [], 'No case history yet. The next save will appear here.'))
      list.appendChild(row)
    })
    section.appendChild(list)
  }

  wrap.appendChild(section)
  return wrap
}

function renderPlaybooks(report) {
  var system = getGlsSystem(report)
  var wrap = el('div')
  wrap.appendChild(renderHero(report))

  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'GLS playbooks'))
  section.appendChild(el('p', 'sales-panel-copy', 'Playbooks are strategy options sales leaders can use with an agent after a stale listing is identified. The current source-backed playbook is Nick’s Aggressive Underlisting framework.'))

  var list = el('div', 'sales-playbook-list')
  ;(system.playbooks || []).forEach(function(playbook) {
    var card = el('article', 'sales-playbook-card')
    var title = el('a', 'sales-listing-title', playbook.title)
    title.href = playbook.sourceUrl
    title.target = '_blank'
    title.rel = 'noopener noreferrer'
    card.appendChild(title)
    card.appendChild(el('p', 'sales-panel-copy', playbook.fitRule))

    var phases = el('div', 'sales-playbook-section')
    phases.appendChild(el('h3', null, 'Phases'))
    var phaseList = el('ol')
    ;(playbook.phases || []).forEach(function(phase) {
      phaseList.appendChild(el('li', null, phase))
    })
    phases.appendChild(phaseList)
    card.appendChild(phases)

    var checklist = el('div', 'sales-playbook-section')
    checklist.appendChild(el('h3', null, 'Checklist'))
    var checklistList = el('ul')
    ;(playbook.checklist || []).forEach(function(item) {
      checklistList.appendChild(el('li', null, item))
    })
    checklist.appendChild(checklistList)
    card.appendChild(checklist)

    var results = el('div', 'sales-playbook-section')
    results.appendChild(el('h3', null, 'Results to track'))
    var resultList = el('ul')
    ;(playbook.resultFields || []).forEach(function(item) {
      resultList.appendChild(el('li', null, item))
    })
    results.appendChild(resultList)
    card.appendChild(results)

    card.appendChild(el('p', 'sales-source-line', playbook.sourceId + ' · ' + playbook.sourceName))
    list.appendChild(card)
  })
  section.appendChild(list)
  wrap.appendChild(section)
  return wrap
}

function renderResults(report) {
  var gaps = report.fieldGaps || {}
  var summary = report.summary || {}
  var wrap = el('div')
  wrap.appendChild(renderHero(report))
  wrap.appendChild(renderMetrics(report))

  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'GLS results and gaps'))
  section.appendChild(el('p', 'sales-panel-copy', 'Use this to see what the system can prove now and what still needs a stronger source or weekly snapshot.'))

  var list = el('div', 'sales-gap-list')
  var actionPlan = gaps.actionPlanTracking || {}
  var shopping = report.shoppingList || {}
  list.appendChild(renderGap('Identified', formatNumber(summary.staleActiveListings || 0), 'Active listings currently inside GLS because their list date / last price adjustment is over the threshold.'))
  list.appendChild(renderGap('Assigned', formatNumber(summary.assignedSalesLeader || 0), 'Cases with a sales leader assigned to own the agent conversation.'))
  list.appendChild(renderGap('Connected with agent', formatNumber(summary.caseAgentConnected || 0), 'Case has reached agent contacted or later in the GLS workflow.'))
  list.appendChild(renderGap('Game plan yes', formatNumber(summary.caseActionPlanYes || 0), 'AIOS case says the agent has a game plan. KPI Shopping List is supporting evidence only.'))
  list.appendChild(renderGap('Implemented', formatNumber(summary.caseImplemented || 0), 'The plan has been implemented or the listing has moved through adjustment/outcome proof.'))
  list.appendChild(renderGap('Adjusted or moved', formatNumber(summary.caseAdjustedOrMoved || 0), 'Cases where ClickUp reset date or case outcome shows movement.'))
  list.appendChild(renderGap('KPI action-plan match', formatNumber(shopping.withActionPlan || 0) + ' found', 'Matched stale listings to KPI Shopping List only when the address match is safe. Unmatched rows need a confirmed KPI row or a new GLS plan.'))
  list.appendChild(renderGap('Weekly trend', 'Next gap', 'A weekly snapshot will prove new stale, still stale, adjusted/relisted, conditional, firm, closed, and no-longer-active movement.'))
  list.appendChild(renderGap('Missing source data', formatNumber(summary.missingResetDate + summary.missingAgent) + ' active rows', 'Rows missing reset date or agent cannot be managed cleanly.'))
  section.appendChild(list)

  if (actionPlan.recommendedFields && actionPlan.recommendedFields.length) {
    var fields = el('div', 'sales-recommended-fields')
    fields.appendChild(el('h3', null, 'Recommended next ClickUp fields'))
    var ul = el('ul')
    actionPlan.recommendedFields.forEach(function(field) {
      ul.appendChild(el('li', null, field))
    })
    fields.appendChild(ul)
    section.appendChild(fields)
  }

  wrap.appendChild(section)
  return wrap
}

function renderGap(title, status, copy) {
  var item = el('article', 'sales-gap-item')
  item.appendChild(el('div', 'sales-gap-title', title))
  item.appendChild(el('div', 'sales-gap-status', status))
  item.appendChild(el('p', null, copy))
  return item
}

function renderError(error) {
  var wrap = el('section', 'sales-panel')
  wrap.appendChild(el('h1', null, 'Sales Hub could not load'))
  wrap.appendChild(el('p', 'sales-panel-copy', error && error.message ? error.message : 'Unknown error.'))
  wrap.appendChild(el('p', 'sales-panel-copy', 'Check the ClickUp token and rerun the Sales Hub check.'))
  return wrap
}

function render(payload) {
  currentSalesHubPayload = payload || null
  var section = getSection()
  if (!['gls-dashboard', 'gls-system', 'gls-opportunities', 'gls-cases', 'gls-playbooks', 'gls-results'].includes(section)) section = 'gls-dashboard'
  setActiveNav(section)
  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  var root = document.getElementById('sales-content')
  clearNode(root)
  var report = payload.listingInventory
  if (section === 'gls-system') root.appendChild(renderGlsSystem(report))
  else if (section === 'gls-opportunities') root.appendChild(renderStaleListings(report))
  else if (section === 'gls-cases') root.appendChild(renderCases(report))
  else if (section === 'gls-playbooks') root.appendChild(renderPlaybooks(report))
  else if (section === 'gls-results') root.appendChild(renderResults(report))
  else root.appendChild(renderDashboard(report))
}

function load(options) {
  var url = options && options.refresh ? '/api/sales-hub?refresh=1' : '/api/sales-hub'
  fetchJson(url)
    .then(function(payload) {
      render(payload)
      if (options && options.refresh) {
        setSalesStatus('Fresh ClickUp data loaded: ' + formatDateTime(payload.listingInventory?.generatedAt), 'success')
      }
    })
    .catch(function(error) {
      var root = document.getElementById('sales-content')
      clearNode(root)
      root.appendChild(renderError(error))
    })
}

var toggle = document.getElementById('found-mobile-toggle')
if (toggle) {
  toggle.addEventListener('click', function() {
    var nav = document.getElementById('found-nav')
    if (nav) nav.classList.toggle('found-nav-open')
  })
}

window.addEventListener('hashchange', load)
load()
