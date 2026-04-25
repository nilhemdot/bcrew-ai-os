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

function fetchJson(url) {
  return fetch(url, { cache: 'no-store' }).then(function(response) {
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

function createActionLink(label, href, className) {
  var link = document.createElement('a')
  link.className = className || 'secondary-button'
  link.href = href
  link.textContent = label
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
  return {
    status: queue.status || 'unknown',
    openItems: queue.stats && Number.isFinite(Number(queue.stats.openItems)) ? Number(queue.stats.openItems) : 0,
    queuedReview: queue.stats && Number.isFinite(Number(queue.stats.queuedReview)) ? Number(queue.stats.queuedReview) : 0,
    needsFixing: queue.stats && Number.isFinite(Number(queue.stats.needsFixing)) ? Number(queue.stats.needsFixing) : 0,
    freshness: queue.freshness || null,
    sections: {
      admin: sections.admin && Array.isArray(sections.admin.items) ? sections.admin.items.length : 0,
      conditional: sections.conditional && Array.isArray(sections.conditional.items) ? sections.conditional.items.length : 0,
      fubDrift: sections.fubDrift && Array.isArray(sections.fubDrift.items) ? sections.fubDrift.items.length : 0,
      ownersGovernance: sections.ownersGovernance && Array.isArray(sections.ownersGovernance.items) ? sections.ownersGovernance.items.length : 0,
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
      queueStats.sections.admin + ' admin · ' +
      queueStats.sections.conditional + ' conditional · ' +
      queueStats.sections.fubDrift + ' FUB drift · ' +
      queueStats.sections.ownersGovernance + ' Owners list drift'
  ))

  var actions = document.createElement('div')
  actions.className = 'foundation-module-actions'
  actions.appendChild(createActionLink('Open Ops Inbox', '/ops#inbox', 'secondary-button'))
  actions.appendChild(createActionLink('Open Foundation System Health', '/foundation#system-health', 'secondary-button'))
  body.appendChild(actions)

  details.appendChild(body)
  return details
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

function renderOpsInboxPanel(queueStats) {
  var panel = renderPanel(
    'Ops Inbox',
    'Operational Inspection Queue',
    'These are source-backed review items surfaced for Ops. Foundation detects them; Ops owns cleanup decisions and assignment.'
  )

  var grid = document.createElement('div')
  grid.className = 'status-grid'
  grid.appendChild(renderStatusCard({
    label: 'Admin deal review',
    status: queueStats.sections.admin ? 'pending' : 'live',
    detail: queueStats.sections.admin + ' Admin rows are queued for read-only inspection or cleanup review.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Conditional review',
    status: queueStats.sections.conditional ? 'pending' : 'live',
    detail: queueStats.sections.conditional + ' conditional/listing rows are queued for inspection.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'FUB drift',
    status: queueStats.sections.fubDrift ? 'risk' : 'live',
    detail: queueStats.sections.fubDrift + ' Follow Up Boss taxonomy or parity items are open.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Owners list drift',
    status: queueStats.sections.ownersGovernance ? 'risk' : 'live',
    detail: queueStats.sections.ownersGovernance + ' Owners dropdown governance items are open.',
  }))
  panel.appendChild(grid)

  var actions = document.createElement('div')
  actions.className = 'foundation-module-actions'
  actions.appendChild(createActionLink('Open Owners Review Queue API', '/api/owners/review-queue', 'secondary-button'))
  actions.appendChild(createActionLink('Open Foundation Backlog', '/foundation#backlog', 'secondary-button'))
  panel.appendChild(actions)

  return panel
}

function renderOpsSystemsPanel(jobs, queueStats) {
  var panel = renderPanel(
    'Running Systems',
    'Systems Serving Ops',
    'Open a system to see what it reads, what it checks, what it outputs, and where its work lands.'
  )

  if (!jobs.length) {
    var empty = document.createElement('p')
    empty.textContent = 'No Foundation jobs are tagged as serving Ops yet.'
    panel.appendChild(empty)
    return panel
  }

  jobs.forEach(function(job) {
    panel.appendChild(renderOpsSystemPill(job, queueStats))
  })

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
  meta.textContent = jobs.length + ' running systems serving Ops · ' + queueStats.openItems + ' open inspection items'
  heroInner.appendChild(meta)

  var note = document.createElement('p')
  note.className = 'hero-copy'
  note.textContent = 'Ops is the cockpit for operational work. Foundation remains the control plane that connects, verifies, runs checks, and records provenance.'
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
    container.appendChild(renderOpsInboxPanel(queueStats))
    container.appendChild(renderOpsSystemsPanel(jobs, queueStats))
    return
  }

  if (section === 'inbox') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsInboxPanel(queueStats))
    return
  }

  if (section === 'systems') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsSystemsPanel(jobs, queueStats))
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
