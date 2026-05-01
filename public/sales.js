function getSection() {
  return window.location.hash.replace('#', '') || 'stale-listings'
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

function setActiveNav(section) {
  document.querySelectorAll('.found-nav-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.section === section)
  })
  var labels = {
    'stale-listings': 'Stale Listings',
    cases: 'Cases',
    gaps: 'Tracking Gaps',
  }
  var page = document.getElementById('found-breadcrumb-page')
  if (page) page.textContent = labels[section] || 'Stale Listings'
}

function renderMetric(label, value, helper) {
  var card = el('article', 'sales-metric')
  card.appendChild(el('div', 'sales-metric-label', label))
  card.appendChild(el('div', 'sales-metric-value', formatNumber(value)))
  if (helper) card.appendChild(el('p', 'sales-metric-helper', helper))
  return card
}

function renderHero(report) {
  var hero = el('section', 'sales-hero')
  var left = el('div')
  left.appendChild(el('div', 'found-brand-kicker', 'Sales priority'))
  left.appendChild(el('h1', 'sales-title', 'Sell Existing Listings'))
  left.appendChild(el('p', 'sales-subtitle', report.rule.plainEnglish))
  hero.appendChild(left)

  var action = el('div', 'sales-hero-action')
  var link = el('a', 'primary-button', 'Open ClickUp View')
  link.href = report.source.clickUpViewUrl
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  action.appendChild(link)
  action.appendChild(el('p', 'sales-source-line', report.source.sourceId + ' · ' + report.source.viewName))
  hero.appendChild(action)
  return hero
}

function renderMetrics(report) {
  var summary = report.summary || {}
  var grid = el('section', 'sales-metric-grid')
  grid.appendChild(renderMetric('Stale active listings', summary.staleActiveListings, '30+ days since list date or last price adjustment.'))
  grid.appendChild(renderMetric('Agents to review', summary.agentsWithStaleListings, 'Grouped by the ClickUp Agent field.'))
  grid.appendChild(renderMetric('Assigned to leader', summary.assignedSalesLeader, 'Stale listings with Ryan, Blake, Nick, Scott, or Steve assigned.'))
  grid.appendChild(renderMetric('Action plans created', summary.caseActionPlansCreated, 'Tracked in AIOS cases; KPI is supporting evidence only.'))
  grid.appendChild(renderMetric('Adjusted or moved', summary.caseAdjustedOrMoved, 'Cases where ClickUp reset date or outcome shows movement.'))
  return grid
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
  postJson('/api/sales-hub/listing-assignment', {
    taskId: taskId,
    assignedLeaderKey: leaderKey,
  }).then(load).catch(function(error) {
    window.alert(error && error.message ? error.message : 'Sales leader assignment could not be saved.')
    if (select) select.disabled = false
  })
}

function saveCaseUpdate(listing, updates, control) {
  if (control) control.disabled = true
  postJson('/api/sales-hub/listing-case', Object.assign({
    taskId: listing.taskId || listing.clickUpTaskId,
    assignedLeaderKey: listing.salesLeaderAssignment?.assignedLeaderKey || listing.assignedLeaderKey || '',
    caseStatus: listing.salesLeaderAssignment?.caseStatus || listing.caseStatus || 'identified',
    outcomeStatus: listing.salesLeaderAssignment?.outcomeStatus || listing.outcomeStatus || 'open',
  }, updates || {})).then(load).catch(function(error) {
    window.alert(error && error.message ? error.message : 'Sales listing case could not be updated.')
    if (control) control.disabled = false
  })
}

function renderLeaderAssignment(listing, leaders) {
  var wrap = el('div', 'sales-leader-assignment')
  var label = el('label', null, 'Sales leader')
  var select = document.createElement('select')
  select.className = 'sales-leader-select'
  select.setAttribute('aria-label', 'Assign sales leader for ' + listing.title)

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

  select.value = listing.salesLeaderAssignment?.assignedLeaderKey || ''
  select.addEventListener('change', function() {
    saveLeaderAssignment(listing.taskId, select.value, select)
  })
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

function renderListing(listing, report) {
  var item = el('article', 'sales-listing-row')
  var main = el('div', 'sales-listing-main')
  var title = el('a', 'sales-listing-title', listing.title)
  title.href = listing.url
  title.target = '_blank'
  title.rel = 'noopener noreferrer'
  main.appendChild(title)
  main.appendChild(el('div', 'sales-listing-meta', [
    formatNumber(listing.daysSinceReset) + ' days',
    'Reset ' + formatDate(listing.resetDate),
    listing.clickUpStatus,
    listing.price ? 'Price ' + listing.price : '',
  ].filter(Boolean).join(' · ')))
  item.appendChild(main)

  var next = el('div', 'sales-listing-next')
  next.appendChild(renderLeaderAssignment(listing, report.salesLeaders || []))
  next.appendChild(renderCaseControls(listing, report))
  next.appendChild(el('span', getActionPlanClass(listing.shoppingListMatch), getActionPlanLabel(listing.shoppingListMatch)))
  next.appendChild(el('span', 'sales-listing-next-copy', getActionPlanCopy(listing)))
  item.appendChild(next)
  return item
}

function renderAgentGroup(group, report) {
  var details = document.createElement('details')
  details.className = 'sales-agent-group'
  details.open = true

  var summary = el('summary', 'sales-agent-summary')
  var left = el('div')
  left.appendChild(el('strong', null, group.agent))
  left.appendChild(el('span', null, group.staleCount + ' stale listing' + (group.staleCount === 1 ? '' : 's')))
  summary.appendChild(left)
  summary.appendChild(el('span', 'sales-agent-age', 'Oldest ' + group.oldestDays + ' days'))
  details.appendChild(summary)

  var body = el('div', 'sales-agent-body')
  group.listings.forEach(function(listing) {
    body.appendChild(renderListing(listing, report))
  })
  details.appendChild(body)
  return details
}

function renderStaleListings(report) {
  var wrap = el('div')
  wrap.appendChild(renderHero(report))
  wrap.appendChild(renderMetrics(report))

  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Stale listings by agent'))
  section.appendChild(el('p', 'sales-panel-copy', 'This is the weekly owner-meeting list: active listings that need a sales-leader action plan because they have not been listed or price-adjusted in 30+ days.'))

  if (!report.groups.length) {
    section.appendChild(el('p', 'empty-state', 'No active listings are 30+ days stale right now.'))
  } else {
    report.groups.forEach(function(group) {
      section.appendChild(renderAgentGroup(group, report))
    })
  }

  wrap.appendChild(section)
  return wrap
}

function renderCases(report) {
  var wrap = el('div')
  wrap.appendChild(renderHero(report))
  wrap.appendChild(renderMetrics(report))

  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'Tracked stale-listing cases'))
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
      row.appendChild(renderCaseControls(item, report))
      list.appendChild(row)
    })
    section.appendChild(list)
  }

  wrap.appendChild(section)
  return wrap
}

function renderGaps(report) {
  var gaps = report.fieldGaps || {}
  var summary = report.summary || {}
  var wrap = el('div')
  wrap.appendChild(renderHero(report))

  var section = el('section', 'sales-panel')
  section.appendChild(el('h2', null, 'What is not tracked yet'))
  section.appendChild(el('p', 'sales-panel-copy', 'The stale-listing list is live. The progress scoreboard needs the next tracking fields or a weekly snapshot so we can prove action plans, adjustments, and moved/sold outcomes over time.'))

  var list = el('div', 'sales-gap-list')
  var actionPlan = gaps.actionPlanTracking || {}
  var shopping = report.shoppingList || {}
  list.appendChild(renderGap('KPI action-plan match', formatNumber(shopping.withActionPlan || 0) + ' found', 'Matched stale listings to KPI Shopping List only when the address match is safe. Unmatched rows need a confirmed KPI row or a new action plan.'))
  list.appendChild(renderGap('Price adjusted / relisted', 'Partially visible', 'Listings reset when the date field changes. A weekly snapshot will make before/after progress measurable.'))
  list.appendChild(renderGap('Moved / sold', 'Needs outcome definition', 'Decide whether moved means conditional, firm, sold, expired, cancelled, or relisted.'))
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
  if (!['stale-listings', 'cases', 'gaps'].includes(section)) section = 'stale-listings'
  setActiveNav(section)

  var root = document.getElementById('sales-content')
  clearNode(root)
  var report = payload.listingInventory
  root.appendChild(section === 'gaps' ? renderGaps(report) : section === 'cases' ? renderCases(report) : renderStaleListings(report))
}

function load() {
  fetchJson('/api/sales-hub')
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
