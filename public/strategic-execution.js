;(function() {
  var manifestPath = 'docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md'
  var state = {
    data: null,
    error: null,
    busyRouteId: null,
    section: 'overview',
  }

  function appendText(parent, tagName, text, className) {
    var el = document.createElement(tagName)
    if (className) el.className = className
    el.textContent = text == null ? '' : String(text)
    parent.appendChild(el)
    return el
  }

  function appendLink(parent, href, text, className) {
    var link = document.createElement('a')
    link.href = href
    link.textContent = text
    if (className) link.className = className
    parent.appendChild(link)
    return link
  }

  function emptyText(value, fallback) {
    var normalized = String(value || '').trim()
    return normalized || fallback
  }

  function formatDateTime(value) {
    if (!value) return 'No timestamp'
    var parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return String(value)
    return parsed.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function count(value) {
    return Array.isArray(value) ? value.length : 0
  }

  function shortenText(value, limit) {
    var normalized = String(value || '').replace(/\s+/g, ' ').trim()
    if (normalized.length <= limit) return normalized
    return normalized.slice(0, limit - 3).trim() + '...'
  }

  function sectionFromHash() {
    var hash = window.location.hash.replace('#', '')
    return ['overview', 'source-to-gap', 'route-review'].indexOf(hash) === -1 ? 'overview' : hash
  }

  function statusTone(value) {
    var normalized = String(value || '').toLowerCase()
    if (['ahead', 'signed off', 'succeeded', 'applied'].some(function(term) { return normalized.includes(term) })) return 'good'
    if (['behind', 'pending', 'approved', 'watch'].some(function(term) { return normalized.includes(term) })) return 'watch'
    if (['failed', 'rejected', 'blocked'].some(function(term) { return normalized.includes(term) })) return 'bad'
    return 'neutral'
  }

  function makePill(text, tone) {
    var pill = document.createElement('span')
    pill.className = 'strategy-v2-pill strategy-v2-pill-' + (tone || statusTone(text))
    pill.textContent = text
    return pill
  }

  function getAdminHeaders(extraHeaders) {
    var headers = Object.assign({}, extraHeaders || {})
    try {
      var token = window.localStorage && (
        window.localStorage.getItem('BCREW_ADMIN_TOKEN') ||
        window.localStorage.getItem('bcrew.foundation.adminToken')
      )
      if (token) headers['X-Admin-Token'] = token
    } catch {
      // Let the server return the visible authorization error.
    }
    return headers
  }

  async function fetchJson(path, options) {
    var requestOptions = Object.assign({ cache: 'no-store' }, options || {})
    requestOptions.headers = getAdminHeaders(requestOptions.headers)
    var response = await fetch(path, requestOptions)
    var payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    if (!response.ok) {
      throw new Error(payload && payload.message ? payload.message : response.statusText)
    }
    return payload
  }

  function renderLoading(container) {
    container.innerHTML = ''
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    appendText(panel, 'div', 'Loading', 'eyebrow')
    appendText(panel, 'h2', 'Building source-to-gap command view')
    appendText(panel, 'p', 'Loading source truth, retrieval eval status, and pending Action Router records.', 'strategy-v2-muted')
    container.appendChild(panel)
  }

  function renderError(container, error) {
    container.innerHTML = ''
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel strategy-v2-error'
    appendText(panel, 'div', 'Strategy Hub v2', 'eyebrow')
    appendText(panel, 'h2', 'Source-to-gap snapshot failed')
    appendText(panel, 'p', error.message || 'Unknown error', 'strategy-v2-muted')
    var button = document.createElement('button')
    button.className = 'btn btn-primary'
    button.type = 'button'
    button.textContent = 'Retry'
    button.addEventListener('click', load)
    panel.appendChild(button)
    container.appendChild(panel)
  }

  function renderHero(container, data) {
    var actionRouter = data.actionRouter || {}
    var evalRun = data.retrievalEval || {}
    var businessRoutes = strategyVisibleRoutes(actionRouter.recentRoutes || [])
    var pendingBusinessRoutes = businessRoutes.filter(function(route) { return route.approvalStatus === 'pending' }).length
    var heroCopy = {
      overview: {
        label: 'Strategy Hub v2',
        title: 'Strategy command',
        body: 'Live goals, operating source status, and the business review queue in one place.',
      },
      'source-to-gap': {
        label: 'Source-To-Gap',
        title: 'Goal and operating truth',
        body: 'Current target, actual, and gap by source-backed business measure.',
      },
      'route-review': {
        label: 'Review Queue',
        title: 'Business follow-ups',
        body: 'Source-backed items waiting for a human decision before they become work, questions, or ignored/snoozed items.',
      },
    }[state.section] || {}
    var hero = document.createElement('section')
    hero.className = 'hero strategy-v2-hero'
    hero.id = 'overview'
    appendText(hero, 'div', heroCopy.label || 'Strategy Hub v2', 'eyebrow')
    appendText(hero, 'h1', heroCopy.title || 'Strategy command')
    appendText(hero, 'p', heroCopy.body || 'Live source-backed strategy view.')

    var strip = document.createElement('div')
    strip.className = 'strategy-v2-status-strip'
    strip.appendChild(makePill('Advisor offline', 'neutral'))
    strip.appendChild(makePill(
      data.sourceTruthStatus === 'degraded' ? 'Source fallback active' : 'Source truth live',
      data.sourceTruthStatus === 'degraded' ? 'watch' : 'good'
    ))
    strip.appendChild(makePill(String(pendingBusinessRoutes) + ' pending reviews', pendingBusinessRoutes ? 'watch' : 'good'))
    strip.appendChild(makePill(String(actionRouter.appliedRoutes || 0) + ' applied routes', actionRouter.appliedRoutes ? 'good' : 'neutral'))
    strip.appendChild(makePill(
      'Eval ' + emptyText(evalRun.status, 'unknown'),
      evalRun.status === 'succeeded' ? 'good' : 'watch'
    ))
    hero.appendChild(strip)
    if (data.sourceTruthStatus === 'degraded' && data.fallback) {
      appendText(
        hero,
        'p',
        'Using last-known-good source snapshot from ' + formatDateTime(data.fallback.lastKnownGoodAt) + '. Reason: ' + data.fallback.reason,
        'strategy-v2-fallback-note'
      )
    }
    container.appendChild(hero)
  }

  function displayFactsForGoalGroup(group) {
    var facts = (group.facts || []).map(function(fact) {
      return Object.assign({}, fact)
    })
    if (group.key === 'team_volume') {
      var longTermTarget = facts.find(function(fact) { return fact.label === '2035' }) ||
        facts.find(function(fact) { return fact.label === '2033' })
      var filtered = facts.filter(function(fact) {
        return fact.label !== '2033' && fact.label !== '2035'
      })
      if (longTermTarget) {
        filtered.push(Object.assign({}, longTermTarget, { label: 'Long-Term Target' }))
      }
      return filtered
    }
    if (group.key === 'agent_engine_capacity') {
      return facts.map(function(fact) {
        if (fact.label === 'Required Start-of-Year Agents') {
          return Object.assign({}, fact, { label: 'Required Agents Next Year' })
        }
        return fact
      })
    }
    return facts
  }

  function renderFactList(parent, facts, limit) {
    var list = document.createElement('div')
    list.className = 'strategy-v2-fact-list'
    ;(facts || []).slice(0, limit || 6).forEach(function(fact) {
      var row = document.createElement('div')
      row.className = 'strategy-v2-fact-row'
      appendText(row, 'span', emptyText(fact.label, fact.sourceId || 'Fact'), 'strategy-v2-fact-label')
      appendText(row, 'strong', emptyText(fact.value, 'Recorded'), 'strategy-v2-fact-value')
      appendText(row, 'small', emptyText(fact.sourceId, 'source missing'), 'strategy-v2-source-id')
      list.appendChild(row)
    })
    parent.appendChild(list)
  }

  function renderSourceToGap(container, data) {
    var goalTruth = data.goalTruth || {}
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'source-to-gap'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Source-To-Gap', 'eyebrow')
    appendText(copy, 'h3', 'Goal truth')
    appendText(copy, 'p', 'Current targets, actuals, and gaps pulled from the approved strategy sources.', 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', formatDateTime(goalTruth.generatedAt), 'doc-meta')
    panel.appendChild(header)

    var grid = document.createElement('div')
    grid.className = 'strategy-v2-goal-grid'
    ;(goalTruth.groups || []).forEach(function(group) {
      var card = document.createElement('article')
      card.className = 'strategy-v2-card'
      var top = document.createElement('div')
      top.className = 'strategy-v2-card-top'
      appendText(top, 'h4', group.title)
      top.appendChild(makePill(emptyText(group.statusLabel, group.status || 'status'), statusTone(group.status)))
      card.appendChild(top)
      renderFactList(card, displayFactsForGoalGroup(group), 6)
      grid.appendChild(card)
    })
    panel.appendChild(grid)
    container.appendChild(panel)
  }

  function renderOperatingTruth(container, data) {
    var operatingTruth = data.operatingTruth || {}
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'operating-truth'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Operating Truth', 'eyebrow')
    appendText(copy, 'h3', 'Signed source cards')
    appendText(copy, 'p', emptyText(operatingTruth.rule, 'Operating truth is loaded from source contracts.'), 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', formatDateTime(operatingTruth.generatedAt), 'doc-meta')
    panel.appendChild(header)

    var grid = document.createElement('div')
    grid.className = 'strategy-v2-source-grid'
    ;(operatingTruth.sourceCards || []).forEach(function(cardData) {
      var card = document.createElement('article')
      card.className = 'strategy-v2-card'
      var top = document.createElement('div')
      top.className = 'strategy-v2-card-top'
      appendText(top, 'h4', cardData.sourceId)
      top.appendChild(makePill(emptyText(cardData.validation, cardData.status || 'source'), statusTone(cardData.validation || cardData.status)))
      card.appendChild(top)
      appendText(card, 'strong', emptyText(cardData.title, 'Untitled source'), 'strategy-v2-card-title')
      appendText(card, 'p', emptyText(cardData.currentRead || cardData.guardrail, 'No current read recorded.'), 'strategy-v2-muted')
      renderFactList(card, cardData.facts, 5)
      grid.appendChild(card)
    })
    panel.appendChild(grid)
    container.appendChild(panel)
  }

  function renderOverview(container, data) {
    var goalTruth = data.goalTruth || {}
    var operatingTruth = data.operatingTruth || {}
    var actionRouter = data.actionRouter || {}
    var businessRoutes = strategyVisibleRoutes(actionRouter.recentRoutes || [])

    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'overview-summary'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Overview', 'eyebrow')
    appendText(copy, 'h3', 'Current read')
    appendText(copy, 'p', 'A short business view. Details live under Source-to-Gap and Review Queue.', 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', formatDateTime(data.generatedAt), 'doc-meta')
    panel.appendChild(header)

    var grid = document.createElement('div')
    grid.className = 'strategy-v2-overview-grid'

    var paceCard = document.createElement('article')
    paceCard.className = 'strategy-v2-card'
    appendText(paceCard, 'h4', 'Business Pace')
    ;(goalTruth.groups || []).forEach(function(group) {
      var row = document.createElement('div')
      row.className = 'strategy-v2-overview-row'
      appendText(row, 'span', group.title)
      row.appendChild(makePill(emptyText(group.statusLabel, group.status || 'status'), statusTone(group.status)))
      paceCard.appendChild(row)
    })
    grid.appendChild(paceCard)

    var sourceCard = document.createElement('article')
    sourceCard.className = 'strategy-v2-card'
    appendText(sourceCard, 'h4', 'Operating Sources')
    ;(operatingTruth.sourceCards || []).forEach(function(source) {
      var row = document.createElement('div')
      row.className = 'strategy-v2-overview-row'
      appendText(row, 'span', source.sourceId)
      row.appendChild(makePill(emptyText(source.validation, source.status || 'source'), statusTone(source.validation || source.status)))
      sourceCard.appendChild(row)
    })
    grid.appendChild(sourceCard)

    var queueCard = document.createElement('article')
    queueCard.className = 'strategy-v2-card'
    appendText(queueCard, 'h4', 'Review Queue')
    appendText(queueCard, 'p', String(businessRoutes.length) + ' business-facing items shown from ' + String(actionRouter.totalRoutes || 0) + ' total routed records.', 'strategy-v2-muted')
    appendText(queueCard, 'p', String(actionRouter.pendingRoutes || 0) + ' pending / ' + String(actionRouter.appliedRoutes || 0) + ' applied.', 'strategy-v2-muted')
    grid.appendChild(queueCard)

    panel.appendChild(grid)
    container.appendChild(panel)
  }

  function routeTitle(route) {
    return emptyText(route.proposedPayload && route.proposedPayload.title, route.routeType + ' route')
  }

  function routeSummary(route) {
    var payload = route.proposedPayload || {}
    return shortenText(emptyText(payload.summary || payload.reason || route.routingReason, 'No route summary recorded.'), 360)
  }

  function destinationLabel(route) {
    var table = route.destinationTable || ''
    if (table === 'backlog_items') return 'Work item'
    if (table === 'decisions') return 'Decision'
    if (table === 'open_questions') return 'Question'
    if (table === 'intelligence_synthesized_items') return route.routeType === 'snooze' ? 'Snooze' : 'Ignore'
    return table || 'Record'
  }

  function strategyVisibleRoutes(routes) {
    return (routes || []).filter(function(route) {
      var owner = String(route.owner || '').toLowerCase()
      var text = [
        routeTitle(route),
        routeSummary(route),
        route.routeType,
        route.destinationTable,
      ].join(' ').toLowerCase()
      if (['marketing', 'sales leadership', 'finance'].indexOf(owner) !== -1) return true
      if (text.indexOf('marketing/source map') !== -1) return true
      if (/\b(q2|strategy|source map|agent|recruit|production|lead|listing|creative|finance|cash|pattison|fub|kpi|owners)\b/.test(text)) {
        return !/\b(sql server|database kpi|repository access|foundation-plus-hubs architecture)\b/.test(text)
      }
      return false
    })
  }

  function routeSortValue(route) {
    var order = { pending: 0, approved: 1, applied: 2, rejected: 3, cancelled: 4 }
    return order[route.approvalStatus] == null ? 5 : order[route.approvalStatus]
  }

  function actionButton(route, action, label, tone) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'strategy-v2-action-btn strategy-v2-action-' + (tone || 'neutral')
    button.textContent = state.busyRouteId === route.routeId ? 'Working...' : label
    button.disabled = Boolean(state.busyRouteId)
    button.addEventListener('click', function() {
      reviewRoute(route.routeId, action)
    })
    return button
  }

  function renderRouteCard(route) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-route-card'
    card.id = 'route-' + route.routeId

    var top = document.createElement('div')
    top.className = 'strategy-v2-route-top'
    var copy = document.createElement('div')
    appendText(copy, 'h4', routeTitle(route))
    appendText(copy, 'p', routeSummary(route), 'strategy-v2-muted')
    top.appendChild(copy)
    var pills = document.createElement('div')
    pills.className = 'strategy-v2-route-pills'
    pills.appendChild(makePill(route.approvalStatus, statusTone(route.approvalStatus)))
    pills.appendChild(makePill(destinationLabel(route), 'neutral'))
    top.appendChild(pills)
    card.appendChild(top)

    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-meta'
    appendText(meta, 'span', 'Owner: ' + emptyText(route.owner, 'missing'))
    appendText(meta, 'span', 'Type: ' + destinationLabel(route))
    appendText(meta, 'span', 'Sources: ' + count(route.sourceIds))
    card.appendChild(meta)

    var provenance = document.createElement('details')
    provenance.className = 'strategy-v2-provenance'
    appendText(provenance, 'summary', 'Source proof')
    appendText(provenance, 'p', 'Synthesized item: ' + route.synthesizedItemId)
    appendText(provenance, 'p', 'Facts: ' + (route.factRefs || []).join(', '))
    appendText(provenance, 'p', 'Atoms: ' + (route.evidenceRefs || []).join(', '))
    appendText(provenance, 'p', 'Chunks: ' + (route.evidenceChunkRefs || []).join(', '))
    card.appendChild(provenance)

    var actions = document.createElement('div')
    actions.className = 'strategy-v2-route-actions'
    if (route.approvalStatus === 'pending') {
      actions.appendChild(actionButton(route, 'approve_apply', 'Approve and apply', 'primary'))
      actions.appendChild(actionButton(route, 'needs_owner', 'Needs owner', 'neutral'))
      actions.appendChild(actionButton(route, 'snooze', 'Snooze', 'neutral'))
      actions.appendChild(actionButton(route, 'ignore', 'Ignore', 'neutral'))
      actions.appendChild(actionButton(route, 'reject', 'Reject', 'danger'))
    } else if (route.approvalStatus === 'approved') {
      actions.appendChild(actionButton(route, 'approve_apply', 'Apply approved route', 'primary'))
      actions.appendChild(actionButton(route, 'reject', 'Reject', 'danger'))
    } else if (route.approvalStatus === 'applied') {
      appendText(actions, 'span', 'Applied to ' + destinationLabel(route) + ': ' + emptyText(route.destinationRecordId, 'record pending'), 'strategy-v2-applied-note')
    } else {
      appendText(actions, 'span', 'Route is ' + route.approvalStatus, 'strategy-v2-applied-note')
    }
    card.appendChild(actions)
    return card
  }

  function renderRouteReview(container, data) {
    var actionRouter = data.actionRouter || {}
    var routes = strategyVisibleRoutes(actionRouter.recentRoutes || []).slice().sort(function(a, b) {
      return routeSortValue(a) - routeSortValue(b) || String(b.routedAt || '').localeCompare(String(a.routedAt || ''))
    })
    var pendingRoutes = routes.filter(function(route) { return route.approvalStatus === 'pending' }).length
    var approvedRoutes = routes.filter(function(route) { return route.approvalStatus === 'approved' }).length
    var appliedRoutes = routes.filter(function(route) { return route.approvalStatus === 'applied' }).length
    var appliedWithDestination = routes.filter(function(route) {
      return route.approvalStatus === 'applied' && route.destinationRecordId
    }).length
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'route-review'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Review Queue', 'eyebrow')
    appendText(copy, 'h3', 'Business follow-ups')
    appendText(copy, 'p', 'Source-backed follow-ups waiting for a human call. Foundation maintenance routes are hidden from this Strategy view.', 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', String(routes.length) + ' shown / ' + String(actionRouter.totalRoutes || 0) + ' total routed records', 'doc-meta')
    panel.appendChild(header)

    var summary = document.createElement('div')
    summary.className = 'strategy-v2-route-summary'
    summary.appendChild(makePill(String(pendingRoutes) + ' pending', pendingRoutes ? 'watch' : 'good'))
    summary.appendChild(makePill(String(approvedRoutes) + ' approved', approvedRoutes ? 'watch' : 'neutral'))
    summary.appendChild(makePill(String(appliedRoutes) + ' applied', appliedRoutes ? 'good' : 'neutral'))
    summary.appendChild(makePill(String(appliedWithDestination) + ' destination records', appliedWithDestination ? 'good' : 'neutral'))
    panel.appendChild(summary)

    var stack = document.createElement('div')
    stack.className = 'strategy-v2-route-stack'
    if (!routes.length) {
      appendText(stack, 'p', 'No business-facing routed records are waiting for review.', 'strategy-v2-muted')
    } else {
      routes.forEach(function(route) {
        stack.appendChild(renderRouteCard(route))
      })
    }
    panel.appendChild(stack)
    container.appendChild(panel)
  }

  function renderTrustGate(container) {
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'trust-gate'
    appendText(panel, 'div', 'Trust Gate', 'eyebrow')
    appendText(panel, 'h3', 'Advisor remains blocked')
    appendText(panel, 'p', 'Strategy Hub v2 can only render source-to-gap snapshots and Action Router review records until the next accepted hub slice changes that gate.', 'strategy-v2-muted')
    appendLink(panel, '/doc?path=' + encodeURIComponent(manifestPath), 'Open source-to-gap manifest', 'section-support-link')
    container.appendChild(panel)
  }

  function renderApp() {
    var container = document.getElementById('strategic-execution-content')
    if (!container) return
    if (state.error) {
      renderError(container, state.error)
      return
    }
    if (!state.data) {
      renderLoading(container)
      return
    }
    container.innerHTML = ''
    renderHero(container, state.data)
    if (state.section === 'source-to-gap') {
      renderSourceToGap(container, state.data)
      renderOperatingTruth(container, state.data)
    } else if (state.section === 'route-review') {
      renderRouteReview(container, state.data)
      renderTrustGate(container)
    } else {
      renderOverview(container, state.data)
    }
  }

  async function load() {
    state.error = null
    state.busyRouteId = null
    renderApp()
    try {
      state.data = await fetchJson('/api/strategic-execution/v2')
    } catch (error) {
      state.error = error
    }
    renderApp()
  }

  async function reviewRoute(routeId, action) {
    var actionLabels = {
      approve_apply: 'approve and apply this route into its destination ledger',
      reject: 'reject this route and remove the source item from future proposal refreshes',
      needs_owner: 'route this item to the needs-owner question queue',
      ignore: 'mark this synthesized item ignored',
      snooze: 'mark this synthesized item snoozed',
    }
    var confirmed = window.confirm('Confirm: ' + (actionLabels[action] || action) + '?')
    if (!confirmed) return
    var note = window.prompt('Optional review note', '')
    if (note === null) return
    state.busyRouteId = routeId
    renderApp()
    try {
      var response = await fetchJson('/api/strategic-execution/action-routes/' + encodeURIComponent(routeId) + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action, note: note }),
      })
      if (state.data) state.data.actionRouter = response.actionRouter
      state.error = null
    } catch (error) {
      state.error = error
    }
    state.busyRouteId = null
    renderApp()
  }

  function initNav() {
    state.section = sectionFromHash()
    var navItems = Array.prototype.slice.call(document.querySelectorAll('[data-section]'))
    function updateActiveNav() {
      navItems.forEach(function(other) {
        other.classList.toggle('found-nav-active', other.getAttribute('data-section') === state.section)
      })
      var active = document.querySelector('[data-section="' + state.section + '"]')
      var breadcrumb = document.getElementById('found-breadcrumb-page')
      if (breadcrumb && active) breadcrumb.textContent = active.textContent
    }
    navItems.forEach(function(item) {
      item.addEventListener('click', function() {
        state.section = item.getAttribute('data-section') || 'overview'
        updateActiveNav()
        renderApp()
      })
    })
    window.addEventListener('hashchange', function() {
      state.section = sectionFromHash()
      updateActiveNav()
      renderApp()
    })
    updateActiveNav()

    var toggleBtn = document.getElementById('found-mobile-toggle')
    var nav = document.getElementById('found-nav')
    if (toggleBtn && nav) {
      toggleBtn.addEventListener('click', function() {
        nav.classList.toggle('found-nav-open')
      })
    }
  }

  initNav()
  load()
})()
