function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date) + ' ET'
}

function getSection() {
  var hash = window.location.hash.replace('#', '')
  return hash || 'overview'
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

function fetchFoundationHub() {
  return fetchJson('/api/foundation-hub')
}

function fetchOwnersReviewQueue() {
  return fetchJson('/api/owners/review-queue')
}

var OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
var OWNERS_ADMIN_GID = '533201019'
var OWNERS_CONDITIONAL_GID = '131346715'

function createActionLink(label, href, className) {
  var link = document.createElement('a')
  link.className = className || 'secondary-button'
  link.href = href
  link.textContent = label
  if (/^https?:\/\//.test(href)) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  return link
}

function renderStatusCard(item) {
  var card = document.createElement('article')
  card.className = 'status-card status-' + item.status

  var top = document.createElement('div')
  top.className = 'status-top'

  var label = document.createElement('span')
  label.className = 'status-label'
  label.textContent = item.label
  top.appendChild(label)

  var pill = document.createElement('span')
  pill.className = 'status-pill'
  pill.textContent = item.status
  top.appendChild(pill)

  card.appendChild(top)

  var detail = document.createElement('p')
  detail.textContent = item.detail
  card.appendChild(detail)

  return card
}

function renderStatusDot(statusKey, label) {
  var wrap = document.createElement('span')
  wrap.className = 'current-state-dot current-state-dot-' + statusKey
  wrap.title = label
  wrap.setAttribute('aria-label', label)
  return wrap
}

function renderLabeledCopy(label, value) {
  var row = document.createElement('div')
  row.className = 'decision-meta'

  var strong = document.createElement('strong')
  strong.textContent = label + ': '
  row.appendChild(strong)

  row.appendChild(document.createTextNode(value || 'Not recorded'))
  return row
}

function renderInlineList(label, values) {
  if (!Array.isArray(values) || !values.length) return null
  return renderLabeledCopy(label, values.join(' · '))
}

function getHubServedJobs(hub, hubKey) {
  var jobs = hub.foundationJobs && Array.isArray(hub.foundationJobs.jobs) ? hub.foundationJobs.jobs : []
  return jobs.filter(function(job) {
    return Array.isArray(job.servesHubs) && job.servesHubs.indexOf(hubKey) !== -1
  })
}

function getOpsReviewQueueStats(queuePayload) {
  var queue = queuePayload && queuePayload.reviewQueue ? queuePayload.reviewQueue : {}
  var sections = queue.sections || {}
  function sectionPayload(key) {
    var section = sections[key] || {}
    var items = Array.isArray(section.items) ? section.items : []
    return {
      openItems: Number.isFinite(Number(section.openItems)) ? Number(section.openItems) : items.length,
      queuedReview: Number.isFinite(Number(section.queuedReview)) ? Number(section.queuedReview) : items.filter(function(item) { return item.queuedForReview }).length,
      needsFixing: Number.isFinite(Number(section.needsFixing)) ? Number(section.needsFixing) : items.filter(function(item) { return item.needsFixing }).length,
      freshness: section.freshness || null,
      items: items,
    }
  }
  return {
    status: queue.status || 'unknown',
    openItems: queue.stats && Number.isFinite(Number(queue.stats.openItems)) ? Number(queue.stats.openItems) : 0,
    queuedReview: queue.stats && Number.isFinite(Number(queue.stats.queuedReview)) ? Number(queue.stats.queuedReview) : 0,
    needsFixing: queue.stats && Number.isFinite(Number(queue.stats.needsFixing)) ? Number(queue.stats.needsFixing) : 0,
    freshness: queue.freshness || null,
    ownersSheet: queue.ownersSheet || { sheetId: OWNERS_SHEET_ID },
    sections: {
      admin: sectionPayload('admin'),
      conditional: sectionPayload('conditional'),
      fubDrift: sectionPayload('fubDrift'),
      ownersGovernance: sectionPayload('ownersGovernance'),
      agentRoster: sectionPayload('agentRoster'),
    },
  }
}

function getJobRunLine(job) {
  var latest = job.latestRun || null
  var last = latest
    ? 'Last ' + latest.status + ' at ' + formatDate(latest.finishedAt || latest.startedAt || latest.createdAt)
    : 'No run recorded yet'
  var next = job.nextRunAt ? 'Next run ' + formatDate(job.nextRunAt) : 'No scheduled next run'
  return last + ' · ' + next
}

function renderOpsSystemPill(job, queueStats) {
  var details = document.createElement('details')
  details.className = 'source-item'

  var summary = document.createElement('summary')
  summary.className = 'source-item-summary'

  var left = document.createElement('div')
  left.className = 'source-item-summary-left'

  var title = document.createElement('div')
  title.className = 'source-item-summary-title'
  title.textContent = job.title || job.key
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-item-summary-meta'
  meta.textContent = [job.runtimeMode || 'runtime unknown', job.cadence || '', job.scheduleStatus || ''].filter(Boolean).join(' · ')
  left.appendChild(meta)

  var copy = document.createElement('div')
  copy.className = 'source-item-summary-copy'
  copy.textContent = job.systemSummary || job.description || 'No summary recorded.'
  left.appendChild(copy)
  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-item-summary-right'
  var dotStatus = job.status === 'live' ? 'connected' : (job.status || 'pending')
  right.appendChild(renderStatusDot(dotStatus, job.status || 'pending'))
  summary.appendChild(right)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-item-body'

  body.appendChild(renderLabeledCopy('What it does', job.systemSummary || job.description || 'No summary recorded.'))
  body.appendChild(renderLabeledCopy('Run state', getJobRunLine(job)))
  body.appendChild(renderLabeledCopy('Command', [job.command].concat(job.args || []).filter(Boolean).join(' ')))
  if (job.sourceIds && job.sourceIds.length) body.appendChild(renderLabeledCopy('Sources', job.sourceIds.join(' · ')))

  var inputs = renderInlineList('Inputs', job.systemInputs || [])
  if (inputs) body.appendChild(inputs)
  var outputs = renderInlineList('Outputs', job.systemOutputs || [])
  if (outputs) body.appendChild(outputs)
  if (job.nextAction) body.appendChild(renderLabeledCopy('Boundary', job.nextAction))

  body.appendChild(renderLabeledCopy(
    'Ops inbox now',
    queueStats.openItems + ' open · ' +
      queueStats.sections.admin.openItems + ' admin · ' +
      queueStats.sections.conditional.openItems + ' conditional · ' +
      queueStats.sections.fubDrift.openItems + ' FUB drift · ' +
      queueStats.sections.ownersGovernance.openItems + ' Owners list drift · ' +
      queueStats.sections.agentRoster.openItems + ' roster'
  ))

  if (job.key === 'admin-deal-review-readonly') {
    body.appendChild(renderLabeledCopy(
      'Inspection writeback',
      'Scheduled: marked Admin re-reviews only. Ops fixes source rows, marks Review This Deal, and this lane rewrites AI status/action/findings without auto-fixing source fields.'
    ))
  }

  if (job.key === 'admin-deal-backlog-review') {
    body.appendChild(renderLabeledCopy(
      'Inspection writeback',
      'Scheduled: five newest eligible Admin backlog deals per day, newest to older, using Date Firm (Executed), a 2025-06-01 cutoff, and a 10-day maturity gate. Post-April-1 follow-through is checked in ClickUp Deal Data Entry instead of the old Freedom review sheet.'
    ))
  }

  if (job.key === 'conditional-deal-review-readonly') {
    body.appendChild(renderLabeledCopy(
      'Conditional forecast',
      'Scheduled: rebuilds the conditional forecast from ClickUp Deal Data Entry. Buyer/seller conditional tags stay live; mutual-release tags are excluded. Mark column N as Review This Conditional to re-check a fixed conditional row.'
    ))
  }

  var actions = document.createElement('div')
  actions.className = 'foundation-module-actions'
  actions.appendChild(createActionLink('Open Ops Inbox', '/ops#inbox', 'secondary-button'))
  body.appendChild(actions)

  details.appendChild(body)
  return details
}

function renderOpsSystemSummaryCard(job) {
  var labels = {
    'admin-deal-review-readonly': 'Admin re-checks',
    'admin-deal-backlog-review': 'Admin backlog scan',
    'conditional-deal-review-readonly': 'Conditional forecast sync',
    'agent-roster-review': 'Agent onboarding check',
  }
  var summaries = {
    'admin-deal-review-readonly': 'Re-checks Admin deals after someone marks them ready for review.',
    'admin-deal-backlog-review': 'Checks 5 older eligible Admin deals per day so the backlog clears without flooding Ops.',
    'conditional-deal-review-readonly': 'Keeps the conditional forecast sheet rebuilt from the ClickUp deal board.',
    'agent-roster-review': 'Checks the Agent Roster and tracks 30/60/90 onboarding feedback.',
  }
  return renderStatusCard({
    label: labels[job.key] || job.title || job.key,
    status: job.status === 'live' ? 'live' : (job.status || 'pending'),
    detail: summaries[job.key] || job.description || 'Running in the background for Ops.',
  })
}

function renderPanel(eyebrowText, titleText, introText) {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = eyebrowText
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = titleText
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = introText
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)
  return panel
}

function formatQueueItemMeta(item) {
  var parts = []
  if (item.owner) parts.push(item.owner)
  if (item.rosterStatus) parts.push(item.rosterStatus)
  if (item.dueDate) parts.push('due ' + item.dueDate)
  if (Array.isArray(item.rowNumbers) && item.rowNumbers.length > 1) {
    parts.push('rows ' + item.rowNumbers.join(', '))
  } else if (item.rowNumber) {
    parts.push('row ' + item.rowNumber)
  }
  if (item.executedDate) parts.push('executed ' + item.executedDate)
  if (item.firmDate) parts.push('firm ' + item.firmDate)
  if (item.conditionalDeadline) parts.push('condition due ' + item.conditionalDeadline)
  if (item.closingDate) parts.push('closing ' + item.closingDate)
  if (item.depositStatus) parts.push('deposit ' + item.depositStatus)
  if (item.conditionalStatus) parts.push('status ' + item.conditionalStatus)
  return parts.join(' · ') || 'Ops review item'
}

function getQueueItemHref(queueStats, item) {
  var sheetId = queueStats.ownersSheet && queueStats.ownersSheet.sheetId ? queueStats.ownersSheet.sheetId : OWNERS_SHEET_ID
  if (item.clickUpUrl) return item.clickUpUrl
  if (item.queue === 'admin' && item.rowNumber) {
    return 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit#gid=' + OWNERS_ADMIN_GID + '&range=A' + item.rowNumber
  }
  if (item.queue === 'conditional' && item.rowNumber) {
    return 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit#gid=' + OWNERS_CONDITIONAL_GID + '&range=A' + item.rowNumber
  }
  return ''
}

function renderOpsIssueCard(queueStats, item) {
  var card = document.createElement('article')
  card.className = 'ops-issue-card'

  var head = document.createElement('div')
  head.className = 'ops-issue-head'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'ops-issue-title-wrap'

  var title = document.createElement('h4')
  title.textContent = item.title || item.id || 'Review item'
  titleWrap.appendChild(title)

  var subtitle = document.createElement('p')
  subtitle.textContent = [item.subtitle, formatQueueItemMeta(item)].filter(Boolean).join(' · ')
  titleWrap.appendChild(subtitle)

  head.appendChild(titleWrap)

  var pill = document.createElement('span')
  pill.className = 'ops-issue-pill ' + (item.needsFixing ? 'ops-issue-pill-risk' : 'ops-issue-pill-pending')
  pill.textContent = item.reviewAction || item.reviewStatus || 'Review'
  head.appendChild(pill)

  card.appendChild(head)

  var status = document.createElement('div')
  status.className = 'ops-issue-status-line'
  status.textContent = [item.reviewStatus, item.reviewAction].filter(Boolean).join(' · ')
  card.appendChild(status)

  var findings = document.createElement('p')
  findings.className = 'ops-issue-findings'
  findings.textContent = item.findingsPreview || 'No findings text is recorded yet.'
  card.appendChild(findings)

  var href = getQueueItemHref(queueStats, item)
  if (href || item.feedbackUrl) {
    var actions = document.createElement('div')
    actions.className = 'foundation-module-actions ops-issue-actions'
    if (href) actions.appendChild(createActionLink('Open source row', href, 'secondary-button'))
    if (item.feedbackUrl) actions.appendChild(createActionLink('Open feedback form', item.feedbackUrl, 'secondary-button'))
    card.appendChild(actions)
  }

  return card
}

function renderOpsIssueSection(queueStats, key, config, maxItems) {
  var section = queueStats.sections[key]
  var items = section && Array.isArray(section.items) ? section.items : []
  var wrap = document.createElement('div')
  wrap.className = 'ops-issue-section'
  wrap.dataset.opsSection = key

  var header = document.createElement('div')
  header.className = 'ops-issue-section-header'

  var title = document.createElement('h4')
  title.textContent = config.title
  header.appendChild(title)

  var meta = document.createElement('p')
  meta.textContent = items.length + ' open · ' + (section ? section.needsFixing : 0) + ' need fixing'
  header.appendChild(meta)
  wrap.appendChild(header)

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'section-intro'
    empty.textContent = config.emptyText
    wrap.appendChild(empty)
    return wrap
  }

  var grid = document.createElement('div')
  grid.className = 'ops-issue-grid'
  items.slice(0, maxItems || items.length).forEach(function(item) {
    grid.appendChild(renderOpsIssueCard(queueStats, item))
  })
  wrap.appendChild(grid)

  if (maxItems && items.length > maxItems) {
    var more = document.createElement('p')
    more.className = 'section-intro'
    more.textContent = (items.length - maxItems) + ' more item' + (items.length - maxItems === 1 ? '' : 's') + ' visible in the Inbox tab.'
    wrap.appendChild(more)
  }

  return wrap
}

function renderOpsInboxFilters() {
  var filters = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admin deals' },
    { key: 'conditional', label: 'Conditional / listings' },
    { key: 'fubDrift', label: 'FUB drift' },
    { key: 'ownersGovernance', label: 'Owners lists' },
    { key: 'agentRoster', label: 'Agent onboarding' },
  ]
  var wrap = document.createElement('div')
  wrap.className = 'ops-filter-bar'
  filters.forEach(function(filter, index) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'ops-filter-button' + (index === 0 ? ' ops-filter-button-active' : '')
    button.dataset.opsFilter = filter.key
    button.textContent = filter.label
    button.addEventListener('click', function() {
      var selected = button.dataset.opsFilter
      wrap.querySelectorAll('.ops-filter-button').forEach(function(item) {
        item.classList.toggle('ops-filter-button-active', item === button)
      })
      var panel = wrap.closest('.panel')
      if (!panel) return
      panel.querySelectorAll('.ops-issue-section').forEach(function(section) {
        section.hidden = selected !== 'all' && section.dataset.opsSection !== selected
      })
    })
    wrap.appendChild(button)
  })
  return wrap
}

function renderOpsInboxPanel(queueStats, options) {
  var showItems = options && options.showItems
  var panel = renderPanel(
    'Ops Inbox',
    'Work Queue',
    'Start here. These are the deals, conditional records, FUB items, and agent follow-ups that need Ops attention.'
  )

  var grid = document.createElement('div')
  grid.className = 'status-grid'
  grid.appendChild(renderStatusCard({
    label: 'Admin deal review',
    status: queueStats.sections.admin.openItems ? 'pending' : 'live',
    detail: queueStats.sections.admin.openItems + ' Admin deals need cleanup before they can pass review.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Conditional forecast',
    status: queueStats.sections.conditional.openItems ? 'pending' : 'live',
    detail: queueStats.sections.conditional.openItems + ' conditional/listing records are missing forecast details.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'FUB drift',
    status: queueStats.sections.fubDrift.openItems ? 'risk' : 'live',
    detail: queueStats.sections.fubDrift.openItems + ' Follow Up Boss source/rule issues are open.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Owners list drift',
    status: queueStats.sections.ownersGovernance.openItems ? 'risk' : 'live',
    detail: queueStats.sections.ownersGovernance.openItems + ' Owners dropdown/list issues are open.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Agent onboarding',
    status: queueStats.sections.agentRoster.openItems ? 'pending' : 'live',
    detail: queueStats.sections.agentRoster.openItems + ' agent roster or onboarding follow-ups are open.',
  }))
  panel.appendChild(grid)

  if (showItems) {
    panel.appendChild(renderOpsInboxFilters())
    panel.appendChild(renderOpsIssueSection(queueStats, 'admin', {
      title: 'Admin deal reviews',
      emptyText: 'No Admin deal review findings are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'conditional', {
      title: 'Conditional / listing rows',
      emptyText: 'No conditional forecast data gaps are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'fubDrift', {
      title: 'FUB taxonomy and parity drift',
      emptyText: 'No FUB drift items are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'ownersGovernance', {
      title: 'Owners dropdown drift',
      emptyText: 'No Owners dropdown drift items are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'agentRoster', {
      title: 'Agent onboarding / roster accountability',
      emptyText: 'No agent onboarding or roster accountability items are open.',
    }))
  } else {
    var actions = document.createElement('div')
    actions.className = 'foundation-module-actions'
    actions.appendChild(createActionLink('Open Ops Inbox', '/ops#inbox', 'secondary-button'))
    actions.appendChild(createActionLink('Open Running Systems', '/ops#systems', 'secondary-button'))
    panel.appendChild(actions)
  }

  return panel
}

function renderOpsSystemsPanel(jobs, queueStats, options) {
  var compact = options && options.compact
  var panel = renderPanel(
    'Running Systems',
    compact ? 'Background Checks' : 'Systems Serving Ops',
    compact
      ? 'These checks run in the background and keep the Ops inbox current.'
      : 'Open a system to see what it reads, what it checks, what it outputs, and where its work lands.'
  )

  if (!jobs.length) {
    var empty = document.createElement('p')
    empty.textContent = 'No Foundation jobs are tagged as serving Ops yet.'
    panel.appendChild(empty)
    return panel
  }

  if (compact) {
    var grid = document.createElement('div')
    grid.className = 'status-grid'
    jobs.forEach(function(job) {
      grid.appendChild(renderOpsSystemSummaryCard(job))
    })
    panel.appendChild(grid)
    var actions = document.createElement('div')
    actions.className = 'foundation-module-actions'
    actions.appendChild(createActionLink('Open Running Systems', '/ops#systems', 'secondary-button'))
    panel.appendChild(actions)
  } else {
    jobs.forEach(function(job) {
      panel.appendChild(renderOpsSystemPill(job, queueStats))
    })
  }

  return panel
}

function renderHero(jobs, queueStats) {
  var hero = document.createElement('section')
  hero.className = 'hero'
  var heroInner = document.createElement('div')
  heroInner.className = 'hero-inner'

  var title = document.createElement('h1')
  title.textContent = 'Ops Hub'
  heroInner.appendChild(title)

  var meta = document.createElement('p')
  meta.className = 'hero-copy'
  meta.textContent = jobs.length + ' checks running · ' + queueStats.openItems + ' open Ops items'
  heroInner.appendChild(meta)

  var note = document.createElement('p')
  note.className = 'hero-copy'
  note.textContent = 'This is where Ops sees what needs cleanup. Foundation runs the checks in the background and keeps the audit trail.'
  heroInner.appendChild(note)

  hero.appendChild(heroInner)
  return hero
}

function updateNav(section) {
  var labels = {
    overview: 'Overview',
    inbox: 'Inbox',
    systems: 'Running Systems',
  }

  var navItems = document.querySelectorAll('.found-nav-item')
  navItems.forEach(function(item) {
    item.classList.toggle('found-nav-active', item.getAttribute('data-section') === section)
  })

  var breadcrumb = document.getElementById('found-breadcrumb-page')
  if (breadcrumb) breadcrumb.textContent = labels[section] || 'Overview'
}

function renderSection(section, hub, queuePayload) {
  var container = document.getElementById('ops-content')
  var queueStats = getOpsReviewQueueStats(queuePayload)
  var jobs = getHubServedJobs(hub, 'ops')
  container.innerHTML = ''

  if (section === 'overview') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsInboxPanel(queueStats, { showItems: false }))
    container.appendChild(renderOpsSystemsPanel(jobs, queueStats, { compact: true }))
    return
  }

  if (section === 'inbox') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsInboxPanel(queueStats, { showItems: true }))
    return
  }

  if (section === 'systems') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsSystemsPanel(jobs, queueStats, { compact: false }))
    return
  }

  renderSection('overview', hub, queuePayload)
}

function route() {
  var section = getSection()
  if (section !== 'overview' && section !== 'inbox' && section !== 'systems') section = 'overview'
  updateNav(section)

  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  var main = document.querySelector('.found-main')
  if (main) main.scrollTop = 0

  Promise.all([fetchFoundationHub(), fetchOwnersReviewQueue()]).then(function(results) {
    renderSection(section, results[0], results[1])
  }).catch(function(error) {
    var container = document.getElementById('ops-content')
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load Ops Hub: ' + error.message
    container.appendChild(msg)
  })
}

document.addEventListener('DOMContentLoaded', function() {
  route()

  var toggle = document.getElementById('found-mobile-toggle')
  var nav = document.getElementById('found-nav')
  if (toggle && nav) {
    toggle.addEventListener('click', function() {
      nav.classList.toggle('found-nav-open')
    })
  }
})

window.addEventListener('hashchange', route)
