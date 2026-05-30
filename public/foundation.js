var backlogLanes = [
  { key: 'research', label: 'Research' },
  { key: 'scoped', label: 'Scoped' },
  { key: 'ranked', label: 'Ranked' },
  { key: 'executing', label: 'Executing' },
  { key: 'parked', label: 'Parked' },
  { key: 'done', label: 'Done' },
]

var backlogWorkflowStages = [
  { key: 'todo', label: 'To Do', lanes: ['research'], intro: 'Ideas and work that still need more proof, research, or shaping before they are ready.' },
  { key: 'todo-scoped', label: 'To Do Scoped', lanes: ['scoped', 'ranked'], intro: 'Work that is shaped enough to build, but is not in motion yet.' },
  { key: 'doing', label: 'Doing', lanes: ['executing'], intro: 'Live work actively being built or closed out right now.' },
  { key: 'waiting', label: 'Waiting / Parked', lanes: ['parked'], intro: 'Work intentionally held, blocked, or waiting on something outside the active build flow.' },
  { key: 'done', label: 'Done', lanes: ['done'], intro: 'Closed work that is already part of the live system.' },
]

var decisionViewState = {
  query: '',
  category: 'all',
  view: 'current',
}

var fallbackBacklogScopes = [
  { key: 'foundation', label: 'Foundation / System', shortLabel: 'foundation/system', active: true },
  { key: 'strategic_execution', label: 'Strategic Execution', shortLabel: 'strategic execution', active: true },
  { key: 'marketing', label: 'Marketing', shortLabel: 'marketing', active: true },
]

var backlogScopeRegistry = fallbackBacklogScopes.slice()

var backlogViewState = {
  query: '',
  scope: 'all',
  priority: 'all',
  ids: [],
}

var actionReviewState = {
  busyRouteId: null,
  notes: {},
}

var sourceViewState = {
  query: '',
  kind: 'all',
  presence: 'all',
}

var sourceSectionConfigs = {
  'source-overview': {
    title: 'Data Sources',
    eyebrow: 'Source Layer',
    intro: 'Full source map: source systems, validation units, and the connector layer underneath them.',
    showSystems: true,
    showConnectors: true,
    showKindFilter: true,
    showOperatorNotes: true,
  },
  'source-docs': {
    title: 'Docs',
    eyebrow: 'Data Sources',
    intro: 'Repo docs and markdown-backed truth only. Use this lane to see which written packets are signed off, what they include, and what is still outside the closure.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['docs'],
  },
  'source-sheets': {
    title: 'Spreadsheets',
    eyebrow: 'Data Sources',
    intro: 'Workbook-level sources and validation units. Use this lane for sheet-by-sheet trust work.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['sheets'],
  },
  'source-apis': {
    title: 'APIs and apps',
    eyebrow: 'Data Sources',
    intro: 'External systems, APIs, and app-backed business sources. Use this lane when truth lives outside the repo and outside spreadsheets.',
    showSystems: true,
    showConnectors: false,
    showKindFilter: false,
    allowedKinds: ['api', 'apps'],
  },
  'source-connectors': {
    title: 'Connectors',
    eyebrow: 'Connector Layer',
    intro: 'Access paths and technical reach only. This lane does not prove the source itself is trusted.',
    showSystems: false,
    showConnectors: true,
    showKindFilter: false,
  },
  'source-lifecycle': {
    title: 'Source Lifecycle',
    eyebrow: 'Source Control',
    intro: 'Connect, verify, extract, review, retry, or park source lanes without starting new ingestion.',
    showSystems: false,
    showConnectors: false,
    showKindFilter: false,
  },
}

var phaseGOperatorOrder = [
  'PLAIN-ENGLISH-SWEEP-001',
  'UI-MENU-LAYOUT-POLISH-001',
  'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
  'CHANGE-LOG-COMPREHENSIVE-001',
  'DAILY-EXEC-SUMMARY-001',
  'SOURCE-LIFECYCLE-EXPANSION-001',
]

/* ── card renderers (from app.js) ────────────────────────── */

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

  if (Array.isArray(item.actions) && item.actions.length) {
    var actions = document.createElement('div')
    actions.className = 'status-actions'
    item.actions.forEach(function(action) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'status-action-button' + (action.secondary ? ' status-action-button-secondary' : '')
      button.textContent = action.label
      if (action.disabled) button.disabled = true
      if (typeof action.onClick === 'function') {
        button.addEventListener('click', function() {
          action.onClick(button)
        })
      }
      actions.appendChild(button)
    })
    card.appendChild(actions)
  }

  return card
}

function renderLabeledCopy(className, labelText, valueText) {
  var p = document.createElement('p')
  p.className = className

  var strong = document.createElement('strong')
  strong.textContent = labelText + ':'
  p.appendChild(strong)
  p.appendChild(document.createTextNode(' ' + valueText))

  return p
}

function compareBacklogItems(a, b) {
  var priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
  var laneOrder = {}
  backlogLanes.forEach(function(lane, index) {
    laneOrder[lane.key] = index
  })

  var aPriority = priorityOrder[a.priority] != null ? priorityOrder[a.priority] : 9
  var bPriority = priorityOrder[b.priority] != null ? priorityOrder[b.priority] : 9
  var priorityDelta = aPriority - bPriority
  if (priorityDelta !== 0) return priorityDelta

  var aRank = typeof a.rank === 'number' ? a.rank : Number.MAX_SAFE_INTEGER
  var bRank = typeof b.rank === 'number' ? b.rank : Number.MAX_SAFE_INTEGER
  if (aRank !== bRank) return aRank - bRank

  var aLane = laneOrder[a.lane] != null ? laneOrder[a.lane] : 99
  var bLane = laneOrder[b.lane] != null ? laneOrder[b.lane] : 99
  var laneDelta = aLane - bLane
  if (laneDelta !== 0) return laneDelta

  return String(a.title || '').localeCompare(String(b.title || ''))
}

function sortBacklogItems(items) {
  return (items || []).slice().sort(compareBacklogItems)
}

function getBacklogScopes() {
  return (backlogScopeRegistry || []).slice()
}

function getActiveBacklogScopes() {
  return getBacklogScopes().filter(function(scope) {
    return scope.active !== false
  })
}

function getBacklogScopeMeta(scopeKey) {
  return getBacklogScopes().find(function(scope) { return scope.key === scopeKey }) || null
}

function filterBacklogItems(items, viewState) {
  var query = String((viewState && viewState.query) || '').trim().toLowerCase()
  var scope = (viewState && viewState.scope) || 'all'
  var priority = (viewState && viewState.priority) || 'all'
  var ids = Array.isArray(viewState && viewState.ids) ? viewState.ids : []

  return sortBacklogItems(items).filter(function(item) {
    if (ids.length && ids.indexOf(item.id) === -1) return false
    if (scope !== 'all' && item.scope !== scope) return false
    if (priority !== 'all' && item.priority !== priority) return false
    if (!query) return true

    var haystack = [
      item.id,
      item.title,
      item.scope,
      item.lane,
      item.priority,
      item.summary,
      item.whyItMatters,
      item.nextAction,
      item.statusNote,
      item.owner,
      item.source,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.indexOf(query) !== -1
  })
}

function renderBacklogAccordionItem(item) {
  var details = document.createElement('details')
  details.className = 'backlog-item-pill'

  var summary = document.createElement('summary')
  summary.className = 'backlog-item-summary'

  var left = document.createElement('div')
  left.className = 'backlog-item-summary-left'

  var title = document.createElement('div')
  title.className = 'backlog-item-summary-title'
  title.textContent = item.title
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'backlog-item-summary-meta'
  meta.textContent = [
    item.id,
    getBacklogScopeLabel(item.scope),
    getBacklogLaneLabel(item.lane),
    item.owner || null,
  ].filter(Boolean).join(' · ')
  left.appendChild(meta)
  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'backlog-item-summary-right'

  var priority = document.createElement('span')
  priority.className = 'backlog-pill backlog-priority-' + item.priority.toLowerCase()
  priority.textContent = item.priority
  right.appendChild(priority)

  if (item.rank) {
    var rank = document.createElement('span')
    rank.className = 'backlog-rank'
    rank.textContent = '#' + item.rank
    right.appendChild(rank)
  }

  summary.appendChild(right)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'backlog-item-body'

  var summaryCopy = document.createElement('p')
  summaryCopy.className = 'backlog-copy'
  summaryCopy.textContent = item.summary
  body.appendChild(summaryCopy)

  if (item.whyItMatters) body.appendChild(renderLabeledCopy('backlog-note', 'Why It Matters', item.whyItMatters))
  if (item.nextAction) body.appendChild(renderLabeledCopy('backlog-next', 'Next To Close', item.nextAction))
  if (item.statusNote) body.appendChild(renderLabeledCopy('backlog-note', 'Current Note', item.statusNote))
  if (item.lane === 'done' && item.doneSemantics) {
    var doneOutcome = item.doneSemantics.label + ' — ' + item.doneSemantics.plainEnglish
    body.appendChild(renderLabeledCopy('backlog-note', 'Done Outcome', doneOutcome))
  }
  if (item.source) body.appendChild(renderLabeledCopy('backlog-note', 'Source', item.source))

  if (item.updatedAt || item.createdAt) {
    var updatedLabel = item.lane === 'done' ? 'Moved to done signal' : 'Updated'
    var updatedValue = formatDate(item.closedAt || item.updatedAt || item.createdAt) + (item.lane === 'done' && !item.closedAt ? ' (done/last-updated signal)' : '')
    body.appendChild(renderLabeledCopy('backlog-note', updatedLabel, updatedValue))
  }

  if (item.owner) body.appendChild(renderLabeledCopy('capture-owner', 'Owner', item.owner))

  body.appendChild(renderBacklogItemEditor(item))
  details.appendChild(body)
  return details
}

function renderBacklogWorkflowStack(group, items) {
  var details = document.createElement('details')
  details.className = 'backlog-stack'

  var summary = document.createElement('summary')
  summary.className = 'backlog-stack-summary backlog-stack-summary-' + group.key

  var labelWrap = document.createElement('div')
  labelWrap.className = 'backlog-stack-label-wrap'

  var label = document.createElement('div')
  label.className = 'backlog-stack-title'
  label.textContent = group.label
  labelWrap.appendChild(label)

  var intro = document.createElement('div')
  intro.className = 'backlog-stack-intro'
  intro.textContent = items.length
    ? group.intro
    : 'No cards are in this stage right now.'
  labelWrap.appendChild(intro)
  summary.appendChild(labelWrap)

  var count = document.createElement('span')
  count.className = 'backlog-stack-count'
  count.textContent = items.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'backlog-stack-body'

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'lane-empty'
    empty.textContent = 'No cards are in this stage yet.'
    body.appendChild(empty)
  } else {
    sortBacklogItems(items).forEach(function(item) {
      body.appendChild(renderBacklogAccordionItem(item))
    })
  }

  details.appendChild(body)
  return details
}

function actionReviewTitle(route) {
  var payload = route.proposedPayload || {}
  return payload.title || route.title || route.routeId || 'Action route'
}

function actionReviewSummary(route) {
  var payload = route.proposedPayload || {}
  return payload.summary || payload.reason || route.routingReason || 'No plain-English summary has been recorded for this route yet.'
}

function actionReviewDestinationLabel(route) {
  if (route.actionReview && route.actionReview.destinationLabel) return route.actionReview.destinationLabel
  if (route.destinationTable === 'backlog_items') return 'Backlog work item'
  if (route.destinationTable === 'decisions') return 'Decision'
  if (route.destinationTable === 'open_questions') return 'Open question'
  if (route.destinationTable === 'intelligence_synthesized_items') return route.routeType === 'snooze' ? 'Snoozed finding' : 'Ignored finding'
  return route.destinationTable || 'Destination record not chosen yet'
}

function actionReviewDestinationHref(route) {
  if (!route.destinationRecordId) return ''
  if (route.destinationTable === 'backlog_items') return '/foundation#backlog:' + encodeURIComponent(route.destinationRecordId)
  if (route.destinationTable === 'decisions') return '/foundation#decisions'
  if (route.destinationTable === 'open_questions') return '/foundation#open-questions'
  return ''
}

function actionReviewTone(value) {
  var normalized = String(value || '').toLowerCase()
  if (normalized === 'applied' || normalized.includes('destination')) return 'good'
  if (normalized === 'pending' || normalized.includes('review') || normalized === 'approved') return 'pending'
  if (normalized === 'rejected' || normalized.includes('stuck')) return 'risk'
  return 'connected'
}

function renderActionReviewPill(text, tone) {
  var pill = document.createElement('span')
  pill.className = 'status-pill status-pill-static status-' + actionReviewTone(tone || text)
  pill.textContent = text
  return pill
}

function getActionReviewNote(route) {
  var key = route.routeId
  if (actionReviewState.notes[key] == null) actionReviewState.notes[key] = ''
  return actionReviewState.notes[key]
}

function setActionReviewNote(route, value) {
  actionReviewState.notes[route.routeId] = value
}

function renderActionReviewProof(route) {
  var proof = route.sourceProof || {}
  var items = Array.isArray(proof.items) ? proof.items : []
  var details = document.createElement('details')
  details.className = 'action-review-proof'

  var summary = document.createElement('summary')
  summary.textContent = items.length ? 'Source proof (' + items.length + ')' : 'Source proof'
  details.appendChild(summary)

  if (proof.summary) {
    var proofSummary = document.createElement('p')
    proofSummary.className = 'backlog-copy'
    proofSummary.textContent = proof.summary
    details.appendChild(proofSummary)
  }

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'backlog-copy backlog-copy-secondary'
    empty.textContent = 'No readable source proof is attached yet.'
    details.appendChild(empty)
    return details
  }

  var list = document.createElement('div')
  list.className = 'action-review-proof-list'
  items.slice(0, 3).forEach(function(item) {
    var card = document.createElement('article')
    card.className = 'action-review-proof-card'

    var title = document.createElement('h5')
    title.textContent = item.title || 'Source evidence'
    card.appendChild(title)

    var meta = document.createElement('p')
    meta.className = 'backlog-copy-secondary'
    meta.textContent = [
      item.sourceId,
      item.sourceType,
      item.occurredAt ? formatDate(item.occurredAt) : null,
      item.from ? 'From: ' + item.from : null,
    ].filter(Boolean).join(' · ')
    card.appendChild(meta)

    if (item.quote) {
      var quote = document.createElement('blockquote')
      quote.textContent = item.quote
      card.appendChild(quote)
    } else if (item.context) {
      var context = document.createElement('p')
      context.className = 'backlog-copy'
      context.textContent = item.context
      card.appendChild(context)
    }

    if (item.sourceUrl) {
      var link = document.createElement('a')
      link.href = item.sourceUrl
      link.className = 'section-support-link'
      link.textContent = 'Open source'
      card.appendChild(link)
    }

    list.appendChild(card)
  })
  details.appendChild(list)
  return details
}

function reviewFoundationActionRoute(route, action) {
  var note = getActionReviewNote(route).trim()
  if (action === 'reject' && !note) {
    window.alert('Reject needs a reason so the finding is not silently lost.')
    return
  }
  var confirmCopy = action === 'approve'
    ? 'Approve this route? It will be ready to apply, but will not write a destination record yet.'
    : action === 'apply'
      ? 'Apply this approved route now? This writes the destination record, so use it only when the route is meant to become real work.'
      : 'Reject this route? The reason will be saved so the finding is not lost.'
  if (!window.confirm(confirmCopy)) return

  actionReviewState.busyRouteId = route.routeId
  renderBacklog()
  foundationMutation('/api/foundation/action-review/' + encodeURIComponent(route.routeId) + '/review', 'POST', {
    action: action,
    note: note,
    reviewedBy: 'Steve',
  }).then(function(payload) {
    cache.actionReview = payload.actionReview
    actionReviewState.busyRouteId = null
    if (action !== 'reject') actionReviewState.notes[route.routeId] = ''
    renderBacklog()
  }).catch(function(error) {
    actionReviewState.busyRouteId = null
    window.alert(error.message || 'Action Review could not save the route update.')
    renderBacklog()
  })
}

function renderActionReviewButton(route, action, label, tone) {
  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'action-review-button action-review-button-' + (tone || 'neutral')
  button.textContent = actionReviewState.busyRouteId === route.routeId ? 'Working...' : label
  button.disabled = Boolean(actionReviewState.busyRouteId)
  button.addEventListener('click', function() {
    reviewFoundationActionRoute(route, action)
  })
  return button
}

function renderActionReviewCard(route) {
  var details = document.createElement('details')
  details.className = 'action-review-card'

  var summary = document.createElement('summary')
  summary.className = 'action-review-card-summary'

  var left = document.createElement('div')
  left.className = 'action-review-card-left'
  var title = document.createElement('h4')
  title.textContent = actionReviewTitle(route)
  left.appendChild(title)

  var meta = document.createElement('p')
  meta.textContent = [
    route.routeId,
    'Owner: ' + (route.owner || 'missing'),
    actionReviewDestinationLabel(route),
    route.actionReview && route.actionReview.ageDays !== null ? route.actionReview.ageDays + ' days old' : null,
  ].filter(Boolean).join(' · ')
  left.appendChild(meta)
  summary.appendChild(left)

  var pills = document.createElement('div')
  pills.className = 'action-review-card-pills'
  pills.appendChild(renderActionReviewPill(route.actionReview?.plainStatus || route.approvalStatus, route.approvalStatus))
  if (route.actionReview?.isAgedPending) pills.appendChild(renderActionReviewPill('Aged', 'pending'))
  if (route.destinationRecordId) pills.appendChild(renderActionReviewPill('Destination proof', 'applied'))
  summary.appendChild(pills)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'action-review-card-body'

  var copy = document.createElement('p')
  copy.className = 'backlog-copy'
  copy.textContent = actionReviewSummary(route)
  body.appendChild(copy)

  body.appendChild(renderLabeledCopy('backlog-note', 'What this would create', actionReviewDestinationLabel(route)))
  body.appendChild(renderLabeledCopy('backlog-note', 'Why it was routed', route.routingReason || 'No routing reason recorded.'))

  if (route.destinationRecordId) {
    var href = actionReviewDestinationHref(route)
    var destination = document.createElement('p')
    destination.className = 'backlog-next'
    var strong = document.createElement('strong')
    strong.textContent = 'Applied proof:'
    destination.appendChild(strong)
    destination.appendChild(document.createTextNode(' ' + actionReviewDestinationLabel(route) + ' ' + route.destinationRecordId))
    if (href) {
      destination.appendChild(document.createTextNode(' '))
      var link = document.createElement('a')
      link.href = href
      link.textContent = 'Open'
      destination.appendChild(link)
    }
    body.appendChild(destination)
  }

  body.appendChild(renderActionReviewProof(route))

  if (route.approvalStatus === 'pending' || route.approvalStatus === 'approved') {
    var reviewBox = document.createElement('div')
    reviewBox.className = 'action-review-controls'

    var noteLabel = document.createElement('label')
    var noteText = document.createElement('span')
    noteText.textContent = 'Review note'
    noteLabel.appendChild(noteText)
    var noteInput = document.createElement('input')
    noteInput.type = 'text'
    noteInput.placeholder = 'Reject requires a reason; approve or apply can include a note'
    noteInput.value = getActionReviewNote(route)
    noteInput.addEventListener('input', function() {
      setActionReviewNote(route, noteInput.value)
    })
    noteLabel.appendChild(noteInput)
    reviewBox.appendChild(noteLabel)

    var actions = document.createElement('div')
    actions.className = 'action-review-actions'
    if (route.approvalStatus === 'pending') {
      actions.appendChild(renderActionReviewButton(route, 'approve', 'Approve', 'primary'))
      actions.appendChild(renderActionReviewButton(route, 'reject', 'Reject', 'danger'))
    } else if (route.approvalStatus === 'approved') {
      actions.appendChild(renderActionReviewButton(route, 'apply', 'Apply approved route', 'primary'))
      actions.appendChild(renderActionReviewButton(route, 'reject', 'Reject', 'danger'))
    }
    reviewBox.appendChild(actions)
    body.appendChild(reviewBox)
  }

  details.appendChild(body)
  return details
}

function renderActionReviewPanel(actionReview) {
  var panel = document.createElement('section')
  panel.className = 'panel action-review-panel'
  panel.id = 'action-review'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var copy = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Action review'
  copy.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Action Review'
  copy.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Review system findings before they become decisions, backlog cards, questions, ignored findings, or owner actions.'
  copy.appendChild(intro)
  header.appendChild(copy)
  panel.appendChild(header)

  if (actionReview && actionReview.error) {
    var errorCopy = document.createElement('p')
    errorCopy.className = 'backlog-copy'
    errorCopy.textContent = 'Action Review could not load. No routes were changed. Details: ' + actionReview.error
    panel.appendChild(errorCopy)
    return panel
  }

  var summary = actionReview?.summary || {}
  var summaryRow = document.createElement('div')
  summaryRow.className = 'action-review-summary'
  summaryRow.appendChild(renderStatusCard({
    label: 'Needs human decision',
    status: summary.pendingRoutes ? 'pending' : 'connected',
    detail: (summary.pendingRoutes || 0) + ' pending routes waiting for a human decision.',
  }))
  summaryRow.appendChild(renderStatusCard({
    label: 'Approved, not applied',
    status: summary.approvedRoutes ? 'pending' : 'connected',
    detail: (summary.approvedRoutes || 0) + ' approved routes ready to write destination records.',
  }))
  summaryRow.appendChild(renderStatusCard({
    label: 'Applied',
    status: summary.appliedRoutesWithDestinationRecord ? 'connected' : 'pending',
    detail: (summary.appliedRoutes || 0) + ' applied routes; ' + (summary.appliedRoutesWithDestinationRecord || 0) + ' have destination proof.',
  }))
  summaryRow.appendChild(renderStatusCard({
    label: 'Old pending routes',
    status: summary.agedPendingRoutes ? 'pending' : 'connected',
    detail: (summary.agedPendingRoutes || 0) + ' pending routes are older than ' + ((actionReview?.thresholds && actionReview.thresholds.agedPendingDays) || 3) + ' days.',
  }))
  panel.appendChild(summaryRow)

  var routes = Array.isArray(actionReview?.routes) ? actionReview.routes.slice() : []
  var activeRoutes = routes.filter(function(route) {
    return route.approvalStatus === 'pending' || route.approvalStatus === 'approved'
  })
  var closedRoutes = routes.filter(function(route) {
    return route.approvalStatus === 'applied' || route.approvalStatus === 'rejected'
  })

  var activeStack = document.createElement('div')
  activeStack.className = 'action-review-stack'
  var activeTitle = document.createElement('h4')
  activeTitle.textContent = 'Needs human review'
  activeStack.appendChild(activeTitle)
  if (!activeRoutes.length) {
    var empty = document.createElement('p')
    empty.className = 'lane-empty'
    empty.textContent = 'No pending or approved routes need a human review right now.'
    activeStack.appendChild(empty)
  } else {
    activeRoutes.forEach(function(route) {
      activeStack.appendChild(renderActionReviewCard(route))
    })
  }
  panel.appendChild(activeStack)

  var closedDetails = document.createElement('details')
  closedDetails.className = 'action-review-history'
  var closedSummary = document.createElement('summary')
  closedSummary.textContent = 'Applied and rejected history (' + closedRoutes.length + ')'
  closedDetails.appendChild(closedSummary)
  var closedStack = document.createElement('div')
  closedStack.className = 'action-review-stack'
  if (!closedRoutes.length) {
    var noneClosed = document.createElement('p')
    noneClosed.className = 'lane-empty'
    noneClosed.textContent = 'No routes have been applied or rejected yet.'
    closedStack.appendChild(noneClosed)
  } else {
    closedRoutes.forEach(function(route) {
      closedStack.appendChild(renderActionReviewCard(route))
    })
  }
  closedDetails.appendChild(closedStack)
  panel.appendChild(closedDetails)
  return panel
}

function setFormStatus(target, message, tone) {
  target.textContent = message || ''
  target.className = 'form-status' + (tone ? ' form-status-' + tone : '')
}

function buildField(labelText, input) {
  var field = document.createElement('label')
  field.className = 'memory-field'

  var label = document.createElement('span')
  label.className = 'memory-field-label'
  label.textContent = labelText
  field.appendChild(label)

  field.appendChild(input)
  return field
}

function buildInput(type, placeholder) {
  var input = document.createElement('input')
  input.type = type || 'text'
  input.className = 'memory-input'
  if (placeholder) input.placeholder = placeholder
  return input
}

function buildTextarea(placeholder, rows) {
  var textarea = document.createElement('textarea')
  textarea.className = 'memory-textarea'
  textarea.rows = rows || 3
  if (placeholder) textarea.placeholder = placeholder
  return textarea
}

function buildSelect(options) {
  var select = document.createElement('select')
  select.className = 'memory-select'

  options.forEach(function(option) {
    var el = document.createElement('option')
    el.value = option.value
    el.textContent = option.label
    if (option.disabled) el.disabled = true
    if (option.selected) el.selected = true
    select.appendChild(el)
  })

  return select
}

function renderAdminTokenPanel() {
  var panel = document.createElement('section')
  panel.className = 'panel memory-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Write Access'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Temporary Write Gate'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Local same-machine use is auto-approved right now. This token box only matters if you open the system from somewhere other than the local machine before real logins exist.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var form = document.createElement('div')
  form.className = 'memory-form-grid'

  var tokenInput = buildInput('password', 'Paste admin token')
  tokenInput.value = getStoredAdminToken()
  form.appendChild(buildField('Admin Token', tokenInput))

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var saveButton = document.createElement('button')
  saveButton.className = 'memory-button'
  saveButton.type = 'button'
  saveButton.textContent = 'Save Token'
  actions.appendChild(saveButton)

  var clearButton = document.createElement('button')
  clearButton.className = 'memory-button memory-button-secondary'
  clearButton.type = 'button'
  clearButton.textContent = 'Clear'
  actions.appendChild(clearButton)

  form.appendChild(actions)
  panel.appendChild(form)

  var status = document.createElement('p')
  status.className = 'form-status'
  setFormStatus(status, getStoredAdminToken() ? 'Remote-access token saved for this browser.' : 'Local browser access is already allowed. Token is optional unless you are coming in remotely.', getStoredAdminToken() ? 'success' : '')
  panel.appendChild(status)

  saveButton.addEventListener('click', function() {
    setStoredAdminToken(tokenInput.value.trim())
    setFormStatus(status, tokenInput.value.trim() ? 'Remote-access token saved for this browser.' : 'Token cleared. Local same-machine access still works.', tokenInput.value.trim() ? 'success' : '')
  })

  clearButton.addEventListener('click', function() {
    tokenInput.value = ''
    setStoredAdminToken('')
    setFormStatus(status, 'Token cleared. Local same-machine access still works.', '')
  })

  return panel
}

function renderChangeEventCard(item) {
  var card = document.createElement('article')
  card.className = 'change-card'

  var top = document.createElement('div')
  top.className = 'change-top'

  var title = document.createElement('strong')
  title.textContent = item.summary
  top.appendChild(title)

  var stamp = document.createElement('span')
  stamp.className = 'change-stamp'
  stamp.textContent = formatDate(item.createdAt)
  top.appendChild(stamp)

  card.appendChild(top)

  var meta = document.createElement('div')
  meta.className = 'change-meta'
  meta.textContent = item.actor + ' · ' + item.eventType + ' · ' + item.entityId
  card.appendChild(meta)

  return card
}

function buildStrategyLedgerItems(context) {
  var updateMap = new Map()
  ;(context.updates || []).forEach(function(item) {
    updateMap.set(item.id, item)
  })

  var items = []

  ;(context.updates || []).forEach(function(item) {
    items.push({
      kind: 'proposal',
      key: 'proposal-' + item.id,
      createdAt: item.proposedAt,
      title: item.summary,
      subtitle: item.id + ' · ' + item.status,
      targetDocPath: item.targetDocPath,
      targetSection: item.targetSection,
      decisionId: item.decisionId,
      decisionTitle: item.decisionTitle,
      decisionSourceRef: item.decisionSourceRef,
      decisionContextRef: item.decisionContextRef,
      decisionOwner: item.decisionOwner,
      decisionConfirmedBy: item.decisionConfirmedBy,
      detail: item.proposedDiff || item.proposedText || '',
    })
  })

  ;(context.changes || []).forEach(function(change) {
    var linked = updateMap.get(change.entityId)
    items.push({
      kind: 'event',
      key: 'event-' + change.id,
      createdAt: change.createdAt,
      title: change.summary,
      subtitle: change.actor + ' · ' + change.eventType,
      targetDocPath: change.metadata && change.metadata.targetDocPath
        ? change.metadata.targetDocPath
        : (linked ? linked.targetDocPath : null),
      targetSection: change.metadata && change.metadata.targetSection
        ? change.metadata.targetSection
        : (linked ? linked.targetSection : null),
      decisionId: change.metadata && change.metadata.decisionId
        ? change.metadata.decisionId
        : (linked ? linked.decisionId : null),
      decisionTitle: linked ? linked.decisionTitle : null,
      decisionSourceRef: linked ? linked.decisionSourceRef : null,
      decisionContextRef: linked ? linked.decisionContextRef : null,
      decisionOwner: linked ? linked.decisionOwner : null,
      decisionConfirmedBy: linked ? linked.decisionConfirmedBy : null,
      detail: '',
    })
  })

  items.sort(function(a, b) {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })

  return items
}

function renderStrategyLedgerCard(item) {
  var card = document.createElement('article')
  card.className = 'doc-update-card'

  var top = document.createElement('div')
  top.className = 'decision-top'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h4')
  title.textContent = item.title
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'decision-id'
  meta.textContent = (item.kind === 'proposal' ? 'Proposal' : 'History') + ' · ' + (item.subtitle || 'Change')
  titleWrap.appendChild(meta)
  top.appendChild(titleWrap)

  var stamp = document.createElement('span')
  stamp.className = 'change-stamp'
  stamp.textContent = formatDate(item.createdAt)
  top.appendChild(stamp)

  card.appendChild(top)

  if (item.decisionId || item.decisionTitle) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Decision', [item.decisionId, item.decisionTitle].filter(Boolean).join(' · ')))
  }
  if (item.targetDocPath) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Target', item.targetDocPath))
  }
  if (item.targetSection) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Section', item.targetSection))
  }
  if (item.decisionSourceRef) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Why / source', item.decisionSourceRef))
  }
  if (item.decisionContextRef) {
    card.appendChild(renderLabeledCopy('decision-meta', 'Context', item.decisionContextRef))
  }
  if (item.decisionOwner || item.decisionConfirmedBy) {
    card.appendChild(renderLabeledCopy(
      'decision-meta',
      'Approval path',
      [item.decisionOwner ? 'Owner: ' + item.decisionOwner : '', item.decisionConfirmedBy ? 'Confirmed: ' + item.decisionConfirmedBy : ''].filter(Boolean).join(' · ')
    ))
  }
  if (item.kind === 'proposal' && item.detail) {
    var diff = document.createElement('details')
    diff.className = 'memory-inline-editor'
    var diffSummary = document.createElement('summary')
    diffSummary.textContent = 'What changed'
    diff.appendChild(diffSummary)
    var diffBody = document.createElement('pre')
    diffBody.className = 'doc-update-diff'
    diffBody.textContent = item.detail
    diff.appendChild(diffBody)
    card.appendChild(diff)
  }

  return card
}

function renderBacklogCreatePanel(hub) {
  var panel = document.createElement('section')
  panel.className = 'panel memory-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Create'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'New Backlog Item'
  left.appendChild(title)

  header.appendChild(left)
  panel.appendChild(header)

  var form = document.createElement('form')
  form.className = 'memory-form-grid'

  var availableScopes = ((hub.meta && hub.meta.backlogScopes) || getBacklogScopes()).filter(function(scope) {
    return scope.active !== false
  })
  var defaultScope = availableScopes.find(function(scope) { return scope.key === 'foundation' }) || availableScopes[0] || fallbackBacklogScopes[0]

  var prefixSelect = buildSelect((hub.meta && hub.meta.backlogIdPrefixes || []).concat(['TASK']).filter(function(value, index, array) {
    return array.indexOf(value) === index
  }).map(function(prefix, index) {
    return { value: prefix, label: prefix, selected: index === 0 }
  }))
  form.appendChild(buildField('ID Prefix', prefixSelect))

  var scopeSelect = buildSelect(availableScopes.map(function(scope) {
    return { value: scope.key, label: scope.label, selected: scope.key === defaultScope.key }
  }))
  form.appendChild(buildField('Scope', scopeSelect))

  var laneSelect = buildSelect(backlogLanes.map(function(lane, index) {
    return { value: lane.key, label: lane.label, selected: lane.key === 'research' && index >= 0 }
  }))
  form.appendChild(buildField('Lane', laneSelect))

  var prioritySelect = buildSelect([
    { value: 'P0', label: 'P0' },
    { value: 'P1', label: 'P1', selected: true },
    { value: 'P2', label: 'P2' },
    { value: 'P3', label: 'P3' },
  ])
  form.appendChild(buildField('Priority', prioritySelect))

  var titleInput = buildInput('text', 'Title')
  form.appendChild(buildField('Title', titleInput))

  var ownerInput = buildInput('text', 'Owner')
  form.appendChild(buildField('Owner', ownerInput))

  var sourceInput = buildInput('text', 'Source')
  form.appendChild(buildField('Source', sourceInput))

  var summaryInput = buildTextarea('Short summary', 3)
  form.appendChild(buildField('Summary', summaryInput))

  var whyInput = buildTextarea('Why it matters', 3)
  form.appendChild(buildField('Why It Matters', whyInput))

  var nextInput = buildTextarea('Next action', 3)
  form.appendChild(buildField('Next Action', nextInput))

  var noteInput = buildTextarea('Status note', 2)
  form.appendChild(buildField('Status Note', noteInput))

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'

  var submit = document.createElement('button')
  submit.className = 'memory-button'
  submit.type = 'submit'
  submit.textContent = 'Create Backlog Item'
  actions.appendChild(submit)

  form.appendChild(actions)

  var status = document.createElement('p')
  status.className = 'form-status'
  form.appendChild(status)

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    submit.disabled = true
    setFormStatus(status, 'Creating backlog item…')
    foundationMutation('/api/foundation/backlog', 'POST', {
      idPrefix: prefixSelect.value,
      scope: scopeSelect.value,
      lane: laneSelect.value,
      priority: prioritySelect.value,
      title: titleInput.value.trim(),
      owner: ownerInput.value.trim(),
      source: sourceInput.value.trim(),
      summary: summaryInput.value.trim(),
      whyItMatters: whyInput.value.trim(),
      nextAction: nextInput.value.trim(),
      statusNote: noteInput.value.trim(),
    }).then(function() {
      form.reset()
      prefixSelect.value = (hub.meta && hub.meta.backlogIdPrefixes && hub.meta.backlogIdPrefixes[0]) || 'FOUNDATION'
      scopeSelect.value = defaultScope.key
      laneSelect.value = 'research'
      prioritySelect.value = 'P1'
      setFormStatus(status, 'Backlog item created.', 'success')
      renderBacklog()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to create backlog item.', 'error')
    }).finally(function() {
      submit.disabled = false
    })
  })

  panel.appendChild(form)
  return panel
}

function renderBacklogItemEditor(item) {
  var details = document.createElement('details')
  details.className = 'memory-inline-editor'

  var summary = document.createElement('summary')
  summary.textContent = 'Update'
  details.appendChild(summary)

  var wrap = document.createElement('div')
  wrap.className = 'memory-inline-grid'

  var scopeSelect = buildSelect(getActiveBacklogScopes().map(function(scope) {
    return { value: scope.key, label: scope.label, selected: scope.key === item.scope }
  }))
  wrap.appendChild(buildField('Scope', scopeSelect))

  var laneSelect = buildSelect(backlogLanes.map(function(lane) {
    return { value: lane.key, label: lane.label, selected: lane.key === item.lane }
  }))
  wrap.appendChild(buildField('Lane', laneSelect))

  var prioritySelect = buildSelect(['P0', 'P1', 'P2', 'P3'].map(function(priority) {
    return { value: priority, label: priority, selected: priority === item.priority }
  }))
  wrap.appendChild(buildField('Priority', prioritySelect))

  var ownerInput = buildInput('text', 'Owner')
  ownerInput.value = item.owner || ''
  wrap.appendChild(buildField('Owner', ownerInput))

  var noteInput = buildTextarea('Status note', 2)
  noteInput.value = item.statusNote || ''
  wrap.appendChild(buildField('Status Note', noteInput))

  var save = document.createElement('button')
  save.type = 'button'
  save.className = 'memory-button'
  save.textContent = 'Save'
  wrap.appendChild(save)

  var status = document.createElement('p')
  status.className = 'form-status'
  wrap.appendChild(status)

  save.addEventListener('click', function() {
    save.disabled = true
    setFormStatus(status, 'Saving…')
    foundationMutation('/api/foundation/backlog/' + encodeURIComponent(item.id), 'PATCH', {
      scope: scopeSelect.value,
      lane: laneSelect.value,
      priority: prioritySelect.value,
      owner: ownerInput.value.trim(),
      statusNote: noteInput.value.trim(),
    }).then(function() {
      setFormStatus(status, 'Saved.', 'success')
      renderBacklog()
    }).catch(function(error) {
      setFormStatus(status, error.message || 'Failed to save.', 'error')
    }).finally(function() {
      save.disabled = false
    })
  })

  details.appendChild(wrap)
  return details
}

function getBacklogLaneLabel(laneKey) {
  var match = backlogLanes.find(function(lane) { return lane.key === laneKey })
  return match ? match.label : laneKey
}

function getBacklogScopeLabel(scopeKey) {
  var match = getBacklogScopeMeta(scopeKey)
  return match ? match.label : (scopeKey || 'Unassigned')
}

function getBacklogScopeShortLabel(scopeKey) {
  var match = getBacklogScopeMeta(scopeKey)
  if (!match) return scopeKey || 'unassigned'
  return match.shortLabel || String(match.label || scopeKey).toLowerCase()
}

function renderOperatorToolsDrawer(titleText, introText, panels, openByDefault) {
  var details = document.createElement('details')
  details.className = 'operator-tools-drawer'
  if (openByDefault) details.open = true

  var summary = document.createElement('summary')
  summary.className = 'operator-tools-summary'

  var left = document.createElement('div')
  left.className = 'operator-tools-summary-left'

  var title = document.createElement('div')
  title.className = 'operator-tools-title'
  title.textContent = titleText || 'Operator Tools'
  left.appendChild(title)

  if (introText) {
    var intro = document.createElement('div')
    intro.className = 'operator-tools-intro'
    intro.textContent = introText
    left.appendChild(intro)
  }

  summary.appendChild(left)

  var state = document.createElement('span')
  state.className = 'operator-tools-state'
  state.textContent = 'Collapsed until needed'
  summary.appendChild(state)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'operator-tools-body'
  ;(panels || []).forEach(function(panel) {
    if (panel) body.appendChild(panel)
  })
  details.appendChild(body)

  return details
}

// Decisions and Open Questions renderer helpers live in public/foundation-decision-question-renderers.js.

function renderOverviewStatusPanel(items, options) {
  if (!items || !items.length) return null

  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = opts.eyebrow || 'Foundation State'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = opts.title || 'System Status'
  left.appendChild(title)

  if (opts.intro) {
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = opts.intro
    left.appendChild(intro)
  }

  header.appendChild(left)
  panel.appendChild(header)

  var statusGrid = document.createElement('div')
  statusGrid.className = 'status-grid'
  items.forEach(function(item) {
    statusGrid.appendChild(renderStatusCard(item))
  })
  panel.appendChild(statusGrid)

  return panel
}

function renderRecentChangesPanel(items, options) {
  if (!items || !items.length) return null

  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = opts.eyebrow || 'Trust Layer'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = opts.title || 'System Activity'
  left.appendChild(title)

  if (opts.intro) {
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = opts.intro
    left.appendChild(intro)
  }

  header.appendChild(left)
  panel.appendChild(header)

  var list = document.createElement('div')
  list.className = 'change-list'
  items.forEach(function(item) {
    list.appendChild(renderChangeEventCard(item))
  })
  panel.appendChild(list)

  return panel
}

function renderChangeLogMetric(label, value, detail) {
  var card = document.createElement('div')
  card.className = 'build-log-summary-metric'
  var strong = document.createElement('strong')
  strong.textContent = value
  card.appendChild(strong)
  var span = document.createElement('span')
  span.textContent = label
  card.appendChild(span)
  if (detail) {
    var copy = document.createElement('p')
    copy.textContent = detail
    card.appendChild(copy)
  }
  return card
}

function renderChangeLogSummary(changeLog) {
  var summary = changeLog.summary || {}
  var panel = document.createElement('section')
  panel.className = 'build-log-executive-summary change-log-summary'
  panel.setAttribute('data-change-log-section', 'summary')

  var copy = document.createElement('div')
  copy.className = 'build-log-executive-copy'
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Comprehensive Changelog'
  copy.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What changed across Foundation'
  copy.appendChild(title)
  var intro = document.createElement('p')
  intro.textContent = 'This layer combines verified closeouts, DB trust events, and changed-file evidence. Recent Work stays the shipped-build review surface; this page tracks the broader change trail by type and surface.'
  copy.appendChild(intro)
  panel.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'build-log-summary-grid change-log-summary-grid'
  grid.appendChild(renderChangeLogMetric('Entries', String(summary.totalEntries || 0), 'Source-backed changelog rows currently shown.'))
  grid.appendChild(renderChangeLogMetric('Verified closeout rows', String(summary.verifiedCloseoutBackedEntries || 0), 'Rows backed by v2 verified closeouts.'))
  grid.appendChild(renderChangeLogMetric('Change types', String(summary.representedChangeTypes || 0) + '/10', 'Required types represented unless evidence is absent.'))
  grid.appendChild(renderChangeLogMetric('Recent builds', String(summary.latestRecentBuildsRepresented || 0) + '/5', 'Newest Recent Work builds represented here.'))
  panel.appendChild(grid)

  return panel
}

function renderChangeLogCardLinks(values, label, className) {
  var ids = (values || []).filter(Boolean)
  if (!ids.length) return null

  var wrap = document.createElement('div')
  wrap.className = 'build-log-fact'
  wrap.setAttribute('data-change-log-owner-context', label)
  var strong = document.createElement('strong')
  strong.textContent = label
  wrap.appendChild(strong)
  var links = document.createElement('div')
  links.className = 'build-log-backlog-links'
  ids.forEach(function(id) {
    var link = document.createElement('a')
    link.className = className || 'build-log-backlog-link'
    link.href = '/foundation#backlog:' + id
    link.textContent = id
    links.appendChild(link)
  })
  wrap.appendChild(links)
  return wrap
}

function renderChangeLogEntryCard(entry) {
  var card = document.createElement('article')
  card.className = 'change-log-entry'

  var top = document.createElement('div')
  top.className = 'change-log-entry-top'
  var left = document.createElement('div')
  left.className = 'change-log-entry-copy'
  var title = document.createElement('strong')
  title.textContent = entry.title || entry.summary || 'Foundation change'
  left.appendChild(title)
  var summary = document.createElement('p')
  summary.textContent = entry.summary || 'Source-backed Foundation change.'
  left.appendChild(summary)
  top.appendChild(left)
  var stamp = document.createElement('span')
  stamp.className = 'change-stamp'
  stamp.textContent = formatDate(entry.occurredAt)
  top.appendChild(stamp)
  card.appendChild(top)

  var meta = document.createElement('div')
  meta.className = 'change-log-entry-meta'
  meta.textContent = [
    entry.changeTypeLabel || entry.changeType,
    entry.surface,
    entry.sourceKind,
    entry.commit ? 'commit ' + entry.commit : null,
    entry.closeoutKey,
  ].filter(Boolean).join(' · ')
  card.appendChild(meta)

  var ownerLinks = renderChangeLogCardLinks(entry.backlogIds, 'Owning cards', 'build-log-backlog-link')
  if (ownerLinks) card.appendChild(ownerLinks)
  var contextLinks = renderChangeLogCardLinks(entry.mentionedBacklogIds, 'Context cards', 'build-log-backlog-link build-log-context-link')
  if (contextLinks) card.appendChild(contextLinks)

  if ((entry.evidenceRefs || []).length) {
    var details = document.createElement('details')
    details.className = 'change-log-evidence'
    details.setAttribute('data-change-log-evidence-group', 'refs')
    var detailsSummary = document.createElement('summary')
    detailsSummary.textContent = 'Evidence refs'
    details.appendChild(detailsSummary)
    var list = document.createElement('ul')
    list.className = 'change-log-evidence-list'
    ;(entry.evidenceRefs || []).slice(0, 12).forEach(function(ref) {
      var item = document.createElement('li')
      item.setAttribute('data-change-log-evidence-ref', 'true')
      item.textContent = ref
      list.appendChild(item)
    })
    details.appendChild(list)
    card.appendChild(details)
  }

  return card
}

function renderChangeLogHighlights(changeLog) {
  var highlights = changeLog.groups && changeLog.groups.recentHighlights || []
  if (!highlights.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'recent-highlights')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Recent Highlights'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Review these changes first'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Highlighted rows are recent, verified, plan/state, or process-impacting changes.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var list = document.createElement('div')
  list.className = 'change-log-entry-list'
  highlights.slice(0, 8).forEach(function(entry) {
    list.appendChild(renderChangeLogEntryCard(entry))
  })
  panel.appendChild(list)
  return panel
}

function renderChangeLogGroupCard(group, mode) {
  var card = document.createElement('article')
  card.className = 'change-log-group-card'
  var top = document.createElement('div')
  top.className = 'change-log-group-top'
  var title = document.createElement('strong')
  title.textContent = group.label || group.key
  top.appendChild(title)
  var count = document.createElement('span')
  count.className = 'status-pill status-pill-static status-connected'
  count.textContent = (group.count || 0) + ' changes'
  top.appendChild(count)
  card.appendChild(top)

  if (group.absenceProof) {
    var missing = document.createElement('p')
    missing.className = 'change-log-missing-proof'
    missing.textContent = group.absenceProof.reason
    card.appendChild(missing)
  }

  var items = group.items || []
  if (items.length) {
    var list = document.createElement('ul')
    list.className = 'change-log-group-list'
    items.slice(0, 5).forEach(function(entry) {
      var item = document.createElement('li')
      item.textContent = mode === 'type'
        ? [entry.surface, entry.title].filter(Boolean).join(' · ')
        : [entry.changeTypeLabel, entry.title].filter(Boolean).join(' · ')
      list.appendChild(item)
    })
    card.appendChild(list)
  }

  return card
}

function renderChangeLogSurfaceGroups(changeLog) {
  var groups = changeLog.groups && changeLog.groups.bySurface || []
  if (!groups.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'by-surface')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'By Surface'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Where the changes live'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Surface grouping shows whether the change affected Backlog, Recent Work, Runtime Health, System Inventory, Data Sources, docs, gates, or intelligence lanes.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var grid = document.createElement('div')
  grid.className = 'change-log-group-grid'
  groups.forEach(function(group) {
    grid.appendChild(renderChangeLogGroupCard(group, 'surface'))
  })
  panel.appendChild(grid)
  return panel
}

function renderChangeLogTypeGroups(changeLog) {
  var groups = changeLog.groups && changeLog.groups.byType || []
  if (!groups.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'by-type')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'By Type'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What kind of change happened'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'All required change categories are listed. A missing category must show why there is no real evidence instead of disappearing.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var grid = document.createElement('div')
  grid.className = 'change-log-group-grid change-log-type-grid'
  groups.forEach(function(group) {
    grid.appendChild(renderChangeLogGroupCard(group, 'type'))
  })
  panel.appendChild(grid)
  return panel
}

function renderChangeLogRawEvidence(changeLog) {
  var entries = changeLog.groups && changeLog.groups.rawEvidence || []
  if (!entries.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel change-log-panel'
  panel.setAttribute('data-change-log-section', 'raw-evidence')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Raw Evidence Feed'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Inspectable source-backed rows'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Every row points back to a closeout, commit, changed file, or DB change event. Private/local docs stay metadata-only.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)
  var list = document.createElement('div')
  list.className = 'change-log-entry-list'
  entries.slice(0, 30).forEach(function(entry) {
    list.appendChild(renderChangeLogEntryCard(entry))
  })
  panel.appendChild(list)
  return panel
}

function formatCoverageCount(value) {
  var count = Number(value || 0)
  return count.toLocaleString()
}

function formatCoverageReason(value) {
  return String(value || 'unspecified')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getExtractionCoverageStatus(record) {
  var counts = record.counts || {}
  var retrySummary = record.retrySummary || {}
  if (record.hardeningStatus === 'blocked' || Number(retrySummary.retryBlockedItems || 0) > 0 || Number(retrySummary.retryExhaustedItems || 0) > 0) return 'risk'
  if (record.status === 'blocked' || Number(counts.failedItems || 0) > 0 || record.lastStatus === 'failed') return 'risk'
  if (record.hardeningStatus === 'retry_ready' || record.lastStatus === 'partial' || Number(counts.skippedItems || 0) > 0 || Number(counts.pendingItems || 0) > 0) return 'pending'
  if (record.status === 'active') return 'live'
  if (record.status === 'paused') return 'pending'
  return 'planned'
}

function appendExtractionCoverageMetric(container, labelText, valueText, detailText) {
  var item = document.createElement('div')
  item.className = 'extraction-coverage-metric'

  var label = document.createElement('span')
  label.textContent = labelText
  item.appendChild(label)

  var value = document.createElement('strong')
  value.textContent = valueText || 'Not available'
  item.appendChild(value)

  if (detailText) {
    var detail = document.createElement('small')
    detail.textContent = detailText
    item.appendChild(detail)
  }

  container.appendChild(item)
}

function appendExtractionCoverageChip(container, text, kind) {
  var chip = document.createElement('span')
  chip.className = 'extraction-coverage-chip' + (kind ? ' extraction-coverage-chip-' + kind : '')
  chip.textContent = text
  container.appendChild(chip)
}

function renderExtractionCoverageCard(record) {
  var counts = record.counts || {}
  var retrySummary = record.retrySummary || {}
  var status = getExtractionCoverageStatus(record)
  var card = document.createElement('article')
  card.className = 'extraction-coverage-card status-' + status

  var header = document.createElement('div')
  header.className = 'extraction-coverage-card-header'

  var titleWrap = document.createElement('div')
  var title = document.createElement('h4')
  title.textContent = record.title || record.targetKey
  titleWrap.appendChild(title)

  var meta = document.createElement('p')
  meta.textContent = [
    record.targetKey,
    record.sourceId,
    record.lane,
    record.effectiveRuntimeMode || record.runtimeMode,
  ].filter(Boolean).join(' · ')
  titleWrap.appendChild(meta)
  header.appendChild(titleWrap)

  var pill = document.createElement('span')
  pill.className = 'status-pill'
  pill.textContent = status
  header.appendChild(pill)
  card.appendChild(header)

  var metrics = document.createElement('div')
  metrics.className = 'extraction-coverage-metrics'
  appendExtractionCoverageMetric(metrics, 'Last success', formatDate(record.lastSuccessAt), record.successfulRuns ? formatCoverageCount(record.successfulRuns) + ' successful runs' : '')
  appendExtractionCoverageMetric(metrics, 'Last failure', formatDate(record.lastFailureAt), record.latestFailureStatus || record.latestFailureError || '')
  appendExtractionCoverageMetric(metrics, 'Next bite', formatDate(record.nextBiteAt), record.scheduleStatus || record.scheduleTruth || '')
  appendExtractionCoverageMetric(
    metrics,
    'Runner checkpoint',
    formatDate(record.crawlCheckpointNextRunAt),
    record.crawlCheckpointNextRunAt && record.crawlCheckpointNextRunAt !== record.nextBiteAt ? 'Target checkpoint' : 'Aligned with next bite'
  )
  appendExtractionCoverageMetric(
    metrics,
    'Items',
    formatCoverageCount(counts.totalItems),
    formatCoverageCount(counts.succeededItems) + ' succeeded · '
      + formatCoverageCount(counts.skippedItems) + ' skipped · '
      + formatCoverageCount(counts.failedItems) + ' failed'
  )
  appendExtractionCoverageMetric(
    metrics,
    'Retry state',
    formatCoverageCount(retrySummary.retryEligibleItems) + ' eligible',
    formatCoverageCount(retrySummary.retryWaitingItems) + ' waiting · '
      + formatCoverageCount(retrySummary.retryExhaustedItems) + ' exhausted · '
      + formatCoverageCount(retrySummary.retryBlockedItems) + ' blocked'
  )
  card.appendChild(metrics)

  var reasons = document.createElement('div')
  reasons.className = 'extraction-coverage-section'
  var reasonsTitle = document.createElement('h5')
  reasonsTitle.textContent = 'Top failed/skipped reasons'
  reasons.appendChild(reasonsTitle)
  var reasonChips = document.createElement('div')
  reasonChips.className = 'extraction-coverage-chip-row'
  var topReasons = Array.isArray(record.topReasons) ? record.topReasons : []
  if (topReasons.length) {
    topReasons.forEach(function(reason) {
      appendExtractionCoverageChip(
        reasonChips,
        formatCoverageCount(reason.count) + ' ' + reason.status + ' - ' + formatCoverageReason(reason.reason),
        reason.status === 'failed' ? 'risk' : 'pending'
      )
    })
  } else {
    appendExtractionCoverageChip(reasonChips, 'No failed/skipped reasons recorded', 'neutral')
  }
  reasons.appendChild(reasonChips)
  card.appendChild(reasons)

  var remaining = document.createElement('div')
  remaining.className = 'extraction-coverage-section'
  var remainingTitle = document.createElement('h5')
  remainingTitle.textContent = 'Remaining backlog'
  remaining.appendChild(remainingTitle)
  var remainingChips = document.createElement('div')
  remainingChips.className = 'extraction-coverage-chip-row'
  var indicators = Array.isArray(record.remainingBacklogIndicators) ? record.remainingBacklogIndicators : []
  if (indicators.length) {
    indicators.forEach(function(indicator) {
      appendExtractionCoverageChip(
        remainingChips,
        formatCoverageCount(indicator.count) + ' ' + formatCoverageReason(indicator.label),
        'backlog'
      )
    })
  } else {
    appendExtractionCoverageChip(remainingChips, 'No explicit backlog indicator exposed', 'neutral')
  }
  remaining.appendChild(remainingChips)
  card.appendChild(remaining)

  var retry = document.createElement('div')
  retry.className = 'extraction-coverage-section'
  var retryTitle = document.createElement('h5')
  retryTitle.textContent = 'Retry / next safe action'
  retry.appendChild(retryTitle)
  var retryChips = document.createElement('div')
  retryChips.className = 'extraction-coverage-chip-row'
  var retryReasons = Array.isArray(retrySummary.retryReasons) ? retrySummary.retryReasons : []
  if (retryReasons.length) {
    retryReasons.slice(0, 4).forEach(function(reason) {
      appendExtractionCoverageChip(
        retryChips,
        formatCoverageCount(reason.count) + ' ' + reason.retryState + ' - ' + formatCoverageReason(reason.reason),
        reason.retryState === 'blocked' || reason.retryState === 'exhausted' ? 'risk' : 'pending'
      )
    })
  }
  appendExtractionCoverageChip(retryChips, record.nextSafeCommand || 'No failed item retry action needed', record.nextSafeCommand && /^Blocked/.test(record.nextSafeCommand) ? 'risk' : 'neutral')
  retry.appendChild(retryChips)
  card.appendChild(retry)

  var findings = Array.isArray(record.healthFindings) ? record.healthFindings : []
  if (findings.length) {
    var findingLine = document.createElement('p')
    findingLine.className = 'extraction-coverage-finding-line'
    findingLine.textContent = 'Findings: ' + findings.slice(0, 2).map(function(finding) {
      return finding.detail || finding.type || 'Extraction health finding.'
    }).join(' ')
    card.appendChild(findingLine)
  }

  return card
}

function renderExtractionControlPanel(extractionControl) {
  if (!extractionControl) return null
  var targets = Array.isArray(extractionControl.coverageByTarget)
    ? extractionControl.coverageByTarget
    : []
  if (!targets.length) {
    targets = (Array.isArray(extractionControl.targets) ? extractionControl.targets : []).map(function(target) {
      return {
        targetKey: target.targetKey,
        title: target.title,
        sourceId: target.sourceId,
        lane: target.lane,
        status: target.status,
        runtimeMode: target.runtimeMode,
        effectiveRuntimeMode: target.effectiveRuntimeMode,
        scheduleStatus: target.scheduler && target.scheduler.scheduleStatus,
        scheduleTruth: target.scheduler && target.scheduler.scheduleTruth,
        nextBiteAt: target.effectiveNextRunAt || target.nextRunAt,
        lastRunAt: target.lastRunAt,
        lastStatus: target.lastStatus,
        lastError: target.lastError,
        lastSuccessAt: target.lastStatus === 'succeeded' ? target.lastRunAt : null,
        lastFailureAt: target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastRunAt : null,
        counts: {
          inspectedCount: target.inspectedCount,
          archivedCount: target.archivedCount,
          extractedCount: target.extractedCount,
          totalItems: target.itemSummary && target.itemSummary.totalItems,
          succeededItems: target.itemSummary && target.itemSummary.succeededItems,
          skippedItems: target.itemSummary && target.itemSummary.skippedItems,
          failedItems: target.itemSummary && target.itemSummary.failedItems,
          pendingItems: target.itemSummary && target.itemSummary.pendingItems,
        },
        topReasons: (target.itemSummary && target.itemSummary.reasons || []).filter(function(reason) {
          return reason.status === 'failed' || reason.status === 'skipped'
        }).slice(0, 5),
        remainingBacklogIndicators: [],
        retrySummary: target.itemSummary || {},
        nextSafeCommand: target.nextSafeCommand || '',
        hardeningStatus: target.hardeningStatus || '',
        healthFindings: target.healthFindings || [],
      }
    })
  }
  if (!targets.length) return null

  var summary = 'Coverage by target for current-day and bounded-backfill crawl lanes. '
    + ((extractionControl.summary && extractionControl.summary.currentDayTargets) || 0) + ' current-day, '
    + ((extractionControl.summary && extractionControl.summary.backfillTargets) || 0) + ' backfill, '
    + ((extractionControl.summary && extractionControl.summary.corpusMiningTargets) || 0) + ' corpus-mining, '
    + ((extractionControl.summary && extractionControl.summary.scheduledTargets) || 0) + ' scheduled, '
    + ((extractionControl.summary && extractionControl.summary.pausedTargets) || 0) + ' paused, '
    + ((extractionControl.summary && extractionControl.summary.recentItemFailures) || 0) + ' recent item failures, '
    + ((extractionControl.summary && extractionControl.summary.retryEligibleItems) || 0) + ' retry eligible, '
    + ((extractionControl.summary && extractionControl.summary.retryExhaustedItems) || 0) + ' exhausted, '
    + ((extractionControl.summary && extractionControl.summary.retryBlockedItems) || 0) + ' blocked, '
    + ((extractionControl.summary && extractionControl.summary.staleLeasedItems) || 0) + ' stale item leases, '
    + ((extractionControl.summary && extractionControl.summary.coverageTargetsWithRemainingBacklog) || 0) + ' targets with remaining backlog indicators, '
    + ((extractionControl.summary && extractionControl.summary.targetRiskFindings) || 0) + ' risk findings, '
    + ((extractionControl.summary && extractionControl.summary.targetWarningFindings) || 0) + ' warnings.'

  var panel = document.createElement('section')
  panel.className = 'panel extraction-coverage-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live State'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Extraction Control: Coverage By Target'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = summary
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'extraction-coverage-grid'
  targets.forEach(function(target) {
    grid.appendChild(renderExtractionCoverageCard(target))
  })
  panel.appendChild(grid)

  return panel
}

function renderSurfaceFreshnessSweepPanel(sweep) {
  if (!sweep || !sweep.summary || !Array.isArray(sweep.surfaces)) return null
  var summary = sweep.summary.mappedSurfaceCount + ' Foundation surfaces mapped to backing APIs/docs/tables. '
    + sweep.summary.riskSurfaces + ' risk, '
    + sweep.summary.warningSurfaces + ' warning, '
    + sweep.summary.staleActiveRunCount + ' stale active source-crawl runs.'

  var items = []
  var findings = Array.isArray(sweep.findings) ? sweep.findings : []
  findings.slice(0, 6).forEach(function(finding) {
    items.push({
      label: finding.surfaceLabel + ' - ' + finding.type,
      status: finding.severity === 'risk' ? 'risk' : 'pending',
      detail: finding.detail || 'Surface freshness finding needs review.',
    })
  })

  sweep.surfaces.forEach(function(surface) {
    var owners = []
    if ((surface.backingApis || []).length) owners.push('APIs: ' + surface.backingApis.join(', '))
    if ((surface.backingDocs || []).length) owners.push('Docs: ' + surface.backingDocs.join(', '))
    if ((surface.backlogIds || []).length) owners.push('Backlog: ' + surface.backlogIds.join(', '))
    if ((surface.sourceIds || []).length) owners.push('Sources: ' + surface.sourceIds.join(', '))
    items.push({
      label: surface.label,
      status: surface.status === 'risk' ? 'risk' : surface.status === 'warning' ? 'pending' : 'live',
      detail: 'Owner: ' + surface.owner + '. ' + owners.join(' · '),
    })
  })

  return renderStatusGroupPanel(
    'Foundation Surface Sweep',
    summary,
    items
  )
}

function formatCoveragePercent(value) {
  var numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) return '0%'
  return (Math.round(numeric * 10) / 10).toString().replace(/\.0$/, '') + '%'
}

function renderIntelligencePipelinePanel(coverage, synthesis) {
  if (!coverage) return null
  var sources = Array.isArray(coverage.sources) ? coverage.sources : []
  if (!sources.length) return null

  var summary = 'Archive -> candidates -> synthesis. '
    + (coverage.totalArtifacts || 0) + ' artifacts archived, '
    + (coverage.totalCandidates || 0) + ' candidates extracted'
    + (coverage.latestSynthesisRun ? ', latest synthesis ' + formatDate(coverage.latestSynthesisRun.generatedAt) + '.' : '.')

  var items = sources
    .slice()
    .sort(function(a, b) {
      return (Number(b.artifactsPendingProcessing || b.artifactsWithoutCandidates || 0)
        - Number(a.artifactsPendingProcessing || a.artifactsWithoutCandidates || 0))
    })
    .slice(0, 8)
    .map(function(source) {
      var total = Number(source.totalArtifacts || 0)
      var withCandidates = Number(source.artifactsWithCandidates || 0)
      var withoutCandidates = Number(source.artifactsWithoutCandidates || 0)
      var processed = Number(source.artifactsProcessed || 0)
      var pendingProcessing = Number(source.artifactsPendingProcessing || withoutCandidates)
      var processingPercent = Number(source.processingCoveragePercent || 0)
      var coveragePercent = Number(source.extractionCoveragePercent || 0)
      var status = processingPercent >= 75
        ? 'live'
        : processed > 0
          ? 'planned'
          : 'risk'
      var newest = source.newestArtifactAt ? ' Newest artifact ' + formatDate(source.newestArtifactAt) + '.' : ''
      return {
        label: source.sourceId,
        status: status,
        detail: total + ' archived, ' + processed + ' processed, ' + pendingProcessing
          + ' pending extraction, ' + withCandidates + ' with candidates, ' + withoutCandidates
          + ' with no active candidate yet. ' + formatCoveragePercent(processingPercent) + ' processed / '
          + formatCoveragePercent(coveragePercent) + ' yielded candidates. '
          + (source.totalCandidates || 0) + ' candidate records.' + newest,
      }
    })

  if (coverage.latestSynthesisRun || (synthesis && synthesis.latestRun)) {
    var latestRun = coverage.latestSynthesisRun || synthesis.latestRun
    var itemCount = synthesis && Array.isArray(synthesis.latestItems) ? synthesis.latestItems.length : 0
    items.unshift({
      label: 'Latest synthesis',
      status: latestRun ? 'live' : 'planned',
      detail: latestRun
        ? latestRun.runId + ' read ' + (latestRun.candidatesRead || latestRun.candidates_read || 0)
          + ' candidates and produced ' + itemCount + ' visible item' + (itemCount === 1 ? '' : 's') + '.'
        : 'No synthesis run recorded.',
    })
  }

  return renderStatusGroupPanel(
    'Intelligence Pipeline',
    summary,
    items
  )
}

function renderDriveCorpusInventoryPanel(driveCorpusInventory) {
  if (!driveCorpusInventory || !driveCorpusInventory.summary) return null
  var summaryData = driveCorpusInventory.summary
  if (!summaryData.totalItems) return null

  var summary = 'Read-only Drive corpus inventory. '
    + summaryData.totalItems + ' items recorded, '
    + summaryData.folders + ' folders, '
    + summaryData.files + ' files, '
    + summaryData.inspectedFolders + ' folders inspected, '
    + summaryData.queuedFolders + ' queued, '
    + summaryData.failedItems + ' failed.'

  var routeItems = (driveCorpusInventory.valueRoutes || []).slice(0, 8).map(function(route) {
    return {
      label: route.valueRoute,
      status: route.valueRoute === 'sensitive_skip' ? 'risk' : 'live',
      detail: route.itemCount + ' inventoried item' + (route.itemCount === 1 ? '' : 's') + ' has this candidate route from metadata only.',
    }
  })

  var pendingCount = summaryData.pendingExtraction || 0
  if (pendingCount) {
    routeItems.unshift({
      label: 'Pending future extraction',
      status: 'planned',
      detail: pendingCount + ' inventoried item' + (pendingCount === 1 ? '' : 's') + ' marked for future text/slides/PDF/video review.',
    })
  }

  return renderStatusGroupPanel(
    'Drive Corpus Candidate Inventory',
    summary,
    routeItems
  )
}

function getLiveDocLatestAsOfBySource(sourceSnapshot) {
  var latestBySource = {}

  ;(sourceSnapshot || []).forEach(function(row) {
    if (!row || !row.sourceId || !row.asOf) return
    var current = latestBySource[row.sourceId]
    if (!current || String(row.asOf) > String(current)) {
      latestBySource[row.sourceId] = row.asOf
    }
  })

  return latestBySource
}

function renderLiveDocFreshnessPanel(docPath, sourceSnapshot, sourceContracts) {
  var contractList = (sourceContracts || []).filter(function(contract) {
    return contract.updateMethod || contract.refreshSchedule || contract.manualRefresh
  })
  if (!contractList.length) return null

  var latestBySource = getLiveDocLatestAsOfBySource(sourceSnapshot)
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live Data Status'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'Live Data On This Page'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'The doc text changes when the markdown changes. The table below shows when the live numbers on this page were last pulled and how they refresh.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var rows = [
    '| Source | Last live value shown here | Updates when | Auto-refresh |',
    '| --- | --- | --- | --- |',
  ]

  function simplifyUpdateMethod(value) {
    if (!value) return '—'
    if (value === 'Live read on page load') return 'When the page loads'
    return value
  }

  function simplifyRefreshSchedule(value) {
    if (!value) return '—'
    if (value === 'On demand only. No background schedule yet.') return 'No automatic refresh yet'
    return value
  }

  function simplifySourceLabel(contract) {
    if (!contract) return '—'
    if (contract.sourceId === 'SRC-FREEDOM-COMMUNITY-001') return 'Community tracker'
    if (contract.sourceId === 'SRC-FREEDOM-BHAG-001') return 'BHAG builder'
    if (contract.sourceId === 'SRC-FREEDOM-ENGINE-001') return 'Agent Engine'
    if (contract.sourceId === 'SRC-OWNERS-001') return 'Owners Admin tab'
    return contract.unitName || contract.title || contract.sourceId
  }

  contractList.forEach(function(contract) {
    rows.push(
      '| ' +
      simplifySourceLabel(contract) +
      ' ([`' + contract.sourceId + '`](' + getCurrentStateSourceHref(contract.sourceId) + ')) | ' +
      (latestBySource[contract.sourceId] ? formatAsOfDate(latestBySource[contract.sourceId]) : 'No live date in this page') +
      ' | ' +
      simplifyUpdateMethod(contract.updateMethod) +
      ' | ' +
      simplifyRefreshSchedule(contract.refreshSchedule) +
      ' |'
    )
  })

  panel.appendChild(renderTable(rows, docPath))

  var note = document.createElement('p')
  note.className = 'section-intro'
  note.textContent = 'Current strategy rule: the page pulls live data when it loads, and you can refresh it manually. Automatic background refresh can be added later if we need it.'
  panel.appendChild(note)

  return panel
}

function renderBacklog() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading live backlog.</p>'
  var focusedIds = getSection() === 'backlog'
    ? getSectionFocus().split(',').map(function(id) { return id.trim() }).filter(Boolean)
    : []

  Promise.all([
    fetchFoundationBacklog({ ids: focusedIds }),
    fetchActionReview().catch(function(error) {
      return { error: error.message || 'Action Review could not load.' }
    }),
  ]).then(function(results) {
    var hub = results[0]
    var actionReview = results[1]
    backlogScopeRegistry = (hub.meta && hub.meta.backlogScopes && hub.meta.backlogScopes.length)
      ? hub.meta.backlogScopes.slice()
      : fallbackBacklogScopes.slice()
    backlogViewState.ids = focusedIds
    if (focusedIds.length) {
      backlogViewState.scope = 'all'
      backlogViewState.priority = 'all'
      backlogViewState.query = ''
    }

    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = focusedIds.length ? 'Focused Backlog View' : 'Foundation Backlog'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    var scopeSummary = getActiveBacklogScopes().map(function(scope) {
      var count = (hub.backlogItems || []).filter(function(item) { return item.scope === scope.key }).length
      if (!count) return null
      return count + ' ' + getBacklogScopeShortLabel(scope.key)
    }).filter(Boolean).join(' · ')
    heroMeta.textContent = focusedIds.length
      ? focusedIds.length + ' linked cards from the page you clicked. Clear focus to see the full queue.'
      : hub.backlogItems.length + ' live cards · workflow-first queue' + (scopeSummary ? ' · ' + scopeSummary : '')
    heroInner.appendChild(heroMeta)

    hero.appendChild(heroInner)
    if (focusedIds.length) {
      var heroActions = document.createElement('div')
      heroActions.className = 'foundation-hero-actions'
      heroActions.appendChild(createActionLink('Clear Focus', '/foundation#backlog', 'print-button'))
      hero.appendChild(heroActions)
    }
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('backlog', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator tools',
      'Create and edit controls live here when you need them. The queue itself stays front and center.',
      [renderAdminTokenPanel(), renderBacklogCreatePanel(hub)],
      false
    ))

    container.appendChild(renderActionReviewPanel(actionReview))

    var researchCurationPanel = renderResearchCurationPanel(hub.researchCuration)
    if (researchCurationPanel) container.appendChild(researchCurationPanel)

    var boardPanel = document.createElement('section')
    boardPanel.className = 'panel'

    var boardHeader = document.createElement('div')
    boardHeader.className = 'panel-header'

    var boardLeft = document.createElement('div')
    var boardEyebrow = document.createElement('div')
    boardEyebrow.className = 'eyebrow'
    boardEyebrow.textContent = 'Foundation Queue'
    boardLeft.appendChild(boardEyebrow)

    var boardTitle = document.createElement('h3')
    boardTitle.textContent = 'Work queue'
    boardLeft.appendChild(boardTitle)

    var boardIntro = document.createElement('p')
    boardIntro.className = 'section-intro'
    boardIntro.textContent = focusedIds.length
      ? 'This is the exact queue for the surface you clicked. Review workflow stage first, then priority.'
      : 'Review workflow stage first, then priority.'
    boardLeft.appendChild(boardIntro)

    boardHeader.appendChild(boardLeft)
    boardPanel.appendChild(boardHeader)

    var controls = document.createElement('div')
    controls.className = 'operations-toolbar'

    var searchField = document.createElement('div')
    searchField.className = 'operations-search'
    var searchInput = buildInput('search', 'Search cards by ID, title, owner, source, or closeout note')
    searchInput.value = backlogViewState.query
    searchField.appendChild(searchInput)
    controls.appendChild(searchField)

    var teamGroup = document.createElement('div')
    teamGroup.className = 'operations-filter-group'
    var teamLabel = document.createElement('span')
    teamLabel.className = 'operations-filter-label'
    teamLabel.textContent = 'Scope'
    teamGroup.appendChild(teamLabel)

    var teamButtons = []
    ;([{ key: 'all', label: 'All' }]).concat(getActiveBacklogScopes().map(function(scope) {
      return { key: scope.key, label: scope.label }
    })).forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        backlogViewState.scope = option.key
        applyBacklogFilters()
      })
      teamButtons.push({ key: option.key, button: button })
      teamGroup.appendChild(button)
    })
    controls.appendChild(teamGroup)

    var priorityGroup = document.createElement('div')
    priorityGroup.className = 'operations-filter-group'
    var priorityLabel = document.createElement('span')
    priorityLabel.className = 'operations-filter-label'
    priorityLabel.textContent = 'Priority'
    priorityGroup.appendChild(priorityLabel)

    var priorityButtons = []
    ;[
      { key: 'all', label: 'All' },
      { key: 'P0', label: 'P0' },
      { key: 'P1', label: 'P1' },
      { key: 'P2', label: 'P2' },
      { key: 'P3', label: 'P3' },
    ].forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'operations-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        backlogViewState.priority = option.key
        applyBacklogFilters()
      })
      priorityButtons.push({ key: option.key, button: button })
      priorityGroup.appendChild(button)
    })
    controls.appendChild(priorityGroup)

    boardPanel.appendChild(controls)

    var backlogResults = document.createElement('p')
    backlogResults.className = 'operations-results-meta'
    boardPanel.appendChild(backlogResults)

    var boardWrap = document.createElement('div')
    boardWrap.className = 'backlog-stack-list'
    boardPanel.appendChild(boardWrap)
    container.appendChild(boardPanel)

    function syncTeamButtons() {
      teamButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', backlogViewState.scope === item.key)
      })
      priorityButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', backlogViewState.priority === item.key)
      })
    }

    function applyBacklogFilters() {
      syncTeamButtons()

      var filteredItems = filterBacklogItems(hub.backlogItems || [], backlogViewState)
      var scopeLabel = backlogViewState.scope === 'all'
        ? 'root rebuild backlog'
        : getBacklogScopeShortLabel(backlogViewState.scope) + ' items'
      var priorityLabel = backlogViewState.priority === 'all' ? 'all priorities' : backlogViewState.priority
      backlogResults.textContent = focusedIds.length
        ? 'Showing ' + filteredItems.length + ' linked cards grouped by workflow stage.'
        : 'Showing ' + filteredItems.length + ' ' + scopeLabel + ' · ' + priorityLabel + ' · grouped by workflow stage.'

      boardWrap.innerHTML = ''

      backlogWorkflowStages.forEach(function(group) {
        var groupItems = filteredItems.filter(function(item) {
          return group.lanes.indexOf(item.lane) !== -1
        })
        boardWrap.appendChild(renderBacklogWorkflowStack(group, groupItems))
      })
    }

    searchInput.addEventListener('input', function() {
      backlogViewState.query = searchInput.value
      applyBacklogFilters()
    })

    applyBacklogFilters()

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Backlog could not load. No cards were changed. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderDecisions() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading decisions.</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation Decisions'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    var lockedCount = hub.decisions.filter(function(item) { return item.status === 'locked' }).length
    var proposedCount = hub.decisions.filter(function(item) { return item.status === 'proposed' }).length
    var supersededCount = hub.decisions.filter(function(item) { return item.status === 'superseded' }).length
    heroMeta.textContent = lockedCount + ' locked · ' + proposedCount + ' proposed · ' + supersededCount + ' superseded'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'This is the Foundation decision ledger: system, rebuild, source, execution, and promoted strategy decisions. It is not yet a complete import of every old strategy-doc decision; that reconciliation belongs to the Strategy / Decision Truth System.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('decisions', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator Tools',
      'Write access, decision logging, and update utilities live here when you need them. The decision log stays readable first.',
      [renderAdminTokenPanel(), renderDecisionCreatePanel(hub)],
      false
    ))

    container.appendChild(renderDecisionReviewPanel(hub))

    var decisionAutoEmitPanel = renderDecisionAutoEmitPanel(hub.decisionAutoEmit)
    if (decisionAutoEmitPanel) container.appendChild(decisionAutoEmitPanel)

    /* decision cards */
    var decisionPanel = document.createElement('section')
    decisionPanel.className = 'panel'

    var decisionHeader = document.createElement('div')
    decisionHeader.className = 'panel-header'

    var decisionTitle = document.createElement('h3')
    decisionTitle.textContent = 'Decision Log'
    decisionHeader.appendChild(decisionTitle)

    decisionPanel.appendChild(decisionHeader)

    var decisionIntro = document.createElement('p')
    decisionIntro.className = 'section-intro'
    decisionIntro.textContent = 'One canonical decision log across strategy, system, execution, and people. Current agreements, review items, and history all live here, but they should not compete with each other.'
    decisionPanel.appendChild(decisionIntro)

    var controls = document.createElement('div')
    controls.className = 'decision-toolbar'

    var searchField = document.createElement('div')
    searchField.className = 'decision-search'
    var searchInput = buildInput('search', 'Search by ID, title, rationale, source, or superseded decision')
    searchInput.value = decisionViewState.query
    searchField.appendChild(searchInput)
    controls.appendChild(searchField)

    var viewGroup = document.createElement('div')
    viewGroup.className = 'decision-filter-group'
    var viewLabel = document.createElement('span')
    viewLabel.className = 'decision-filter-label'
    viewLabel.textContent = 'View'
    viewGroup.appendChild(viewLabel)

    var viewOptions = [
      { key: 'current', label: 'Current' },
      { key: 'all', label: 'All' },
      { key: 'proposed', label: 'Proposed' },
      { key: 'superseded', label: 'Superseded' },
    ]
    var viewButtons = []
    viewOptions.forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'decision-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        decisionViewState.view = option.key
        applyDecisionFilters()
      })
      viewButtons.push({ key: option.key, button: button })
      viewGroup.appendChild(button)
    })
    controls.appendChild(viewGroup)

    var categoryGroup = document.createElement('div')
    categoryGroup.className = 'decision-filter-group'
    var categoryLabel = document.createElement('span')
    categoryLabel.className = 'decision-filter-label'
    categoryLabel.textContent = 'Category'
    categoryGroup.appendChild(categoryLabel)

    var categoryButtons = []
    ;[{ key: 'all', label: 'All' }].concat((hub.meta && hub.meta.canonicalDecisionCategories || []).map(function(category) {
      return { key: category, label: category.charAt(0).toUpperCase() + category.slice(1) }
    })).forEach(function(option) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'decision-filter-chip'
      button.textContent = option.label
      button.addEventListener('click', function() {
        decisionViewState.category = option.key
        applyDecisionFilters()
      })
      categoryButtons.push({ key: option.key, button: button })
      categoryGroup.appendChild(button)
    })
    controls.appendChild(categoryGroup)

    decisionPanel.appendChild(controls)

    var decisionResults = document.createElement('p')
    decisionResults.className = 'decision-results-meta'
    decisionPanel.appendChild(decisionResults)

    var decisionList = document.createElement('div')
    decisionList.className = 'decision-stack-list'
    var pendingDocUpdates = hub.pendingDocUpdates || []
    var sortedDecisions = sortDecisionsNewestFirst(hub.decisions || [])
    var replacementMap = buildDecisionReplacementMap(sortedDecisions)

    function syncFilterButtons() {
      viewButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', decisionViewState.view === item.key)
      })
      categoryButtons.forEach(function(item) {
        item.button.classList.toggle('is-active', decisionViewState.category === item.key)
      })
    }

    function applyDecisionFilters() {
      syncFilterButtons()

      var filteredDecisions = filterDecisionItems(sortedDecisions, decisionViewState)
      var scopeLabel = decisionViewState.view === 'current'
        ? 'current agreements and review items'
        : decisionViewState.view === 'all'
          ? 'full decision record'
          : decisionViewState.view === 'proposed'
            ? 'review items'
            : 'superseded history'
      decisionResults.textContent = 'Showing ' + filteredDecisions.length + ' ' + scopeLabel + ' · newest first · all groups and decision records start collapsed'

      decisionList.innerHTML = ''

      if (!filteredDecisions.length) {
        var empty = document.createElement('div')
        empty.className = 'decision-empty-state'
        empty.textContent = 'No decisions match these filters yet.'
        decisionList.appendChild(empty)
        return
      }

      getDecisionStageGroups(filteredDecisions, decisionViewState.view).forEach(function(group) {
        decisionList.appendChild(renderDecisionStack(group, hub, pendingDocUpdates, replacementMap))
      })
    }

    searchInput.addEventListener('input', function() {
      decisionViewState.query = searchInput.value
      applyDecisionFilters()
    })

    applyDecisionFilters()
    decisionPanel.appendChild(decisionList)
    container.appendChild(decisionPanel)

    if (pendingDocUpdates.length) {
      var updatesPanel = document.createElement('section')
      updatesPanel.className = 'panel'

      var updatesHeader = document.createElement('div')
      updatesHeader.className = 'panel-header'

      var updatesLeft = document.createElement('div')
      var updatesEyebrow = document.createElement('div')
      updatesEyebrow.className = 'eyebrow'
      updatesEyebrow.textContent = 'Review Queue'
      updatesLeft.appendChild(updatesEyebrow)

      var updatesTitle = document.createElement('h3')
      updatesTitle.textContent = 'Pending Doc Updates'
      updatesLeft.appendChild(updatesTitle)

      var updatesIntro = document.createElement('p')
      updatesIntro.className = 'section-intro'
      updatesIntro.textContent = 'Decisions can propose doc updates here. Review, approve, and explicitly apply only the changes you trust.'
      updatesLeft.appendChild(updatesIntro)

      updatesHeader.appendChild(updatesLeft)
      updatesPanel.appendChild(updatesHeader)

      var updatesList = document.createElement('details')
      updatesList.className = 'decision-stack'

      var updatesSummary = document.createElement('summary')
      updatesSummary.className = 'decision-stack-summary decision-stack-summary-review'

      var updatesSummaryLeft = document.createElement('div')
      updatesSummaryLeft.className = 'decision-stack-summary-left'

      var updatesSummaryTitle = document.createElement('div')
      updatesSummaryTitle.className = 'decision-stack-title'
      updatesSummaryTitle.textContent = 'Doc Update Review Queue'
      updatesSummaryLeft.appendChild(updatesSummaryTitle)

      var updatesSummaryIntro = document.createElement('div')
      updatesSummaryIntro.className = 'decision-stack-intro'
      updatesSummaryIntro.textContent = 'Decision-linked doc changes waiting for explicit review and apply.'
      updatesSummaryLeft.appendChild(updatesSummaryIntro)

      updatesSummary.appendChild(updatesSummaryLeft)

      var updatesCount = document.createElement('span')
      updatesCount.className = 'decision-stack-count'
      updatesCount.textContent = pendingDocUpdates.length
      updatesSummary.appendChild(updatesCount)

      updatesList.appendChild(updatesSummary)

      var updatesBody = document.createElement('div')
      updatesBody.className = 'decision-stack-body'
      pendingDocUpdates.forEach(function(item) {
        updatesBody.appendChild(renderPendingDocUpdateCard(item))
      })
      updatesList.appendChild(updatesBody)
      updatesPanel.appendChild(updatesList)
      container.appendChild(updatesPanel)
    }

    /* parking lot */
    if (hub.parkingLot && hub.parkingLot.length) {
      var parkingPanel = document.createElement('section')
      parkingPanel.className = 'panel'

      var parkingHeader = document.createElement('div')
      parkingHeader.className = 'panel-header'

      var parkingLeft = document.createElement('div')

      var parkingEyebrow = document.createElement('div')
      parkingEyebrow.className = 'eyebrow'
      parkingEyebrow.textContent = 'Needs Verification'
      parkingLeft.appendChild(parkingEyebrow)

      var parkingTitle = document.createElement('h3')
      parkingTitle.textContent = 'Unlocked Decision Signals'
      parkingLeft.appendChild(parkingTitle)

      var parkingIntro = document.createElement('p')
      parkingIntro.className = 'section-intro'
      parkingIntro.textContent = 'Possible agreements, policy ideas, or meeting signals that are not locked enough to become live decisions yet.'
      parkingLeft.appendChild(parkingIntro)

      parkingHeader.appendChild(parkingLeft)

      parkingPanel.appendChild(parkingHeader)

      var parkingList = document.createElement('details')
      parkingList.className = 'decision-stack'

      var parkingSummary = document.createElement('summary')
      parkingSummary.className = 'decision-stack-summary decision-stack-summary-history'

      var parkingSummaryLeft = document.createElement('div')
      parkingSummaryLeft.className = 'decision-stack-summary-left'

      var parkingSummaryTitle = document.createElement('div')
      parkingSummaryTitle.className = 'decision-stack-title'
      parkingSummaryTitle.textContent = 'Needs Clarification'
      parkingSummaryLeft.appendChild(parkingSummaryTitle)

      var parkingSummaryIntro = document.createElement('div')
      parkingSummaryIntro.className = 'decision-stack-intro'
      parkingSummaryIntro.textContent = 'Signals that still need review, confirmation, or a real decision record.'
      parkingSummaryLeft.appendChild(parkingSummaryIntro)

      parkingSummary.appendChild(parkingSummaryLeft)

      var parkingCount = document.createElement('span')
      parkingCount.className = 'decision-stack-count'
      parkingCount.textContent = hub.parkingLot.length
      parkingSummary.appendChild(parkingCount)

      parkingList.appendChild(parkingSummary)

      var parkingBody = document.createElement('div')
      parkingBody.className = 'decision-stack-body'
      hub.parkingLot.forEach(function(item) {
        parkingBody.appendChild(renderCaptureItem(item))
      })
      parkingList.appendChild(parkingBody)
      parkingPanel.appendChild(parkingList)
      container.appendChild(parkingPanel)
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Decisions could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderOpenQuestions() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading open questions.</p>'

  fetchFoundationHub().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Open Questions'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    var openCount = hub.openQuestions.filter(function(item) { return item.status !== 'resolved' }).length
    var resolvedCount = hub.openQuestions.filter(function(item) { return item.status === 'resolved' }).length
    heroMeta.textContent = openCount + ' open · ' + resolvedCount + ' resolved'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Only real unresolved Foundation blockers belong here. If the work is already scoped, it belongs in Backlog. If the answer is known, close the question.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('open-questions', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderOperatorToolsDrawer(
      'Operator Tools',
      'Write access and question capture live here when you need them. The active question list stays in front.',
      [renderAdminTokenPanel(), renderQuestionCreatePanel()],
      false
    ))

    /* question cards */
    var panel = document.createElement('section')
    panel.className = 'panel'

    var header = document.createElement('div')
    header.className = 'panel-header'

    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Working List'
    left.appendChild(eyebrow)

    var title = document.createElement('h3')
    title.textContent = 'Review Queue'
    left.appendChild(title)
    header.appendChild(left)
    panel.appendChild(header)

    var list = document.createElement('div')
    list.className = 'section-list'

    getOpenQuestionGroups(hub.openQuestions).forEach(function(group) {
      list.appendChild(renderOpenQuestionStack(group))
    })
    panel.appendChild(list)
    container.appendChild(panel)

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Open Questions could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderSourceLifecycle() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading source lifecycle.</p>'

  fetchSourceLifecycle().then(function(lifecycle) {
    container.innerHTML = ''
    container.appendChild(renderSourceLifecycleHero(lifecycle))
    var summary = renderSourceLifecycleSummary(lifecycle)
    if (summary) container.appendChild(summary)
    var foundationUiComplete = renderFoundationUiCompletePanel(lifecycle.foundationUiComplete)
    if (foundationUiComplete) container.appendChild(foundationUiComplete)
    var maturityGrid = renderSourceMaturityGridPanel(lifecycle.sourceMaturityGrid)
    if (maturityGrid) container.appendChild(maturityGrid)
    var connectorMatrix = renderSourceConnectorMatrixPanel(lifecycle.sourceConnectorMatrix)
    if (connectorMatrix) container.appendChild(connectorMatrix)
    var hubRoutingMatrix = renderSourceHubRoutingMatrixPanel(lifecycle.sourceHubRoutingMatrix)
    if (hubRoutingMatrix) container.appendChild(hubRoutingMatrix)
    var extractionCoverage = renderSourceExtractionCoveragePanel(lifecycle.sourceExtractionCoverage)
    if (extractionCoverage) container.appendChild(extractionCoverage)
    var sourceCoverageCloseout = renderSourceCoverageCloseoutPanel(lifecycle.sourceCoverageCloseout)
    if (sourceCoverageCloseout) container.appendChild(sourceCoverageCloseout)
    var marketingSourceMap = renderMarketingSourceMapPanel(lifecycle.marketingSourceMap)
    if (marketingSourceMap) container.appendChild(marketingSourceMap)
    var brandStack = renderBrandStackPanel(lifecycle.brandStack)
    if (brandStack) container.appendChild(brandStack)
    var tierBehavioralCompletion = renderTierBehavioralCompletionPanel(lifecycle.tierBehavioralCompletion)
    if (tierBehavioralCompletion) container.appendChild(tierBehavioralCompletion)
    var verificationRuns = renderVerificationRunsPanel(lifecycle.verificationRuns)
    if (verificationRuns) container.appendChild(verificationRuns)
    var perUserChangelog = renderPerUserChangelogPanel(lifecycle.perUserChangelog)
    if (perUserChangelog) container.appendChild(perUserChangelog)
    var restrictedDecisionQueue = renderRestrictedDecisionQueuePanel(lifecycle.restrictedDecisionQueue)
    if (restrictedDecisionQueue) container.appendChild(restrictedDecisionQueue)
    container.appendChild(renderSourceLifecycleDefinitions(lifecycle.definitions || []))
    container.appendChild(renderSourceLifecycleLanes(lifecycle))
    container.appendChild(renderSourceLifecycleTargets(lifecycle))
    var parked = renderSourceLifecycleParked(lifecycle)
    if (parked) container.appendChild(parked)
    container.appendChild(renderSourceLifecycleScope(lifecycle))
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Source lifecycle could not load. Details: ' + error.message
    container.appendChild(msg)
  }).finally(function() {
    applySectionFocus()
  })
}

function renderSourceRegistry(section) {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading data sources...</p>'
  var focusIds = getSectionFocus().split(',').map(function(id) { return id.trim() }).filter(Boolean)
  var showOwnersGovernance = section === 'source-sheets' && focusIds.indexOf('SRC-OWNERS-001') !== -1

  fetchSourceOfTruth().then(function(data) {
    return data
  }).then(function(data) {
    container.innerHTML = ''

    var config = sourceSectionConfigs[section] || sourceSectionConfigs['source-overview']
    var sourceContracts = getSourceContractsForSection(data.sources || [], config)
    var sourceConnectors = data.connectors || []
    container.appendChild(renderSourceHero(config, sourceContracts, sourceConnectors))
    var purposePanel = renderDataSourcePurposePanel(section, config, sourceContracts, sourceConnectors, data.groupedSystems || [], data.sourceLayerStatus)
    if (purposePanel) container.appendChild(purposePanel)

    if (section === 'source-overview') {
      container.appendChild(renderOverviewStatusPanel(
        getSourceOverviewSnapshotItems(sourceContracts, sourceConnectors),
        {
          eyebrow: 'Right Now',
          title: 'What Is Actually Trusted',
          intro: 'A source can be readable before it is trusted.',
        }
      ))

      var groupedPanel = renderGroupedSourceSystemsPanel(data.groupedSystems || [], sourceContracts, sourceConnectors)
      if (groupedPanel) container.appendChild(groupedPanel)

      container.appendChild(renderFoundationShortcutPanel(
        'Open the right source view',
        'Use these links instead of scanning the whole source model every time.',
        [
          {
            title: 'Strategy inputs',
            body: 'Freedom Community, BHAG, Agent Engine, Owners, finance, FUB, and KPI are visible from the Foundation overview.',
            meta: 'Foundation overview',
            href: '/foundation#current-state',
            cta: 'Open Overview',
          },
        {
          title: 'FUB review',
          body: 'Lead-source taxonomy manager and the remaining parity work for SRC-FUB-001.',
            meta: 'Next source closeout',
            href: '/foundation#source-apis:fub-lead-source-taxonomy',
            cta: 'Open FUB Review',
          },
          {
            title: 'Connectors',
            body: 'Use this only when you need the pipes and access path view. Connector does not mean trusted source.',
            meta: 'Technical reach',
            href: '/foundation#source-connectors',
            cta: 'Open Connectors',
          },
          {
            title: 'Source lifecycle',
            body: 'See which lanes are connected, verified, extracted, reviewed, retried, or parked before approving more source work.',
            meta: 'Control layer',
            href: '/foundation#source-lifecycle',
            cta: 'Open Lifecycle',
          },
          {
            title: 'Foundation overview',
            body: 'If you want the shortest possible answer to what is ready, open, and later, start there first.',
            meta: 'Tight rebuild read',
            href: '/foundation#current-state',
            cta: 'Open Overview',
          },
        ]
      ))

      container.appendChild(renderOperatorToolsDrawer(
        'How to read this',
        'Definitions for source system, validation unit, connector layer, and trust state.',
        [renderSourceLegendPanel()],
        false
      ))
    }

    if (config.showSystems) {
      container.appendChild(renderSourceSystemsPanel(sourceContracts, {
        eyebrow: 'Live Source Layer',
        title: section === 'source-overview'
          ? 'Source systems and validation units'
          : config.title,
        intro: section === 'source-overview'
          ? 'Open each source system to see the exact tabs, ledgers, or units being validated.'
          : config.intro,
        showKindFilter: !!config.showKindFilter,
        allowedKinds: config.allowedKinds || null,
        fixedKindLabel: config.title.toLowerCase(),
        resultsLabel: 'source systems',
      }))
    }

    if (showOwnersGovernance) {
      var ownersGovernancePanel = document.createElement('section')
      ownersGovernancePanel.className = 'panel'

      var ownersGovernanceHeader = document.createElement('div')
      ownersGovernanceHeader.className = 'panel-header'

      var ownersGovernanceLeft = document.createElement('div')
      var ownersGovernanceEyebrow = document.createElement('div')
      ownersGovernanceEyebrow.className = 'eyebrow'
      ownersGovernanceEyebrow.textContent = 'Governed Dropdown Watch'
      ownersGovernanceLeft.appendChild(ownersGovernanceEyebrow)

      var ownersGovernanceTitle = document.createElement('h3')
      ownersGovernanceTitle.textContent = 'Owners lead-source list drift'
      ownersGovernanceLeft.appendChild(ownersGovernanceTitle)

      var ownersGovernanceIntro = document.createElement('p')
      ownersGovernanceIntro.className = 'section-intro'
      ownersGovernanceIntro.textContent = 'This protects the live Column N dropdown so Ops cannot keep choosing stale or retired values inside a “validated” field.'
      ownersGovernanceLeft.appendChild(ownersGovernanceIntro)

      ownersGovernanceHeader.appendChild(ownersGovernanceLeft)
      ownersGovernancePanel.appendChild(ownersGovernanceHeader)

      var ownersGovernanceBody = document.createElement('div')
      ownersGovernanceBody.innerHTML = '<p>Loading Owners dropdown drift…</p>'
      ownersGovernancePanel.appendChild(ownersGovernanceBody)
      container.appendChild(ownersGovernancePanel)

      fetchOwnersLeadSourceGovernance().then(function(governance) {
        ownersGovernanceBody.innerHTML = ''
        var panel = renderOwnersLeadSourceGovernancePanel(governance)
        if (panel) ownersGovernanceBody.appendChild(panel)
      }).catch(function(error) {
        ownersGovernanceBody.innerHTML = ''
        var message = document.createElement('p')
        message.textContent = 'Failed to load Owners dropdown drift: ' + error.message
        ownersGovernanceBody.appendChild(message)
      })
    }

    if (section === 'source-apis') {
      var kpiHealthPanel = renderKpiSupabaseHealthPanel(data.kpiHealth)
      if (kpiHealthPanel) container.appendChild(kpiHealthPanel)
      container.appendChild(renderFubLeadSourceManagerPanel())
    }

    if (config.showSystems && config.showConnectors) {
      var divider = document.createElement('div')
      divider.className = 'source-layer-divider'
      divider.textContent = 'Connector layer starts below.'
      container.appendChild(divider)
    }

    if (config.showConnectors) {
      container.appendChild(renderSourceConnectorsPanel(sourceConnectors, {
        eyebrow: 'Connector Layer',
        title: 'Connections and access paths',
        intro: 'These are access paths. A connector alone does not make a source trusted.',
      }))
    }

    if (config.showOperatorNotes) {
      container.appendChild(renderSourceOperatorNotesDrawer(data))
    }

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Data Sources could not load. Details: ' + error.message
    container.appendChild(msg)
  }).finally(function() {
    applySectionFocus()
  })
}
