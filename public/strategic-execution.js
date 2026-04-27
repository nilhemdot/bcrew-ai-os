;(function() {
  var manifestPath = 'docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md'
  var state = {
    data: null,
    error: null,
    busyRouteId: null,
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
    var hero = document.createElement('section')
    hero.className = 'hero strategy-v2-hero'
    hero.id = 'overview'
    appendText(hero, 'div', 'Strategy Hub v2', 'eyebrow')
    appendText(hero, 'h1', 'Source-to-gap command')
    appendText(
      hero,
      'p',
      'Deterministic goals, operating truth, and approval-gated Action Router records are live. Advisor chat and old recommendation surfaces remain offline.',
    )

    var strip = document.createElement('div')
    strip.className = 'strategy-v2-status-strip'
    strip.appendChild(makePill('Advisor offline', 'neutral'))
    strip.appendChild(makePill(
      data.sourceTruthStatus === 'degraded' ? 'Source fallback active' : 'Source truth live',
      data.sourceTruthStatus === 'degraded' ? 'watch' : 'good'
    ))
    strip.appendChild(makePill(String(actionRouter.pendingRoutes || 0) + ' pending routes', actionRouter.pendingRoutes ? 'watch' : 'good'))
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
    appendText(copy, 'p', emptyText(goalTruth.rule, 'Goal truth is sourced from approved contracts.'), 'strategy-v2-muted')
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
      appendText(card, 'p', emptyText(group.caveat || group.rule, 'No caveat recorded.'), 'strategy-v2-muted')
      renderFactList(card, group.facts, 6)
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

  function routeTitle(route) {
    return emptyText(route.proposedPayload && route.proposedPayload.title, route.routeType + ' route')
  }

  function routeSummary(route) {
    var payload = route.proposedPayload || {}
    return emptyText(payload.summary || payload.reason || route.routingReason, 'No route summary recorded.')
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
    pills.appendChild(makePill(route.destinationTable, 'neutral'))
    top.appendChild(pills)
    card.appendChild(top)

    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-meta'
    appendText(meta, 'span', 'Owner: ' + emptyText(route.owner, 'missing'))
    appendText(meta, 'span', 'Tier: ' + emptyText(route.minTier, '1'))
    appendText(meta, 'span', 'Sources: ' + count(route.sourceIds))
    appendText(meta, 'span', 'Facts: ' + count(route.factRefs))
    appendText(meta, 'span', 'Atoms: ' + count(route.evidenceRefs))
    appendText(meta, 'span', 'Chunks: ' + count(route.evidenceChunkRefs))
    card.appendChild(meta)

    var provenance = document.createElement('details')
    provenance.className = 'strategy-v2-provenance'
    appendText(provenance, 'summary', 'Provenance refs')
    appendText(provenance, 'p', 'Synthesized item: ' + route.synthesizedItemId)
    appendText(provenance, 'p', 'Fact refs: ' + (route.factRefs || []).join(', '))
    appendText(provenance, 'p', 'Evidence refs: ' + (route.evidenceRefs || []).join(', '))
    appendText(provenance, 'p', 'Chunk refs: ' + (route.evidenceChunkRefs || []).join(', '))
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
      appendText(actions, 'span', 'Applied to ' + route.destinationTable + ': ' + emptyText(route.destinationRecordId, 'record pending'), 'strategy-v2-applied-note')
    } else {
      appendText(actions, 'span', 'Route is ' + route.approvalStatus, 'strategy-v2-applied-note')
    }
    card.appendChild(actions)
    return card
  }

  function renderRouteReview(container, data) {
    var actionRouter = data.actionRouter || {}
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'route-review'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Action Router', 'eyebrow')
    appendText(copy, 'h3', 'Review and promote routes')
    appendText(copy, 'p', 'Every route preserves synthesized item, fact, atom, and retrieval chunk provenance before it becomes an operating ledger record.', 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', String(actionRouter.totalRoutes || 0) + ' total routes', 'doc-meta')
    panel.appendChild(header)

    var summary = document.createElement('div')
    summary.className = 'strategy-v2-route-summary'
    summary.appendChild(makePill(String(actionRouter.pendingRoutes || 0) + ' pending', actionRouter.pendingRoutes ? 'watch' : 'good'))
    summary.appendChild(makePill(String(actionRouter.approvedRoutes || 0) + ' approved', actionRouter.approvedRoutes ? 'watch' : 'neutral'))
    summary.appendChild(makePill(String(actionRouter.appliedRoutes || 0) + ' applied', actionRouter.appliedRoutes ? 'good' : 'neutral'))
    summary.appendChild(makePill(String(actionRouter.appliedRoutesWithDestinationRecord || 0) + ' destination records', actionRouter.appliedRoutesWithDestinationRecord ? 'good' : 'neutral'))
    panel.appendChild(summary)

    var routes = (actionRouter.recentRoutes || []).slice().sort(function(a, b) {
      return routeSortValue(a) - routeSortValue(b) || String(b.routedAt || '').localeCompare(String(a.routedAt || ''))
    })
    var stack = document.createElement('div')
    stack.className = 'strategy-v2-route-stack'
    if (!routes.length) {
      appendText(stack, 'p', 'No Action Router records are waiting for review.', 'strategy-v2-muted')
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
    renderSourceToGap(container, state.data)
    renderOperatingTruth(container, state.data)
    renderRouteReview(container, state.data)
    renderTrustGate(container)
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
    var navItems = Array.prototype.slice.call(document.querySelectorAll('[data-section]'))
    navItems.forEach(function(item) {
      item.addEventListener('click', function() {
        navItems.forEach(function(other) { other.classList.remove('found-nav-active') })
        item.classList.add('found-nav-active')
        var breadcrumb = document.getElementById('found-breadcrumb-page')
        if (breadcrumb) breadcrumb.textContent = item.textContent
      })
    })
    var first = document.querySelector('[data-section="overview"]')
    if (first) first.classList.add('found-nav-active')

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
