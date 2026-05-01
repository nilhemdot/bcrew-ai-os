var SALES_SECTION_ALIASES = {
  '': 'gls-dashboard',
  'gls-system': 'gls-system',
  'stale-listings': 'gls-opportunities',
  opportunities: 'gls-opportunities',
  cases: 'gls-cases',
  gaps: 'gls-results',
  results: 'gls-results',
  playbooks: 'gls-playbooks',
}

function normalizeSection(raw) {
  var key = String(raw || '').replace('#', '')
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
  var activeSection = section === 'gls-dashboard' ? 'gls-dashboard' : 'gls-system'
  document.querySelectorAll('.found-nav-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.section === activeSection)
  })
  var labels = {
    'gls-dashboard': 'GLS Dashboard',
    'gls-system': 'GLS System',
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

function renderMetric(label, value, helper) {
  var card = el('article', 'sales-metric')
  card.appendChild(el('div', 'sales-metric-label', label))
  card.appendChild(el('div', 'sales-metric-value', formatNumber(value)))
  if (helper) card.appendChild(el('p', 'sales-metric-helper', helper))
  return card
}

function renderHero(report) {
  var system = getGlsSystem(report)
  var hero = el('section', 'sales-hero')
  var left = el('div')
  left.appendChild(el('div', 'found-brand-kicker', 'Sales Hub system'))
  left.appendChild(el('h1', 'sales-title', system.name))
  left.appendChild(el('p', 'sales-subtitle', system.fullName + ': ' + system.purpose))
  hero.appendChild(left)

  var action = el('div', 'sales-hero-action')
  var link = el('a', 'primary-button', 'Open ClickUp View')
  link.href = report.source.clickUpViewUrl
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  action.appendChild(link)
  action.appendChild(el('p', 'sales-source-line', report.source.sourceId + ' · Active listings only · ' + (report.thresholdDays || 30) + '+ day threshold'))
  hero.appendChild(action)
  return hero
}

function renderMetrics(report) {
  var scoreboard = getScoreboard(report)
  var active = scoreboard.activePipeline || {}
  var outcomes = scoreboard.outcomeSummary || {}
  var grid = el('section', 'sales-metric-grid')
  grid.appendChild(renderMetric('Active GLS cases', active.total?.caseCount, formatCaseMetric(active.total)))
  grid.appendChild(renderMetric('Assigned', active.takenOn?.caseCount, formatCaseMetric(active.takenOn)))
  grid.appendChild(renderMetric('Game plans', active.gamePlanCreated?.caseCount, formatCaseMetric(active.gamePlanCreated)))
  grid.appendChild(renderMetric('Adjusted / implemented', outcomes.adjustedOrImplemented?.caseCount, formatCaseMetric(outcomes.adjustedOrImplemented)))
  grid.appendChild(renderMetric('Sold', outcomes.soldClosed?.caseCount, formatCaseMetric(outcomes.soldClosed)))
  grid.appendChild(renderMetric('Stuck', active.stuck?.caseCount, (active.stuckThresholdDays || 14) + '+ days open.'))
  grid.appendChild(renderMetric('Failed', outcomes.failed?.caseCount, 'No action, blocked, cancelled, or expired.'))
  return grid
}

function renderScorePair(label, metric, helper) {
  var item = el('article', 'sales-score-item')
  item.appendChild(el('div', 'sales-gap-title', label))
  item.appendChild(el('div', 'sales-gap-status', formatDualCount(metric || {})))
  if (helper) item.appendChild(el('p', null, helper))
  return item
}

function renderActivePipeline(report) {
  var scoreboard = getScoreboard(report)
  var active = scoreboard.activePipeline || {}
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Active GLS work'))
  section.appendChild(el('p', 'sales-panel-copy', 'Cases still being worked. Adjusted/repositioned, sold, and failed cases leave this section.'))

  var grid = el('div', 'sales-score-grid')
  grid.appendChild(renderScorePair('Needs owner', active.unassigned))
  grid.appendChild(renderScorePair('Assigned', active.takenOn))
  grid.appendChild(renderScorePair('Game plan', active.gamePlanCreated))
  grid.appendChild(renderScorePair('Stuck', active.stuck, (active.stuckThresholdDays || 14) + '+ days open. Oldest active case: ' + formatDays(active.oldestActiveDays)))
  section.appendChild(grid)
  return section
}

function renderOutcomes(report) {
  var scoreboard = getScoreboard(report)
  var outcomes = scoreboard.outcomeSummary || {}
  var resolved = scoreboard.resolvedResults || {}
  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'GLS outcomes'))
  section.appendChild(el('p', 'sales-panel-copy', 'The goal is to reposition the listing or get it sold. Failed means no action, blocked, cancelled, or expired.'))

  var grid = el('div', 'sales-score-grid')
  grid.appendChild(renderScorePair('Adjusted / implemented', outcomes.adjustedOrImplemented))
  grid.appendChild(renderScorePair('Sold', outcomes.soldClosed))
  grid.appendChild(renderScorePair('Failed', outcomes.failed))
  var avg = el('article', 'sales-score-item')
  avg.appendChild(el('div', 'sales-gap-title', 'Avg days to outcome'))
  avg.appendChild(el('div', 'sales-gap-status', formatDays(resolved.averageDaysToResolution)))
  grid.appendChild(avg)
  section.appendChild(grid)
  return section
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
  section.appendChild(el('p', 'sales-panel-copy', 'Each row starts with the week a listing entered GLS and tracks how much of that cohort was taken on, adjusted, sold, or is still open.'))
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
    table.appendChild(el('div', null, formatNumber(cohort.listingsIdentified) + ' / ' + formatNumber(cohort.casesIdentified)))
    table.appendChild(el('div', null, formatNumber(cohort.takenOnListings) + ' / ' + formatNumber(cohort.takenOnCases)))
    table.appendChild(el('div', null, formatNumber(cohort.adjustedListings) + ' / ' + formatNumber(cohort.adjustedCases)))
    table.appendChild(el('div', null, formatNumber(cohort.soldListings) + ' / ' + formatNumber(cohort.soldCases)))
    table.appendChild(el('div', null, formatNumber(cohort.stillOpenListings) + ' / ' + formatNumber(cohort.stillOpenCases)))
  })
  section.appendChild(table)
  section.appendChild(el('p', 'sales-source-line', 'Cells show listings / grouped cases.'))
  return section
}

function renderDashboard(report) {
  var wrap = el('div')
  wrap.appendChild(renderHero(report))
  wrap.appendChild(renderMetrics(report))
  wrap.appendChild(renderActivePipeline(report))
  wrap.appendChild(renderOutcomes(report))
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
    card.appendChild(el('div', 'sales-gap-title', project.baseAddress))
    card.appendChild(el('div', 'sales-gap-status', project.listingCount + ' listings · ' + project.agent))
    var statusRow = el('div', 'sales-listing-status-row')
    statusRow.appendChild(renderStatusPill('Leader: ' + (project.assignedLeaderName || 'unassigned'), project.assignedLeaderName ? 'status-pill status-pill-success' : 'status-pill status-pill-neutral'))
    statusRow.appendChild(renderStatusPill('Case: ' + labelFromOptions(report.caseStatusOptions || [], project.caseStatus || 'identified', project.caseStatus || 'identified'), 'status-pill status-pill-neutral'))
    statusRow.appendChild(renderStatusPill('Outcome: ' + labelFromOptions(report.outcomeStatusOptions || [], project.outcomeStatus || 'open', project.outcomeStatus || 'open'), getOutcomeClass(project.outcomeStatus || 'open')))
    statusRow.appendChild(renderStatusPill('Game plan: ' + labelFromOptions(report.actionPlanStateOptions || [], project.actionPlanState || 'unknown', project.actionPlanState || 'unknown'), project.actionPlanState === 'yes' ? 'status-pill status-pill-success' : 'status-pill status-pill-neutral'))
    card.appendChild(statusRow)
    card.appendChild(el('p', null, project.suggestion))
    if (interactive) {
      card.appendChild(renderProjectControls(project, report))
    } else {
      var link = el('a', 'secondary-button sales-save-button', 'Manage in GLS System')
      link.href = '#gls-system'
      card.appendChild(link)
    }
    var ul = el('ul')
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
  wrap.appendChild(renderHero(report))
  wrap.appendChild(renderMetrics(report))
  wrap.appendChild(renderProjectSuggestions(report))
  wrap.appendChild(renderOpportunitiesSection(report))
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

function renderStatusPill(label, className) {
  return el('span', className || 'status-pill status-pill-neutral', label)
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

function saveLeaderAssignment(taskId, leaderKey, select) {
  if (select) select.disabled = true
  setSalesStatus('Saving assignment...', 'info')
  postJson('/api/sales-hub/listing-assignment', {
    taskId: taskId,
    assignedLeaderKey: leaderKey,
  }).then(function() {
    setSalesStatus('Saved. Refreshing GLS data...', 'success')
    load({ refresh: true })
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'Sales leader assignment could not be saved.', 'error')
    if (select) select.disabled = false
  })
}

function saveGroupAssignment(agentName, leaderKey, select) {
  if (select) select.disabled = true
  setSalesStatus('Saving group assignment...', 'info')
  postJson('/api/sales-hub/group-assignment', {
    agentName: agentName,
    assignedLeaderKey: leaderKey,
  }).then(function(response) {
    setSalesStatus('Saved ' + formatNumber(response.updatedCount || 0) + ' listings. Refreshing GLS data...', 'success')
    load({ refresh: true })
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'Sales leader group assignment could not be saved.', 'error')
    if (select) select.disabled = false
  })
}

function saveProjectUpdate(project, updates, control) {
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
    setSalesStatus('Saved project case to ' + formatNumber(response.updatedCount || 0) + ' listings. Refreshing GLS data...', 'success')
    load({ refresh: true })
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'GLS project update could not be saved.', 'error')
    if (control) control.disabled = false
  })
}

function saveCaseUpdate(listing, updates, control) {
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
    setSalesStatus('Saved listing case. Refreshing GLS data...', 'success')
    load({ refresh: true })
  }).catch(function(error) {
    setSalesStatus(error && error.message ? error.message : 'Sales listing case could not be updated.', 'error')
    if (control) control.disabled = false
  })
}

function renderProjectControls(project, report) {
  var wrap = el('div', 'sales-project-controls')
  wrap.appendChild(renderLeaderSelect(project.assignedLeaderKey || '', report.salesLeaders || [], function(value, select) {
    saveProjectUpdate(project, { assignedLeaderKey: value }, select)
  }, 'Assign sales leader for GLS project ' + project.baseAddress))
  wrap.appendChild(renderCaseSelect('Case status', project.caseStatus || 'identified', report.caseStatusOptions || [], function(value, select) {
    saveProjectUpdate(project, { caseStatus: value }, select)
  }))
  wrap.appendChild(renderCaseSelect('Outcome', project.outcomeStatus || 'open', report.outcomeStatusOptions || [], function(value, select) {
    saveProjectUpdate(project, { outcomeStatus: value }, select)
  }))
  wrap.appendChild(renderCaseSelect('Game plan?', project.actionPlanState || 'unknown', report.actionPlanStateOptions || [], function(value, select) {
    var updates = { actionPlanState: value }
    if (value === 'yes') updates.caseStatus = 'action_plan_created'
    saveProjectUpdate(project, updates, select)
  }))

  var note = document.createElement('textarea')
  note.className = 'sales-action-plan-note'
  note.rows = 3
  note.placeholder = (project.actionPlanState === 'no') ? 'Why no project-level game plan?' : 'Project-level game plan'
  note.value = (project.actionPlanState === 'no')
    ? (project.actionPlanNoReason || '')
    : (project.actionPlanText || '')
  stopControlToggle(note)
  wrap.appendChild(note)

  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary-button sales-save-button'
  button.textContent = 'Save to all ' + project.listingCount
  button.addEventListener('click', function() {
    var updates = {}
    if ((project.actionPlanState || 'unknown') === 'no') {
      updates.actionPlanNoReason = note.value
    } else {
      updates.actionPlanText = note.value
    }
    saveProjectUpdate(project, updates, button)
  })
  wrap.appendChild(button)
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
    saveLeaderAssignment(listing.taskId, select.value, select)
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

function renderActionPlanControls(listing, report) {
  var assignment = listing.salesLeaderAssignment || listing
  var wrap = el('div', 'sales-action-plan-box')
  wrap.appendChild(renderCaseSelect('Game plan?', assignment.actionPlanState || 'unknown', report.actionPlanStateOptions || [], function(value, select) {
    var updates = { actionPlanState: value }
    if (value === 'yes') updates.caseStatus = 'action_plan_created'
    saveCaseUpdate(listing, updates, select)
  }))

  var note = document.createElement('textarea')
  note.className = 'sales-action-plan-note'
  note.rows = 3
  note.placeholder = (assignment.actionPlanState === 'no') ? 'Why no action plan?' : 'Plan / next move'
  note.value = (assignment.actionPlanState === 'no')
      ? (assignment.actionPlanNoReason || '')
      : (assignment.actionPlanText || '')
  stopControlToggle(note)
  wrap.appendChild(note)

  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary-button sales-save-button'
  button.textContent = 'Save game plan'
  button.addEventListener('click', function() {
    var updates = {}
    if ((assignment.actionPlanState || 'unknown') === 'no') {
      updates.actionPlanNoReason = note.value
    } else {
      updates.actionPlanText = note.value
    }
    saveCaseUpdate(listing, updates, button)
  })
  wrap.appendChild(button)
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
  main.appendChild(pills)
  item.appendChild(main)

  var next = el('div', 'sales-listing-next')
  next.appendChild(renderLeaderAssignment(listing, report.salesLeaders || []))
  next.appendChild(renderCaseControls(listing, report))
  next.appendChild(renderActionPlanControls(listing, report))
  next.appendChild(el('span', getActionPlanClass(listing.shoppingListMatch), getActionPlanLabel(listing.shoppingListMatch)))
  next.appendChild(el('span', 'sales-listing-next-copy', getActionPlanCopy(listing)))
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
    saveGroupAssignment(group.agent, value, select)
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
  var section = getSection()
  if (!['gls-dashboard', 'gls-system', 'gls-opportunities', 'gls-cases', 'gls-playbooks', 'gls-results'].includes(section)) section = 'gls-dashboard'
  setActiveNav(section)

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
    .then(render)
    .catch(function(error) {
      var root = document.getElementById('sales-content')
      clearNode(root)
      root.appendChild(renderError(error))
    })
}

var toggle = document.getElementById('found-mobile-toggle')
if (toggle) {
  toggle.addEventListener('click', function() {
    var sidebar = document.getElementById('found-sidebar')
    if (sidebar) sidebar.classList.toggle('found-sidebar-open')
  })
}

window.addEventListener('hashchange', load)
load()
