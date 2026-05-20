;(function() {
  var manifestPath = 'docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md'
  var state = {
    data: null,
    error: null,
    busyRouteId: null,
    busyQuarterSave: false,
    quarterMessage: '',
    section: 'overview',
    routeControls: {},
  }
  var sectionDefinitions = {
    overview: {
      label: 'Strategy Hub v2',
      title: 'Strategy Command',
      body: 'Current pace, capacity pressure, cash posture, and pointers to the planning and meeting packets.',
    },
    planning: {
      label: 'Planning Workflow',
      title: 'Quarterly Planning',
      body: 'Source-backed priority, carry-forward, stop, and missing-data queues for the next planning conversation.',
    },
    meeting: {
      label: 'Meeting Packet',
      title: 'Ownership Meeting',
      body: 'Agenda, pressure readout, source proof, and Strategy review items for the next ownership discussion.',
    },
    'source-to-gap': {
      label: 'Source Truth',
      title: 'Goal And Operating Truth',
      body: 'Current target, actual, and gap by source-backed business measure.',
    },
    'business-atoms': {
      label: 'Business Atoms',
      title: 'Business Atom Board',
      body: 'Small source-backed business signals for weekly, monthly, quarterly, and annual planning.',
    },
    governance: {
      label: 'Governance',
      title: 'Governance Accountability',
      body: 'Room readiness, meeting sequence, structured outputs, drift queue, and follow-through guardrails.',
    },
    'route-review': {
      label: 'Review Queue',
      title: 'Strategic Review',
      body: 'Only strategy prep, source-map gaps, goal gaps, and pillar decisions belong here.',
    },
  }
  var sectionOrder = ['overview', 'planning', 'meeting', 'governance', 'source-to-gap', 'business-atoms', 'route-review']

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
    return sectionOrder.indexOf(hash) === -1 ? 'overview' : hash
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
    appendText(panel, 'p', 'Loading source truth, retrieval eval status, and Strategy review records.', 'strategy-v2-muted')
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
    var businessAtoms = data.businessAtoms || {}
    var goalTruth = data.goalTruth || {}
    var teamGroup = goalGroupByKey(goalTruth, 'team_volume')
    var strategyRoutes = strategyVisibleRoutes(actionRouter.recentRoutes || [])
    var pendingStrategyRoutes = strategyRoutes.filter(function(route) { return route.approvalStatus === 'pending' }).length
    var heroCopy = sectionDefinitions[state.section] || {}
    var hero = document.createElement('section')
    hero.className = 'hero strategy-v2-hero'
    hero.id = 'overview'

    var copy = document.createElement('div')
    copy.className = 'strategy-v2-hero-copy'
    appendText(copy, 'div', heroCopy.label || 'Strategy Hub v2', 'eyebrow')
    appendText(copy, 'h1', heroCopy.title || 'Strategy command')
    appendText(copy, 'p', heroCopy.body || 'Live source-backed strategy view.')
    hero.appendChild(copy)

    var status = document.createElement('div')
    status.className = 'strategy-v2-hero-status'

    var strip = document.createElement('div')
    strip.className = 'strategy-v2-status-strip'
    strip.appendChild(makePill(
      data.sourceTruthStatus === 'degraded' ? 'Source fallback active' : 'Source truth live',
      data.sourceTruthStatus === 'degraded' ? 'watch' : 'good'
    ))
    if (state.section === 'route-review') {
      strip.appendChild(makePill(String(pendingStrategyRoutes) + ' strategy reviews', pendingStrategyRoutes ? 'watch' : 'good'))
    } else if (state.section === 'business-atoms') {
      strip.appendChild(makePill(String(businessAtoms.summary && businessAtoms.summary.currentAtoms || 0) + ' current atoms', businessAtoms.summary && businessAtoms.summary.currentAtoms ? 'good' : 'watch'))
      strip.appendChild(makePill(String(businessAtoms.summary && businessAtoms.summary.totalHits || 0) + ' hits', businessAtoms.summary && businessAtoms.summary.totalHits ? 'good' : 'neutral'))
    } else if (state.section === 'governance') {
      var governance = data.governanceAccountability || {}
      strip.appendChild(makePill(emptyText(governance.status, 'governance missing'), statusTone(governance.status)))
      strip.appendChild(makePill(String(governance.summary && governance.summary.driftItemCount || 0) + ' drift items', governance.summary && governance.summary.driftItemCount ? 'watch' : 'good'))
      strip.appendChild(makePill(String(governance.summary && governance.summary.structuredOutputCount || 0) + ' outputs', governance.summary && governance.summary.structuredOutputCount ? 'good' : 'watch'))
    } else if (state.section === 'planning') {
      var workflow = data.planningWorkflow || {}
      strip.appendChild(makePill(emptyText(workflow.status, 'planning missing'), statusTone(workflow.status)))
      strip.appendChild(makePill(String(count(workflow.priorityCandidates)) + ' priorities', count(workflow.priorityCandidates) ? 'watch' : 'neutral'))
      strip.appendChild(makePill(String(count(workflow.missingDataGaps)) + ' data gaps', count(workflow.missingDataGaps) ? 'watch' : 'good'))
    } else {
      strip.appendChild(makePill(emptyText(teamGroup && teamGroup.statusLabel, 'Team pace missing'), statusTone(teamGroup && teamGroup.statusLabel)))
      strip.appendChild(makePill(String(pendingStrategyRoutes) + ' strategy reviews', pendingStrategyRoutes ? 'watch' : 'good'))
      if (state.section === 'meeting') {
        strip.appendChild(makePill(emptyText(data.meetingReady && data.meetingReady.status, 'meeting packet'), statusTone(data.meetingReady && data.meetingReady.status)))
      }
    }
    status.appendChild(strip)
    if (data.sourceTruthStatus === 'degraded' && data.fallback) {
      appendText(
        status,
        'p',
        'Using last-known-good source snapshot from ' + formatDateTime(data.fallback.lastKnownGoodAt) + '. ' + fallbackSummary(data.fallback.reason),
        'strategy-v2-fallback-note'
      )
    }
    hero.appendChild(status)
    container.appendChild(hero)
  }

  function goalGroupByKey(goalTruth, key) {
    return (goalTruth && goalTruth.groups || []).find(function(group) {
      return group.key === key
    }) || null
  }

  function sourceCardById(operatingTruth, sourceId) {
    return (operatingTruth && operatingTruth.sourceCards || []).find(function(card) {
      return card.sourceId === sourceId
    }) || null
  }

  function factByLabel(groupOrCard, label) {
    return (groupOrCard && groupOrCard.facts || []).find(function(fact) {
      return fact.label === label
    }) || null
  }

  function factValue(groupOrCard, label, fallback) {
    var fact = factByLabel(groupOrCard, label)
    return emptyText(fact && fact.value, fallback || 'Missing')
  }

  function factSource(groupOrCard, label, fallback) {
    var fact = factByLabel(groupOrCard, label)
    return emptyText(fact && fact.sourceId, fallback || '')
  }

  function compactGapValue(value) {
    return String(value || '').replace(/\s*\([^)]*\)/g, '').trim()
  }

  function numericValue(value) {
    var normalized = String(value || '').replace(/,/g, '').trim()
    var match = normalized.match(/-?\d+(?:\.\d+)?/)
    if (!match) return null
    var number = Number(match[0])
    if (Number.isNaN(number)) return null
    if (/[kK]\b/.test(normalized)) return number * 1000
    if (/[mM]\b/.test(normalized)) return number * 1000000
    return number
  }

  function percentValue(value) {
    var parsed = numericValue(value)
    return parsed == null ? null : parsed / 100
  }

  function formatCompactMoney(value) {
    if (value == null || Number.isNaN(value)) return 'Missing'
    var abs = Math.abs(value)
    var sign = value < 0 ? '-' : ''
    if (abs >= 1000000) return sign + '$' + (abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M'
    if (abs >= 1000) return sign + '$' + Math.round(abs / 1000) + 'K'
    return sign + '$' + Math.round(abs)
  }

  function monthEndCashWatch(financeCard, ownersCard) {
    var cash = numericValue(factValue(financeCard, 'Available Cash', ''))
    var ar = numericValue(factValue(financeCard, 'Expected AR', ''))
    var april = numericValue(factValue(ownersCard, 'Collecting April Net To Team', ''))
    if (cash == null) return 'Missing'
    return formatCompactMoney(cash + (ar || 0) + (april || 0))
  }

  function weeklyProfitLabel(financeCard) {
    var revenue = numericValue(factValue(financeCard, 'Latest Weekly Revenue Cell', ''))
    var expense = numericValue(factValue(financeCard, 'Latest Weekly Expense Cell', ''))
    if (revenue == null || expense == null) return 'Weekly result missing'
    var result = revenue - expense
    return formatCompactMoney(result) + ' / wk'
  }

  function fallbackSummary(reason) {
    var normalized = String(reason || '').toLowerCase()
    if (normalized.indexOf('429') !== -1 || normalized.indexOf('quota') !== -1 || normalized.indexOf('rate') !== -1) {
      return 'Live Sheets refresh is temporarily rate-limited.'
    }
    return 'Live source refresh is temporarily unavailable.'
  }

  function appendSource(parent, text) {
    if (!text) return null
    return appendText(parent, 'small', text, 'strategy-v2-source-id')
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
    appendText(copy, 'p', 'Current targets, actuals, and gaps from the signed strategy sources.', 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', formatDateTime(goalTruth.generatedAt), 'doc-meta')
    panel.appendChild(header)

    var grid = document.createElement('div')
    grid.className = 'strategy-v2-goal-grid'
    ;(goalTruth.groups || []).forEach(function(group) {
      var card = document.createElement('article')
      card.className = 'strategy-v2-card strategy-v2-goal-card'
      card.setAttribute('data-goal-key', group.key || 'goal')
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
    appendText(copy, 'h3', 'Operating inputs')
    appendText(copy, 'p', 'Live source checks behind the Strategy snapshot. These are inputs, not recommendations.', 'strategy-v2-muted')
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
      if (cardData.sourceId === 'SRC-OWNERS-001') {
        appendText(card, 'p', 'Conditional deals are not firm cash. They stay as forecast risk until the deal firms and has a closing date.', 'strategy-v2-source-note')
      }
      renderFactList(card, displayFactsForSourceCard(cardData), 5)
      grid.appendChild(card)
    })
    panel.appendChild(grid)
    container.appendChild(panel)
  }

  function renderMeetingPacketPreview(meetingReady) {
    var packet = meetingReady || {}
    var routeReview = packet.routeReview || {}
    var preview = document.createElement('article')
    preview.className = 'strategy-v2-focus-panel strategy-v2-meeting-preview'
    appendText(preview, 'div', 'Meeting Packet', 'eyebrow')
    appendText(preview, 'h3', emptyText(packet.title, 'Ownership meeting packet'))
    appendText(preview, 'p', emptyText(packet.primaryRead, 'Meeting packet is not available yet.'), 'strategy-v2-muted')
    var stats = document.createElement('div')
    stats.className = 'strategy-v2-meeting-stat-grid'
    stats.appendChild(renderMeetingStat('Agenda', count(packet.agendaItems), 'items'))
    stats.appendChild(renderMeetingStat('Pressure', count(packet.pressureCards), 'cards'))
    stats.appendChild(renderMeetingStat('Pending', routeReview.pendingRoutes || 0, 'strategy'))
    stats.appendChild(renderMeetingStat('Hidden', routeReview.hiddenOperationalRoutes || 0, 'ops routes'))
    preview.appendChild(stats)
    var agenda = document.createElement('div')
    agenda.className = 'strategy-v2-meeting-agenda strategy-v2-meeting-agenda-preview'
    ;(packet.agendaItems || []).slice(0, 3).forEach(function(item, index) {
      agenda.appendChild(renderAgendaItem(item, index))
    })
    preview.appendChild(agenda)
    var link = document.createElement('a')
    link.className = 'section-support-link'
    link.href = '#meeting'
    link.textContent = 'Open meeting packet'
    preview.appendChild(link)
    return preview
  }

  function renderMeetingStat(label, value, suffix) {
    var stat = document.createElement('div')
    stat.className = 'strategy-v2-meeting-stat'
    appendText(stat, 'span', label)
    appendText(stat, 'strong', String(value))
    appendText(stat, 'small', suffix)
    return stat
  }

  function renderAgendaItem(item, index) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-agenda-item'
    var marker = document.createElement('div')
    marker.className = 'strategy-v2-agenda-marker'
    marker.textContent = String(index + 1)
    card.appendChild(marker)
    var copy = document.createElement('div')
    appendText(copy, 'h4', emptyText(item.title, 'Agenda item'))
    appendText(copy, 'strong', emptyText(item.focus, 'Focus missing'), 'strategy-v2-agenda-focus')
    appendText(copy, 'p', emptyText(item.question, 'Question missing'), 'strategy-v2-muted')
    if (item.nextAction) appendText(copy, 'p', item.nextAction, 'strategy-v2-meeting-next')
    var sources = document.createElement('div')
    sources.className = 'strategy-v2-meeting-sources'
    ;(item.sourceIds || []).slice(0, 4).forEach(function(sourceId) {
      sources.appendChild(makePill(sourceId, 'neutral'))
    })
    copy.appendChild(sources)
    card.appendChild(copy)
    return card
  }

  function renderPressureCard(cardData) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-card strategy-v2-pressure-card'
    appendText(card, 'div', emptyText(cardData.label, 'Pressure'), 'strategy-v2-focus-label')
    appendText(card, 'h4', emptyText(cardData.headline, 'Missing'))
    appendText(card, 'p', emptyText(cardData.readout, 'No readout recorded.'), 'strategy-v2-muted')
    if (cardData.meetingQuestion) appendText(card, 'p', cardData.meetingQuestion, 'strategy-v2-meeting-question')
    renderFactList(card, (cardData.evidence || []).map(function(item) {
      return { label: item.label, value: item.value, sourceId: item.sourceId }
    }), 4)
    return card
  }

  function renderMeetingRouteItem(route) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-route-mini strategy-v2-meeting-route'
    appendText(card, 'strong', emptyText(route.title, 'Strategy route'), 'strategy-v2-route-mini-title')
    appendText(card, 'p', emptyText(route.readout, 'No route summary recorded.'), 'strategy-v2-muted')
    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-mini-meta'
    meta.appendChild(makePill(emptyText(route.status, 'unknown'), statusTone(route.status)))
    meta.appendChild(makePill(emptyText(route.destination, 'Record'), 'neutral'))
    appendText(meta, 'span', 'Owner: ' + emptyText(route.owner, 'missing'))
    appendText(meta, 'span', 'Proof: ' + String(route.proofItemCount || 0))
    card.appendChild(meta)
    return card
  }

  function renderMeetingReady(container, data) {
    var packet = data.meetingReady || {}
    var routeReview = packet.routeReview || {}
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel strategy-v2-meeting-panel'
    panel.id = 'meeting'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Meeting Packet', 'eyebrow')
    appendText(copy, 'h3', emptyText(packet.title, 'Ownership meeting packet'))
    appendText(copy, 'p', emptyText(packet.primaryRead, 'Source-backed meeting packet is not available yet.'), 'strategy-v2-muted')
    header.appendChild(copy)
    var statePill = document.createElement('div')
    statePill.className = 'strategy-v2-route-pills'
    statePill.appendChild(makePill(emptyText(packet.status, 'missing'), statusTone(packet.status)))
    statePill.appendChild(makePill(String(routeReview.hiddenOperationalRoutes || 0) + ' ops routes hidden', 'neutral'))
    header.appendChild(statePill)
    panel.appendChild(header)

    var statGrid = document.createElement('div')
    statGrid.className = 'strategy-v2-meeting-stat-grid'
    statGrid.appendChild(renderMeetingStat('Agenda', count(packet.agendaItems), 'items'))
    statGrid.appendChild(renderMeetingStat('Pressure', count(packet.pressureCards), 'cards'))
    statGrid.appendChild(renderMeetingStat('Pending', routeReview.pendingRoutes || 0, 'strategy'))
    statGrid.appendChild(renderMeetingStat('Proof', packet.proofSummary && packet.proofSummary.sourceIds ? packet.proofSummary.sourceIds.length : 0, 'sources'))
    panel.appendChild(statGrid)

    var agendaSection = document.createElement('div')
    agendaSection.className = 'strategy-v2-meeting-grid'
    var agenda = document.createElement('article')
    agenda.className = 'strategy-v2-focus-panel'
    appendText(agenda, 'div', 'Agenda', 'eyebrow')
    appendText(agenda, 'h3', 'What to talk through')
    var agendaList = document.createElement('div')
    agendaList.className = 'strategy-v2-meeting-agenda'
    ;(packet.agendaItems || []).forEach(function(item, index) {
      agendaList.appendChild(renderAgendaItem(item, index))
    })
    agenda.appendChild(agendaList)
    agendaSection.appendChild(agenda)

    var actions = document.createElement('article')
    actions.className = 'strategy-v2-focus-panel'
    appendText(actions, 'div', 'Next Actions', 'eyebrow')
    appendText(actions, 'h3', 'Use this in the meeting')
    var actionList = document.createElement('div')
    actionList.className = 'strategy-v2-focus-list'
    ;(packet.operatorActions || []).forEach(function(action) {
      actionList.appendChild(renderFocusRow('Action', action, 'Owner-only Strategy workflow.'))
    })
    actions.appendChild(actionList)
    agendaSection.appendChild(actions)
    panel.appendChild(agendaSection)

    var pressureGrid = document.createElement('div')
    pressureGrid.className = 'strategy-v2-goal-grid'
    ;(packet.pressureCards || []).forEach(function(cardData) {
      pressureGrid.appendChild(renderPressureCard(cardData))
    })
    panel.appendChild(pressureGrid)

    var routePanel = document.createElement('article')
    routePanel.className = 'strategy-v2-focus-panel'
    appendText(routePanel, 'div', 'Strategy Review', 'eyebrow')
    appendText(routePanel, 'h3', String(routeReview.pendingRoutes || 0) + ' pending review items')
    appendText(routePanel, 'p', emptyText(routeReview.visibilityRule, 'Only strategy routes show in this meeting packet.'), 'strategy-v2-muted')
    var routes = document.createElement('div')
    routes.className = 'strategy-v2-route-mini-list'
    ;(routeReview.topReviewItems || []).forEach(function(route) {
      routes.appendChild(renderMeetingRouteItem(route))
    })
    if (!(routeReview.topReviewItems || []).length) {
      appendText(routes, 'p', 'No Strategy review items are pending. Operational routes remain hidden from this packet.', 'strategy-v2-muted')
    }
    routePanel.appendChild(routes)
    panel.appendChild(routePanel)

    var proof = document.createElement('article')
    proof.className = 'strategy-v2-meeting-proof'
    appendText(proof, 'strong', 'Source proof')
    appendText(proof, 'span', 'Retrieval eval: ' + emptyText(packet.proofSummary && packet.proofSummary.retrievalEvalStatus, 'not surfaced'))
    appendText(proof, 'span', 'Route proof items: ' + String(packet.proofSummary && packet.proofSummary.routeProofItemCount || 0))
    ;(packet.proofSummary && packet.proofSummary.sourceIds || []).forEach(function(sourceId) {
      proof.appendChild(makePill(sourceId, 'neutral'))
    })
    panel.appendChild(proof)
    container.appendChild(panel)
  }

  function renderPlanningQueueItem(item) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-card strategy-v2-planning-item'
    appendText(card, 'div', emptyText(item.type, 'planning item').replace(/_/g, ' '), 'strategy-v2-focus-label')
    appendText(card, 'h4', emptyText(item.title, 'Planning item'))
    appendText(card, 'p', emptyText(item.readout, 'No readout recorded.'), 'strategy-v2-muted')
    appendText(card, 'p', emptyText(item.whyNow, 'Review before planning.'), 'strategy-v2-meeting-question')
    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-mini-meta'
    meta.appendChild(makePill(emptyText(item.status, 'review'), statusTone(item.status)))
    appendText(meta, 'span', 'Owner: ' + emptyText(item.owner, 'missing'))
    appendText(meta, 'span', 'Proof: ' + String(count(item.provenanceRefs)))
    card.appendChild(meta)
    appendText(card, 'strong', 'Next: ' + emptyText(item.nextAction, 'Choose a planning disposition.'), 'strategy-v2-agenda-focus')
    var sources = document.createElement('div')
    sources.className = 'strategy-v2-meeting-sources'
    ;(item.sourceIds || []).slice(0, 5).forEach(function(sourceId) {
      sources.appendChild(makePill(sourceId, 'neutral'))
    })
    if (!(item.sourceIds || []).length && (item.provenanceRefs || []).length) {
      sources.appendChild(makePill('proof refs attached', 'neutral'))
    }
    card.appendChild(sources)
    return card
  }

  function renderPlanningQueue(title, eyebrow, items, emptyCopy) {
    var panel = document.createElement('article')
    panel.className = 'strategy-v2-focus-panel'
    appendText(panel, 'div', eyebrow, 'eyebrow')
    appendText(panel, 'h3', title)
    var list = document.createElement('div')
    list.className = 'strategy-v2-goal-grid'
    ;(items || []).slice(0, 6).forEach(function(item) {
      list.appendChild(renderPlanningQueueItem(item))
    })
    if (!(items || []).length) {
      appendText(list, 'p', emptyCopy || 'No source-backed items in this queue.', 'strategy-v2-muted')
    }
    panel.appendChild(list)
    return panel
  }

  function scoperUiFromData(data) {
    return data && data.planningWorkflow && data.planningWorkflow.scoperUi || {}
  }

  function scoperOutputsFromData(data) {
    var ui = scoperUiFromData(data)
    return Array.isArray(ui.outputs) ? ui.outputs : []
  }

  function evidenceTone(type) {
    if (type === 'source' || type === 'decision') return 'good'
    if (type === 'gap' || type === 'draft_task') return 'watch'
    return 'neutral'
  }

  function renderScoperEvidencePointers(pointers, emptyCopy) {
    var wrap = document.createElement('div')
    wrap.className = 'strategy-v2-scoper-evidence'
    ;(pointers || []).slice(0, 12).forEach(function(pointer) {
      var link = document.createElement('a')
      link.className = 'strategy-v2-scoper-evidence-link strategy-v2-pill strategy-v2-pill-' + evidenceTone(pointer.type)
      link.href = pointer.href || '#planning'
      link.textContent = emptyText(pointer.label || pointer.ref, 'proof ref')
      link.title = emptyText(pointer.type, 'proof')
      wrap.appendChild(link)
    })
    if (!(pointers || []).length) {
      appendText(wrap, 'span', emptyCopy || 'No refs attached.', 'strategy-v2-muted')
    }
    return wrap
  }

  function renderQuarterContextPanel(data, options) {
    var quarter = data.quarterContext || {}
    var context = quarter.context || {}
    var summary = quarter.summary || {}
    var compact = options && options.compact
    var panel = document.createElement('article')
    panel.className = 'strategy-v2-focus-panel strategy-v2-quarter-context'
    appendText(panel, 'div', 'Quarter Context', 'eyebrow')
    appendText(panel, 'h3', emptyText(context.label, 'Quarter context not initialized'))
    appendText(panel, 'p', emptyText(context.theme, 'Owner-confirmed quarter theme is missing.'), 'strategy-v2-muted')

    var stats = document.createElement('div')
    stats.className = 'strategy-v2-meeting-stat-grid'
    stats.appendChild(renderMeetingStat('Status', emptyText(context.planningStatus || summary.planningStatus, 'missing'), 'planning'))
    stats.appendChild(renderMeetingStat('Targets', summary.targetCount || count(quarter.targets), 'items'))
    stats.appendChild(renderMeetingStat('Follow-up', summary.reviewOutputCount || count(quarter.reviewOutputs), 'items'))
    panel.appendChild(stats)

    if (compact) {
      appendLink(panel, '#planning', 'Open quarter inputs', 'section-support-link')
      return panel
    }

    var targetList = document.createElement('div')
    targetList.className = 'strategy-v2-goal-grid'
    ;(quarter.targets || []).slice(0, 4).forEach(function(target) {
      var card = document.createElement('article')
      card.className = 'strategy-v2-card strategy-v2-planning-item'
      appendText(card, 'div', emptyText(target.department, 'Strategy'), 'strategy-v2-focus-label')
      appendText(card, 'h4', emptyText(target.title, 'Quarter target'))
      appendText(card, 'p', emptyText(target.targetValue, 'Target value missing.'), 'strategy-v2-muted')
      var meta = document.createElement('div')
      meta.className = 'strategy-v2-route-mini-meta'
      meta.appendChild(makePill(emptyText(target.status, 'watch'), statusTone(target.status)))
      meta.appendChild(makePill(emptyText(target.owner, 'owner missing'), 'neutral'))
      card.appendChild(meta)
      targetList.appendChild(card)
    })
    if (!(quarter.targets || []).length) {
      appendText(targetList, 'p', 'No quarter targets yet.', 'strategy-v2-muted')
    }
    panel.appendChild(targetList)

    var form = document.createElement('form')
    form.className = 'strategy-v2-quarter-form'
    form.addEventListener('submit', saveQuarterContext)
    form.appendChild(makeQuarterInput('theme', 'Theme', context.theme || '', false))
    form.appendChild(makeQuarterInput('criticalNumber', 'Critical number', context.criticalNumber || '', false))
    form.appendChild(makeQuarterSelect('planningStatus', context.planningStatus || 'needs_owner_update'))
    form.appendChild(makeQuarterInput('ownerNote', 'Owner note', context.metadata && context.metadata.lastOwnerNote || '', true))
    var actions = document.createElement('div')
    actions.className = 'strategy-v2-route-actions'
    var button = document.createElement('button')
    button.type = 'submit'
    button.className = 'btn btn-primary'
    button.textContent = state.busyQuarterSave ? 'Saving' : 'Save Quarter'
    button.disabled = state.busyQuarterSave
    actions.appendChild(button)
    if (state.quarterMessage) appendText(actions, 'span', state.quarterMessage, 'strategy-v2-muted')
    form.appendChild(actions)
    panel.appendChild(form)
    return panel
  }

  function makeQuarterInput(name, label, value, multiline) {
    var wrap = document.createElement('label')
    wrap.className = 'strategy-v2-route-control'
    appendText(wrap, 'span', label)
    var input = multiline ? document.createElement('textarea') : document.createElement('input')
    input.name = name
    input.value = value || ''
    input.rows = multiline ? 3 : undefined
    wrap.appendChild(input)
    return wrap
  }

  function makeQuarterSelect(name, value) {
    var wrap = document.createElement('label')
    wrap.className = 'strategy-v2-route-control'
    appendText(wrap, 'span', 'Planning status')
    var select = document.createElement('select')
    select.name = name
    ;[
      ['needs_owner_update', 'Needs owner update'],
      ['draft', 'Draft'],
      ['review_ready', 'Review ready'],
      ['approved', 'Approved'],
      ['stale', 'Stale'],
    ].forEach(function(option) {
      var el = document.createElement('option')
      el.value = option[0]
      el.textContent = option[1]
      el.selected = option[0] === value
      select.appendChild(el)
    })
    wrap.appendChild(select)
    return wrap
  }

  function renderScoperSection(section) {
    var details = document.createElement('details')
    details.className = 'strategy-v2-scoper-section'
    details.open = section.key === 'gaps' || section.key === 'next_steps'
    appendText(details, 'summary', emptyText(section.title, 'Scoper section'))
    var items = Array.isArray(section.items) ? section.items : []
    if (!items.length) {
      appendText(details, 'p', emptyText(section.empty, 'No items recorded.'), 'strategy-v2-muted')
      return details
    }
    if (section.key === 'partial' || section.key === 'verified') {
      details.appendChild(renderScoperEvidencePointers(items, section.empty))
    } else {
      var list = document.createElement('div')
      list.className = 'strategy-v2-scoper-section-list'
      items.forEach(function(item) {
        var row = document.createElement('div')
        row.className = 'strategy-v2-scoper-row'
        appendText(row, 'span', emptyText(item.type, section.key).replace(/_/g, ' '), 'strategy-v2-focus-label')
        appendText(row, 'p', emptyText(item.label, 'Scoper item'), 'strategy-v2-muted')
        if (item.href) appendLink(row, item.href, item.type === 'draft_task' ? 'Open review path' : 'Open proof', 'section-support-link')
        list.appendChild(row)
      })
      details.appendChild(list)
    }
    return details
  }

  function renderScoperOutputCard(output) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-card strategy-v2-scoper-card'
    card.id = 'scoper-output-' + emptyText(output.scoperOutputId, 'missing').replace(/[^a-z0-9_-]+/gi, '-')
    var top = document.createElement('div')
    top.className = 'strategy-v2-card-top'
    var copy = document.createElement('div')
    appendText(copy, 'h4', emptyText(output.title, output.proposedCardId || 'Scoper output'))
    appendText(copy, 'p', emptyText(output.summary, 'No Scoper summary recorded.'), 'strategy-v2-muted')
    top.appendChild(copy)
    var pills = document.createElement('div')
    pills.className = 'strategy-v2-route-pills'
    pills.appendChild(makePill(emptyText(output.status, 'review'), statusTone(output.status)))
    pills.appendChild(makePill(emptyText(output.confidence, 'confidence missing') + ' confidence', statusTone(output.confidence)))
    pills.appendChild(makePill('Owner: ' + emptyText(output.owner, 'missing'), 'neutral'))
    top.appendChild(pills)
    card.appendChild(top)

    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-meta'
    appendText(meta, 'span', emptyText(output.proposedCardId, 'proposed card missing'))
    appendText(meta, 'span', 'Evidence: ' + String(count(output.evidencePointers)))
    appendText(meta, 'span', 'Routes: ' + String(count(output.routeRefs)))
    card.appendChild(meta)

    ;(output.sections || []).forEach(function(section) {
      card.appendChild(renderScoperSection(section))
    })

    var blocked = document.createElement('details')
    blocked.className = 'strategy-v2-technical-refs'
    appendText(blocked, 'summary', 'Blocked auto-actions')
    ;(output.blockedActions || []).forEach(function(action) {
      appendText(blocked, 'p', action)
    })
    if (!(output.blockedActions || []).length) appendText(blocked, 'p', 'No blocked action notes recorded.')
    card.appendChild(blocked)

    var actions = document.createElement('div')
    actions.className = 'strategy-v2-route-actions'
    var routeAction = output.draftTaskAction || {}
    var routeLink = document.createElement('a')
    routeLink.className = 'strategy-v2-action-btn strategy-v2-action-primary'
    routeLink.href = routeAction.href || '#route-review'
    routeLink.textContent = emptyText(routeAction.label, 'Open review path')
    routeLink.title = 'Use the existing human approval path. This UI does not auto-create backlog work.'
    actions.appendChild(routeLink)
    card.appendChild(actions)
    return card
  }

  function renderScoperOutputPanel(data) {
    var ui = scoperUiFromData(data)
    var outputs = scoperOutputsFromData(data)
    var panel = document.createElement('article')
    panel.className = 'strategy-v2-focus-panel strategy-v2-scoper-panel'
    appendText(panel, 'div', 'Scoper Outputs', 'eyebrow')
    appendText(panel, 'h3', 'Gap-resolving Scoper review')
    appendText(panel, 'p', emptyText(ui.summary, 'No Scoper outputs are available yet.'), 'strategy-v2-muted')
    var stats = document.createElement('div')
    stats.className = 'strategy-v2-meeting-stat-grid'
    stats.appendChild(renderMeetingStat('Outputs', outputs.length, 'scoped'))
    stats.appendChild(renderMeetingStat('Sources', count(ui.sourceIds), 'ids'))
    stats.appendChild(renderMeetingStat('Routes', count(ui.routeRefs), 'refs'))
    stats.appendChild(renderMeetingStat('Mode', ui.noAutoCreatesBacklog ? 'Review' : 'Repair', 'only'))
    panel.appendChild(stats)
    var list = document.createElement('div')
    list.className = 'strategy-v2-scoper-list'
    outputs.slice(0, 6).forEach(function(output) {
      list.appendChild(renderScoperOutputCard(output))
    })
    if (!outputs.length) {
      appendText(list, 'p', 'No Scoper outputs are ready for the Strategy Hub review surface.', 'strategy-v2-muted')
    }
    panel.appendChild(list)
    return panel
  }

  function relatedScoperOutputsForRoute(route, data) {
    var routeId = emptyText(route && route.routeId, '')
    if (!routeId) return []
    return scoperOutputsFromData(data).filter(function(output) {
      return (output.routeRefs || []).indexOf(routeId) !== -1
    })
  }

  function renderRouteScoperOutputs(route, data) {
    var outputs = relatedScoperOutputsForRoute(route, data)
    if (!outputs.length) return null
    var details = document.createElement('details')
    details.className = 'strategy-v2-provenance strategy-v2-scoper-route-proof'
    appendText(details, 'summary', 'Scoper output')
    outputs.slice(0, 2).forEach(function(output) {
      var block = document.createElement('div')
      block.className = 'strategy-v2-scoper-route-block'
      appendText(block, 'strong', emptyText(output.title, output.proposedCardId || 'Scoper output'))
      appendText(block, 'p', emptyText(output.summary, 'No Scoper summary recorded.'), 'strategy-v2-muted')
      block.appendChild(renderScoperEvidencePointers(output.evidencePointers || [], 'No evidence pointers attached.'))
      details.appendChild(block)
    })
    return details
  }

  function renderPlanningWorkflow(container, data) {
    var workflow = data.planningWorkflow || {}
    var proof = workflow.proofSummary || {}
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel strategy-v2-planning-panel'
    panel.id = 'planning'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Planning Workflow', 'eyebrow')
    appendText(copy, 'h3', emptyText(workflow.title, 'Quarterly planning workflow'))
    appendText(copy, 'p', emptyText(workflow.primaryRead, 'No source-backed planning workflow is available yet.'), 'strategy-v2-muted')
    header.appendChild(copy)
    var statePill = document.createElement('div')
    statePill.className = 'strategy-v2-route-pills'
    statePill.appendChild(makePill(emptyText(workflow.status, 'missing'), statusTone(workflow.status)))
    statePill.appendChild(makePill(String(proof.hiddenOperationalRoutes || 0) + ' ops routes hidden', 'neutral'))
    header.appendChild(statePill)
    panel.appendChild(header)

    var statGrid = document.createElement('div')
    statGrid.className = 'strategy-v2-meeting-stat-grid'
    statGrid.appendChild(renderMeetingStat('Priority', count(workflow.priorityCandidates), 'items'))
    statGrid.appendChild(renderMeetingStat('Carry', count(workflow.carryForwardCandidates), 'items'))
    statGrid.appendChild(renderMeetingStat('Stop', count(workflow.stopCandidates), 'items'))
    statGrid.appendChild(renderMeetingStat('Gaps', count(workflow.missingDataGaps), 'items'))
    panel.appendChild(statGrid)

    var steps = document.createElement('article')
    steps.className = 'strategy-v2-focus-panel'
    appendText(steps, 'div', 'Review Steps', 'eyebrow')
    appendText(steps, 'h3', 'How to use this packet')
    var stepList = document.createElement('div')
    stepList.className = 'strategy-v2-meeting-agenda'
    ;(workflow.reviewSteps || []).forEach(function(step, index) {
      stepList.appendChild(renderAgendaItem({
        title: emptyText(step.label, 'Review step'),
        focus: emptyText(step.detail, 'Review the source-backed planning item.'),
        question: 'Confirm disposition before this becomes applied work.',
        nextAction: 'Use Strategy review controls or Scoper outputs; do not apply from this packet.',
        sourceIds: step.sourceIds || [],
      }, index))
    })
    steps.appendChild(stepList)
    panel.appendChild(steps)

    panel.appendChild(renderQuarterContextPanel(data))
    panel.appendChild(renderScoperOutputPanel(data))
    panel.appendChild(renderPlanningQueue('Priority candidates', 'Decide', workflow.priorityCandidates, 'No priority candidates are source-backed yet.'))
    panel.appendChild(renderPlanningQueue('Carry forward candidates', 'Carry Forward', workflow.carryForwardCandidates, 'No carry-forward candidates are ready.'))
    panel.appendChild(renderPlanningQueue('Stop candidates', 'Stop', workflow.stopCandidates, 'No stop candidates are ready.'))
    panel.appendChild(renderPlanningQueue('Missing data gaps', 'Data Gaps', workflow.missingDataGaps, 'No missing-data gaps are visible.'))

    var proofPanel = document.createElement('article')
    proofPanel.className = 'strategy-v2-meeting-proof'
    appendText(proofPanel, 'strong', 'Planning proof')
    appendText(proofPanel, 'span', 'Strategic issues: ' + String(proof.issueCount || 0))
    appendText(proofPanel, 'span', 'Scoper outputs: ' + String(proof.scoperOutputCount || 0))
    appendText(proofPanel, 'span', 'Retrieval eval: ' + emptyText(proof.retrievalEvalStatus, 'not surfaced'))
    ;(proof.sourceIds || []).slice(0, 8).forEach(function(sourceId) {
      proofPanel.appendChild(makePill(sourceId, 'neutral'))
    })
    panel.appendChild(proofPanel)
    container.appendChild(panel)
  }

  function renderBusinessAtomCard(atom) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-card strategy-v2-planning-item'
    appendText(card, 'div', emptyText(atom.category, 'atom').replace(/_/g, ' '), 'strategy-v2-focus-label')
    appendText(card, 'h4', emptyText(atom.title, 'Business atom'))
    appendText(card, 'p', emptyText(atom.description || atom.sourceExcerpt, 'No atom summary recorded.'), 'strategy-v2-muted')
    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-mini-meta'
    meta.appendChild(makePill(emptyText(atom.lifecycleStatus, 'detected'), statusTone(atom.lifecycleStatus)))
    meta.appendChild(makePill(emptyText(atom.pillar, 'pillar'), 'neutral'))
    appendText(meta, 'span', String(atom.hitCount || 0) + ' hits')
    appendText(meta, 'span', emptyText(atom.timeScope, 'time scope'))
    card.appendChild(meta)
    var source = document.createElement('div')
    source.className = 'strategy-v2-meeting-sources'
    source.appendChild(makePill(emptyText(atom.sourceId, 'source missing'), 'neutral'))
    source.appendChild(makePill(emptyText(atom.currentState, 'state missing'), statusTone(atom.currentState)))
    card.appendChild(source)
    appendText(card, 'strong', 'Next: ' + emptyText(atom.nextTrigger, 'Review when this signal repeats.'), 'strategy-v2-agenda-focus')
    return card
  }

  function renderBusinessAtomView(title, eyebrow, atoms, emptyCopy) {
    var panel = document.createElement('article')
    panel.className = 'strategy-v2-focus-panel'
    appendText(panel, 'div', eyebrow, 'eyebrow')
    appendText(panel, 'h3', title)
    var list = document.createElement('div')
    list.className = 'strategy-v2-goal-grid'
    ;(atoms || []).slice(0, 8).forEach(function(atom) {
      list.appendChild(renderBusinessAtomCard(atom))
    })
    if (!(atoms || []).length) {
      appendText(list, 'p', emptyCopy || 'No source-backed business atoms in this view yet.', 'strategy-v2-muted')
    }
    panel.appendChild(list)
    return panel
  }

  function renderBusinessAtoms(container, data) {
    var businessAtoms = data.businessAtoms || {}
    var summary = businessAtoms.summary || {}
    var views = businessAtoms.views || {}
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'business-atoms'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Business Atoms', 'eyebrow')
    appendText(copy, 'h3', 'Small source-backed business signals')
    appendText(copy, 'p', 'Atoms are evidence units for weekly, monthly, quarterly, and annual planning. They do not apply decisions or create work by themselves.', 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', formatDateTime(businessAtoms.generatedAt), 'doc-meta')
    panel.appendChild(header)

    var statGrid = document.createElement('div')
    statGrid.className = 'strategy-v2-meeting-stat-grid'
    statGrid.appendChild(renderMeetingStat('Atoms', summary.totalAtoms || 0, 'seeded'))
    statGrid.appendChild(renderMeetingStat('Current', summary.currentAtoms || 0, 'active'))
    statGrid.appendChild(renderMeetingStat('Hits', summary.totalHits || 0, 'proof'))
    statGrid.appendChild(renderMeetingStat('Categories', count(summary.categoryCounts), 'types'))
    panel.appendChild(statGrid)

    panel.appendChild(renderBusinessAtomView('Weekly pulse', 'This Week', views.weekly, 'No weekly atoms yet.'))
    panel.appendChild(renderBusinessAtomView('Monthly signals', 'This Month', views.monthly, 'No monthly atoms yet.'))
    panel.appendChild(renderBusinessAtomView('Quarterly board', 'This Quarter', views.quarterly, 'No quarterly atoms yet.'))
    panel.appendChild(renderBusinessAtomView('Annual patterns', 'Annual', views.annual, 'No annual atoms yet.'))
    container.appendChild(panel)
  }

  function renderGovernanceCheck(check) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-card strategy-v2-planning-item'
    var top = document.createElement('div')
    top.className = 'strategy-v2-card-top'
    appendText(top, 'h4', emptyText(check.label, 'Governance check'))
    top.appendChild(makePill(emptyText(check.status, 'watch'), statusTone(check.status)))
    card.appendChild(top)
    appendText(card, 'p', emptyText(check.threshold, 'Threshold missing.'), 'strategy-v2-muted')
    appendText(card, 'strong', 'Next: ' + emptyText(check.nextTrigger, 'Review on cadence.'), 'strategy-v2-agenda-focus')
    var sources = document.createElement('div')
    sources.className = 'strategy-v2-meeting-sources'
    ;(check.sourceIds || []).slice(0, 5).forEach(function(sourceId) {
      sources.appendChild(makePill(sourceId, 'neutral'))
    })
    if (!(check.sourceIds || []).length) appendText(sources, 'span', 'No source IDs attached', 'strategy-v2-muted')
    card.appendChild(sources)
    return card
  }

  function renderGovernanceSequenceStep(step, index) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-agenda-item'
    var marker = document.createElement('div')
    marker.className = 'strategy-v2-agenda-marker'
    marker.textContent = String(index + 1)
    card.appendChild(marker)
    var copy = document.createElement('div')
    appendText(copy, 'h4', emptyText(step.label, 'Governance step'))
    appendText(copy, 'strong', emptyText(step.requiredOutput, 'Required output missing'), 'strategy-v2-agenda-focus')
    appendText(copy, 'p', emptyText(step.nextAction, 'No next action recorded.'), 'strategy-v2-muted')
    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-mini-meta'
    meta.appendChild(makePill(emptyText(step.status, 'watch'), statusTone(step.status)))
    appendText(meta, 'span', 'Owner: ' + emptyText(step.owner, 'missing'))
    copy.appendChild(meta)
    card.appendChild(copy)
    return card
  }

  function renderGovernanceDriftItem(item) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-card strategy-v2-planning-item'
    appendText(card, 'div', emptyText(item.type, 'drift').replace(/_/g, ' '), 'strategy-v2-focus-label')
    appendText(card, 'h4', emptyText(item.title, 'Governance drift'))
    appendText(card, 'p', emptyText(item.readout, 'No drift readout recorded.'), 'strategy-v2-muted')
    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-mini-meta'
    meta.appendChild(makePill(emptyText(item.severity, 'watch'), statusTone(item.severity)))
    appendText(meta, 'span', 'Owner: ' + emptyText(item.owner, 'missing'))
    card.appendChild(meta)
    appendText(card, 'strong', 'Next: ' + emptyText(item.nextAction, 'Review on governance cadence.'), 'strategy-v2-agenda-focus')
    var sources = document.createElement('div')
    sources.className = 'strategy-v2-meeting-sources'
    ;(item.sourceIds || []).slice(0, 5).forEach(function(sourceId) {
      sources.appendChild(makePill(sourceId, 'neutral'))
    })
    card.appendChild(sources)
    return card
  }

  function renderGovernanceOutputItem(item) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-route-mini strategy-v2-meeting-route'
    appendText(card, 'strong', emptyText(item.title, 'Governance output'), 'strategy-v2-route-mini-title')
    appendText(card, 'p', emptyText(item.nextAction, 'No next action recorded.'), 'strategy-v2-muted')
    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-mini-meta'
    meta.appendChild(makePill(emptyText(item.outputType, 'output'), 'neutral'))
    meta.appendChild(makePill(emptyText(item.status, 'ready'), statusTone(item.status)))
    appendText(meta, 'span', 'Owner: ' + emptyText(item.owner, 'missing'))
    card.appendChild(meta)
    return card
  }

  function renderGovernanceAccountability(container, data) {
    var governance = data.governanceAccountability || {}
    var summary = governance.summary || {}
    var panel = document.createElement('section')
    panel.className = 'panel strategy-v2-panel'
    panel.id = 'governance'

    var header = document.createElement('div')
    header.className = 'panel-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Governance', 'eyebrow')
    appendText(copy, 'h3', 'Accountability packet')
    appendText(copy, 'p', 'Read-only governance control: prepare the room, run the sequence, capture outputs, surface drift, and protect follow-through from ownerless limbo.', 'strategy-v2-muted')
    header.appendChild(copy)
    var statePill = document.createElement('div')
    statePill.className = 'strategy-v2-route-pills'
    statePill.appendChild(makePill(emptyText(governance.status, 'missing'), statusTone(governance.status)))
    statePill.appendChild(makePill(governance.guardrails && governance.guardrails.noAutoApply ? 'No auto-apply' : 'Auto-apply risk', governance.guardrails && governance.guardrails.noAutoApply ? 'good' : 'bad'))
    header.appendChild(statePill)
    panel.appendChild(header)

    var statGrid = document.createElement('div')
    statGrid.className = 'strategy-v2-meeting-stat-grid'
    statGrid.appendChild(renderMeetingStat('Sources', summary.sourceCount || 0, 'ids'))
    statGrid.appendChild(renderMeetingStat('Checks', summary.cadenceCheckCount || 0, 'cadence'))
    statGrid.appendChild(renderMeetingStat('Drift', summary.driftItemCount || 0, 'items'))
    statGrid.appendChild(renderMeetingStat('Outputs', summary.structuredOutputCount || 0, 'structured'))
    panel.appendChild(statGrid)

    var sequence = document.createElement('article')
    sequence.className = 'strategy-v2-focus-panel'
    appendText(sequence, 'div', 'Sequence', 'eyebrow')
    appendText(sequence, 'h3', 'How governance should run')
    var steps = document.createElement('div')
    steps.className = 'strategy-v2-meeting-agenda'
    ;(governance.sequence || []).forEach(function(step, index) {
      steps.appendChild(renderGovernanceSequenceStep(step, index))
    })
    sequence.appendChild(steps)
    panel.appendChild(sequence)

    var checkPanel = document.createElement('article')
    checkPanel.className = 'strategy-v2-focus-panel'
    appendText(checkPanel, 'div', 'Cadence Checks', 'eyebrow')
    appendText(checkPanel, 'h3', 'What the system watches')
    var checkGrid = document.createElement('div')
    checkGrid.className = 'strategy-v2-goal-grid'
    ;(governance.cadenceChecks || []).forEach(function(check) {
      checkGrid.appendChild(renderGovernanceCheck(check))
    })
    checkPanel.appendChild(checkGrid)
    panel.appendChild(checkPanel)

    var driftPanel = document.createElement('article')
    driftPanel.className = 'strategy-v2-focus-panel'
    appendText(driftPanel, 'div', 'Drift Queue', 'eyebrow')
    appendText(driftPanel, 'h3', 'What needs accountability')
    var driftGrid = document.createElement('div')
    driftGrid.className = 'strategy-v2-goal-grid'
    ;(governance.driftItems || []).slice(0, 8).forEach(function(item) {
      driftGrid.appendChild(renderGovernanceDriftItem(item))
    })
    if (!(governance.driftItems || []).length) appendText(driftGrid, 'p', 'No source-backed drift items are visible.', 'strategy-v2-muted')
    driftPanel.appendChild(driftGrid)
    panel.appendChild(driftPanel)

    var outputPanel = document.createElement('article')
    outputPanel.className = 'strategy-v2-focus-panel'
    appendText(outputPanel, 'div', 'Structured Outputs', 'eyebrow')
    appendText(outputPanel, 'h3', 'What must be captured')
    var outputs = document.createElement('div')
    outputs.className = 'strategy-v2-route-mini-list'
    ;(governance.structuredOutputs || []).slice(0, 10).forEach(function(item) {
      outputs.appendChild(renderGovernanceOutputItem(item))
    })
    if (!(governance.structuredOutputs || []).length) appendText(outputs, 'p', 'No governance outputs are waiting.', 'strategy-v2-muted')
    outputPanel.appendChild(outputs)
    panel.appendChild(outputPanel)

    var guardrailPanel = document.createElement('article')
    guardrailPanel.className = 'strategy-v2-meeting-proof'
    appendText(guardrailPanel, 'strong', 'Guardrails')
    ;(governance.guardrails && governance.guardrails.blockedActions || []).forEach(function(action) {
      appendText(guardrailPanel, 'span', action)
    })
    panel.appendChild(guardrailPanel)
    container.appendChild(panel)
  }

  function renderOverview(container, data) {
    var goalTruth = data.goalTruth || {}
    var operatingTruth = data.operatingTruth || {}
    var actionRouter = data.actionRouter || {}
    var teamGroup = goalGroupByKey(goalTruth, 'team_volume')
    var communityGroup = goalGroupByKey(goalTruth, 'community_agents')
    var capacityGroup = goalGroupByKey(goalTruth, 'agent_engine_capacity')
    var financeCard = sourceCardById(operatingTruth, 'SRC-FINANCE-001')
    var ownersCard = sourceCardById(operatingTruth, 'SRC-OWNERS-001')
    var fubCard = sourceCardById(operatingTruth, 'SRC-FUB-001')
    var kpiCard = sourceCardById(operatingTruth, 'SRC-SUPABASE-001')
    var strategyRoutes = strategyVisibleRoutes(actionRouter.recentRoutes || [])
    var pendingStrategyRoutes = strategyRoutes.filter(function(route) { return route.approvalStatus === 'pending' })

    var page = document.createElement('section')
    page.className = 'strategy-v2-overview-page'
    page.id = 'overview-summary'

    var kpis = document.createElement('div')
    kpis.className = 'strategy-v2-kpi-grid'
    kpis.appendChild(renderOverviewKpi({
      label: 'Team Production',
      value: compactGapValue(factValue(teamGroup, 'Pace', teamGroup && teamGroup.statusLabel)),
      detail: factValue(teamGroup, 'Actual', 'Actual missing') + ' vs ' + factValue(teamGroup, 'Should Be', 'target missing') + ' should be',
      source: factSource(teamGroup, 'Actual', 'SRC-OWNERS-001'),
      tone: 'watch',
    }))
    kpis.appendChild(renderOverviewKpi({
      label: 'Agent Capacity',
      value: factValue(capacityGroup, 'Current Active Agents', 'Active agents missing') + ' / ' + factValue(capacityGroup, 'Required Agents This Year', 'requirement missing'),
      detail: compactGapValue(factValue(capacityGroup, 'Gap This Year', capacityGroup && capacityGroup.statusLabel)),
      source: factSource(capacityGroup, 'Current Active Agents', 'SRC-FREEDOM-ENGINE-001'),
      tone: 'watch',
    }))
    kpis.appendChild(renderOverviewKpi({
      label: 'Recruiting Pace',
      value: factValue(capacityGroup, 'Current Recruiting Pace', 'pace missing') + ' / ' + factValue(capacityGroup, 'Required Recruiting Pace', 'required missing'),
      detail: 'Current pace vs required monthly pace',
      source: factSource(capacityGroup, 'Current Recruiting Pace', 'SRC-FREEDOM-ENGINE-001'),
      tone: 'watch',
    }))
    kpis.appendChild(renderOverviewKpi({
      label: 'Cash Posture',
      value: factValue(financeCard, 'Available Cash', 'cash missing') + ' today',
      detail: 'Month-end watch ' + monthEndCashWatch(financeCard, ownersCard) + ' before new expenses; ' + factValue(financeCard, 'Expected AR', 'AR missing') + ' AR',
      source: 'SRC-FINANCE-001',
      tone: 'neutral',
    }))
    page.appendChild(kpis)
    if (data.quarterContext) {
      page.appendChild(renderQuarterContextPanel(data, { compact: true }))
    }
    if (data.businessAtoms) {
      var atomPreview = document.createElement('article')
      atomPreview.className = 'strategy-v2-focus-panel'
      appendText(atomPreview, 'div', 'Business Atoms', 'eyebrow')
      appendText(atomPreview, 'h3', String(data.businessAtoms.summary && data.businessAtoms.summary.currentAtoms || 0) + ' current planning signals')
      appendText(atomPreview, 'p', 'Source-backed atoms are ready for weekly, monthly, quarterly, and annual planning views.', 'strategy-v2-muted')
      var atomStats = document.createElement('div')
      atomStats.className = 'strategy-v2-meeting-stat-grid'
      atomStats.appendChild(renderMeetingStat('Atoms', data.businessAtoms.summary && data.businessAtoms.summary.totalAtoms || 0, 'seeded'))
      atomStats.appendChild(renderMeetingStat('Hits', data.businessAtoms.summary && data.businessAtoms.summary.totalHits || 0, 'proof'))
      atomStats.appendChild(renderMeetingStat('Quarter', count(data.businessAtoms.views && data.businessAtoms.views.quarterly), 'items'))
      atomPreview.appendChild(atomStats)
      appendLink(atomPreview, '#business-atoms', 'Open Business Atoms', 'section-support-link')
      page.appendChild(atomPreview)
    }
    if (data.planningWorkflow) {
      var planningPreview = document.createElement('article')
      planningPreview.className = 'strategy-v2-focus-panel'
      appendText(planningPreview, 'div', 'Planning Workflow', 'eyebrow')
      appendText(planningPreview, 'h3', emptyText(data.planningWorkflow.title, 'Quarterly planning workflow'))
      appendText(planningPreview, 'p', emptyText(data.planningWorkflow.primaryRead, 'Planning workflow is not ready yet.'), 'strategy-v2-muted')
      var planningStats = document.createElement('div')
      planningStats.className = 'strategy-v2-meeting-stat-grid'
      planningStats.appendChild(renderMeetingStat('Priority', count(data.planningWorkflow.priorityCandidates), 'items'))
      planningStats.appendChild(renderMeetingStat('Carry', count(data.planningWorkflow.carryForwardCandidates), 'items'))
      planningStats.appendChild(renderMeetingStat('Gaps', count(data.planningWorkflow.missingDataGaps), 'items'))
      planningPreview.appendChild(planningStats)
      appendLink(planningPreview, '#planning', 'Open planning workflow', 'section-support-link')
      page.appendChild(planningPreview)
    }
    if (data.governanceAccountability) {
      var governancePreview = document.createElement('article')
      governancePreview.className = 'strategy-v2-focus-panel'
      appendText(governancePreview, 'div', 'Governance', 'eyebrow')
      appendText(governancePreview, 'h3', String(data.governanceAccountability.summary && data.governanceAccountability.summary.driftItemCount || 0) + ' accountability items visible')
      appendText(governancePreview, 'p', 'Governance packet shows room readiness, cadence checks, drift, and structured outputs without auto-applying work.', 'strategy-v2-muted')
      var governanceStats = document.createElement('div')
      governanceStats.className = 'strategy-v2-meeting-stat-grid'
      governanceStats.appendChild(renderMeetingStat('Checks', data.governanceAccountability.summary && data.governanceAccountability.summary.cadenceCheckCount || 0, 'cadence'))
      governanceStats.appendChild(renderMeetingStat('Outputs', data.governanceAccountability.summary && data.governanceAccountability.summary.structuredOutputCount || 0, 'structured'))
      governanceStats.appendChild(renderMeetingStat('Ownerless', data.governanceAccountability.summary && data.governanceAccountability.summary.ownerlessOutputCount || 0, 'outputs'))
      governancePreview.appendChild(governanceStats)
      appendLink(governancePreview, '#governance', 'Open governance packet', 'section-support-link')
      page.appendChild(governancePreview)
    }
    page.appendChild(renderMeetingPacketPreview(data.meetingReady))
    page.appendChild(renderAgentEngineModel(teamGroup, capacityGroup, financeCard))

    var layout = document.createElement('div')
    layout.className = 'strategy-v2-overview-layout'

    var read = document.createElement('article')
    read.className = 'strategy-v2-focus-panel'
    appendText(read, 'div', 'Current Strategy Read', 'eyebrow')
    appendText(read, 'h3', 'Where the pressure is')
    var focusList = document.createElement('div')
    focusList.className = 'strategy-v2-focus-list'
    focusList.appendChild(renderFocusRow('Production', compactGapValue(factValue(teamGroup, 'Pace', teamGroup && teamGroup.statusLabel)), 'Team volume is behind the prorated 2026 target.'))
    focusList.appendChild(renderFocusRow('Capacity', compactGapValue(factValue(capacityGroup, 'Gap This Year', capacityGroup && capacityGroup.statusLabel)), 'The agent engine is short active productive capacity for the current model.'))
    focusList.appendChild(renderFocusRow('Productivity', compactGapValue(factValue(capacityGroup, 'Production Gap', 'production gap missing')), 'Average production per agent is below the model target.'))
    focusList.appendChild(renderFocusRow('Cash', weeklyProfitLabel(financeCard), factValue(financeCard, 'Latest Weekly Revenue Cell', 'revenue missing') + ' weekly revenue vs ' + factValue(financeCard, 'Latest Weekly Expense Cell', 'expense missing') + ' weekly expenses.'))
    read.appendChild(focusList)
    layout.appendChild(read)

    var wins = document.createElement('article')
    wins.className = 'strategy-v2-focus-panel'
    appendText(wins, 'div', 'Current Wins', 'eyebrow')
    appendText(wins, 'h3', 'Where we are winning')
    var winList = document.createElement('div')
    winList.className = 'strategy-v2-focus-list'
    winList.appendChild(renderFocusRow('Community', compactGapValue(factValue(communityGroup, 'Pace', communityGroup && communityGroup.statusLabel)), 'The Real Broker community path is ahead of plan.'))
    winList.appendChild(renderFocusRow('Split', factValue(capacityGroup, 'Split Gap', 'split gap missing'), factValue(capacityGroup, 'Actual Split', 'actual split missing') + ' actual vs ' + factValue(capacityGroup, 'Target Split', 'target split missing') + ' target.'))
    winList.appendChild(renderFocusRow('Source Truth', data.sourceTruthStatus === 'degraded' ? 'Fallback active' : 'Live', 'Signed sources are available for the Strategy read.'))
    wins.appendChild(winList)
    layout.appendChild(wins)
    page.appendChild(layout)

    var sources = document.createElement('div')
    sources.className = 'strategy-v2-source-compact-grid'
    ;[
      ['Finance', financeCard, 'Cash + weekly actuals'],
      ['Owners', ownersCard, 'Production + conditional forecast'],
      ['FUB', fubCard, 'CRM source hygiene'],
      ['KPI', kpiCard, 'KPI read rules'],
    ].forEach(function(item) {
      sources.appendChild(renderSourceCompact(item[0], item[1], item[2]))
    })
    page.appendChild(sources)
    container.appendChild(page)
  }

  function renderOverviewKpi(config) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-kpi-card strategy-v2-kpi-' + (config.tone || 'neutral')
    appendText(card, 'div', config.label, 'strategy-v2-kpi-label')
    appendText(card, 'strong', config.value, 'strategy-v2-kpi-value')
    appendText(card, 'p', config.detail, 'strategy-v2-kpi-detail')
    appendSource(card, config.source)
    return card
  }

  function renderAgentEngineModel(teamGroup, capacityGroup, financeCard) {
    var activeAgents = numericValue(factValue(capacityGroup, 'Current Active Agents', ''))
    var requiredAgents = numericValue(factValue(capacityGroup, 'Required Agents This Year', ''))
    var nextYearAgents = numericValue(factValue(capacityGroup, 'Required Start-of-Year Agents', ''))
    var avgProduction = numericValue(factValue(capacityGroup, 'Current Avg Production / Agent', ''))
    var targetProduction = numericValue(factValue(capacityGroup, 'Production Target / Agent', ''))
    var actualSplit = percentValue(factValue(capacityGroup, 'Actual Split', ''))
    var targetSplit = percentValue(factValue(capacityGroup, 'Target Split', ''))
    var projectedNet = activeAgents && avgProduction && actualSplit ? activeAgents * avgProduction * 12 * actualSplit : null
    var targetNet = (nextYearAgents || requiredAgents) && targetProduction && targetSplit ? (nextYearAgents || requiredAgents) * targetProduction * 12 * targetSplit : null

    var panel = document.createElement('article')
    panel.className = 'strategy-v2-model-panel'
    var header = document.createElement('div')
    header.className = 'strategy-v2-model-header'
    var copy = document.createElement('div')
    appendText(copy, 'div', 'Agent Engine Model', 'eyebrow')
    appendText(copy, 'h3', 'If the model stays this way')
    appendText(copy, 'p', 'Active agents, production per agent, and split explain the annualized net-to-company gap.', 'strategy-v2-muted')
    header.appendChild(copy)
    var projection = document.createElement('div')
    projection.className = 'strategy-v2-model-projection'
    appendText(projection, 'span', 'Projected net to company')
    appendText(projection, 'strong', formatCompactMoney(projectedNet))
    appendText(projection, 'small', 'Model target ' + formatCompactMoney(targetNet))
    header.appendChild(projection)
    panel.appendChild(header)

    var bars = document.createElement('div')
    bars.className = 'strategy-v2-bar-grid'
    bars.appendChild(renderMetricBar('Active agents', activeAgents, requiredAgents, factValue(capacityGroup, 'Current Active Agents', 'missing') + ' / ' + factValue(capacityGroup, 'Required Agents This Year', 'missing')))
    bars.appendChild(renderMetricBar('Production / agent', avgProduction, targetProduction, factValue(capacityGroup, 'Current Avg Production / Agent', 'missing') + ' / ' + factValue(capacityGroup, 'Production Target / Agent', 'missing')))
    bars.appendChild(renderMetricBar('Recruiting pace', numericValue(factValue(capacityGroup, 'Current Recruiting Pace', '')), numericValue(factValue(capacityGroup, 'Required Recruiting Pace', '')), factValue(capacityGroup, 'Current Recruiting Pace', 'missing') + ' / ' + factValue(capacityGroup, 'Required Recruiting Pace', 'missing')))
    bars.appendChild(renderMetricBar('Average split', actualSplit, targetSplit, factValue(capacityGroup, 'Actual Split', 'missing') + ' / ' + factValue(capacityGroup, 'Target Split', 'missing'), true))
    panel.appendChild(bars)
    appendSource(panel, factSource(capacityGroup, 'Current Active Agents', 'SRC-FREEDOM-ENGINE-001') + ' + ' + factSource(teamGroup, 'Actual', 'SRC-OWNERS-001'))
    return panel
  }

  function renderMetricBar(label, actual, target, detail, higherIsOk) {
    var row = document.createElement('div')
    row.className = 'strategy-v2-bar-row'
    var top = document.createElement('div')
    top.className = 'strategy-v2-bar-top'
    appendText(top, 'span', label)
    appendText(top, 'strong', detail)
    row.appendChild(top)
    var track = document.createElement('div')
    track.className = 'strategy-v2-bar-track'
    var fill = document.createElement('span')
    var ratio = actual != null && target ? Math.max(0, Math.min(1.2, actual / target)) : 0
    fill.style.width = Math.round(Math.min(1, ratio) * 100) + '%'
    fill.className = 'strategy-v2-bar-fill ' + (ratio >= 1 || higherIsOk && ratio >= 1 ? 'strategy-v2-bar-fill-good' : 'strategy-v2-bar-fill-watch')
    track.appendChild(fill)
    row.appendChild(track)
    return row
  }

  function renderStrategyQueuePreview(pendingStrategyRoutes, actionRouter) {
    var queue = document.createElement('article')
    queue.className = 'strategy-v2-focus-panel strategy-v2-queue-preview'
    appendText(queue, 'div', 'Strategy Queue', 'eyebrow')
    appendText(queue, 'h3', String(pendingStrategyRoutes.length) + ' strategy items need review')
    appendText(queue, 'p', pendingStrategyRoutes.length
      ? 'Only Strategy-qualified routes are shown here. Operating tasks stay out of Strategy.'
      : 'No Strategy routes are ready yet. The backend now has one clustered Strategy sample; proposals should run only after that sample is accepted.',
      'strategy-v2-muted'
    )
    var miniList = document.createElement('div')
    miniList.className = 'strategy-v2-route-mini-list'
    pendingStrategyRoutes.slice(0, 4).forEach(function(route) {
      miniList.appendChild(renderRouteMini(route))
    })
    if (!pendingStrategyRoutes.length) {
      appendText(miniList, 'p', String(actionRouter.hiddenOperationalRoutes || 0) + ' operational routes are hidden from this Strategy view.', 'strategy-v2-muted')
    }
    queue.appendChild(miniList)
    return queue
  }

  function renderFocusRow(label, value, detail) {
    var row = document.createElement('div')
    row.className = 'strategy-v2-focus-row'
    appendText(row, 'span', label, 'strategy-v2-focus-label')
    var copy = document.createElement('div')
    appendText(copy, 'strong', value)
    appendText(copy, 'p', detail)
    row.appendChild(copy)
    return row
  }

  function renderRouteMini(route) {
    var card = document.createElement('div')
    card.className = 'strategy-v2-route-mini'
    appendText(card, 'strong', routeTitle(route), 'strategy-v2-route-mini-title')
    var meta = document.createElement('div')
    meta.className = 'strategy-v2-route-mini-meta'
    meta.appendChild(makePill(destinationLabel(route), 'neutral'))
    appendText(meta, 'span', emptyText(route.owner, 'Owner missing'))
    card.appendChild(meta)
    return card
  }

  function renderSourceCompact(label, source, detail) {
    var card = document.createElement('article')
    card.className = 'strategy-v2-source-compact'
    appendText(card, 'span', label, 'strategy-v2-source-compact-label')
    appendText(card, 'strong', emptyText(source && source.validation, source && source.status || 'Missing'), 'strategy-v2-source-compact-status')
    appendText(card, 'p', detail)
    appendSource(card, source && source.sourceId)
    return card
  }

  function displayFactsForSourceCard(cardData) {
    var labels = {
      'Conditional Last Sync': 'Forecast last synced',
      'Active Conditional Tasks': 'Conditional deals under review',
      'Conditions Due / Past Due': 'Conditions due or past due',
      'Collecting April Net To Team': 'April firm/dated net to team',
      'Collecting May Net To Team': 'May dated conditional upside',
      'Collecting June Net To Team': 'June dated conditional upside',
      'Collecting Future Net To Team': 'Future dated conditional upside',
      'Net To Team Missing Closing Date': 'Conditional upside missing close date',
      'Latest Weekly Revenue Cell': 'Latest weekly revenue',
      'Latest Weekly Expense Cell': 'Latest weekly expense',
    }
    return (cardData.facts || []).map(function(fact) {
      return Object.assign({}, fact, { label: labels[fact.label] || fact.label })
    })
  }


  function routeTitle(route) {
    return emptyText(route.proposedPayload && route.proposedPayload.title, route.routeType + ' route')
  }

  function routeSummary(route) {
    var payload = route.proposedPayload || {}
    var proofItems = route.sourceProof && Array.isArray(route.sourceProof.items) ? route.sourceProof.items : []
    if (proofItems.length) {
      var latest = proofItems[0] || {}
      var proofText = latest.quote || latest.context || payload.summary || route.routingReason
      return shortenText(
        proofItems.length + ' source signal' + (proofItems.length === 1 ? '' : 's') +
          ' point to this issue. Latest proof: ' + proofText,
        360
      )
    }
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
      var metadata = route.metadata || {}
      var surface = String(
        metadata.strategySurface ||
        metadata.hubSurface ||
        metadata.reviewSurface ||
        ''
      ).toLowerCase()
      return metadata.strategyHubEligible === true ||
        surface === 'strategy' ||
        surface === 'strategy_hub' ||
        surface === 'strategic_execution'
    })
  }

  function routeSortValue(route) {
    var order = { pending: 0, approved: 1, applied: 2, rejected: 3, cancelled: 4 }
    return order[route.approvalStatus] == null ? 5 : order[route.approvalStatus]
  }

  function routeControl(route, key, fallback) {
    var id = route.routeId
    state.routeControls[id] = state.routeControls[id] || {}
    if (state.routeControls[id][key] == null) state.routeControls[id][key] = fallback
    return state.routeControls[id][key]
  }

  function setRouteControl(route, key, value, shouldRender) {
    var id = route.routeId
    state.routeControls[id] = state.routeControls[id] || {}
    state.routeControls[id][key] = value
    if (shouldRender) renderApp()
  }

  function ownerOptions(route) {
    var current = emptyText(route.owner, 'Foundation')
    return [
      { value: 'keep-current', label: 'Keep owner: ' + current },
      { value: 'Strategy', label: 'Strategy' },
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Sales Leadership', label: 'Sales Leadership' },
      { value: 'Finance', label: 'Finance' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Foundation', label: 'Foundation' },
      { value: 'Steve', label: 'Steve' },
      { value: 'Tanner', label: 'Tanner' },
      { value: 'needs-owner-decision', label: 'Needs owner decision' },
    ].filter(function(option, index, list) {
      return list.findIndex(function(other) { return other.value === option.value }) === index
    })
  }

  function renderRouteControls(card, route) {
    if (!['pending', 'approved'].includes(route.approvalStatus)) return
    var controls = document.createElement('div')
    controls.className = 'strategy-v2-route-controls'

    var ownerLabel = document.createElement('label')
    appendText(ownerLabel, 'span', 'Owner decision')
    var ownerSelect = document.createElement('select')
    ownerOptions(route).forEach(function(option) {
      var el = document.createElement('option')
      el.value = option.value
      el.textContent = option.label
      ownerSelect.appendChild(el)
    })
    ownerSelect.value = routeControl(route, 'owner', 'keep-current')
    ownerSelect.addEventListener('change', function() {
      setRouteControl(route, 'owner', ownerSelect.value)
    })
    ownerLabel.appendChild(ownerSelect)
    controls.appendChild(ownerLabel)

    var snoozeLabel = document.createElement('label')
    appendText(snoozeLabel, 'span', 'Snooze for')
    var snoozeSelect = document.createElement('select')
    ;[
      ['1d', '1 day'],
      ['1w', '1 week'],
      ['1m', '1 month'],
      ['1q', '1 quarter'],
      ['custom', 'Custom date'],
    ].forEach(function(option) {
      var el = document.createElement('option')
      el.value = option[0]
      el.textContent = option[1]
      snoozeSelect.appendChild(el)
    })
    snoozeSelect.value = routeControl(route, 'snoozeDuration', '1w')
    snoozeSelect.addEventListener('change', function() {
      setRouteControl(route, 'snoozeDuration', snoozeSelect.value, true)
    })
    snoozeLabel.appendChild(snoozeSelect)
    controls.appendChild(snoozeLabel)

    if (routeControl(route, 'snoozeDuration', '1w') === 'custom') {
      var customLabel = document.createElement('label')
      appendText(customLabel, 'span', 'Snooze until')
      var customInput = document.createElement('input')
      customInput.type = 'date'
      customInput.value = routeControl(route, 'snoozeUntil', '')
      customInput.addEventListener('change', function() {
        setRouteControl(route, 'snoozeUntil', customInput.value)
      })
      customLabel.appendChild(customInput)
      controls.appendChild(customLabel)
    }

    var noteLabel = document.createElement('label')
    noteLabel.className = 'strategy-v2-route-note-field'
    appendText(noteLabel, 'span', 'Review note')
    var noteInput = document.createElement('input')
    noteInput.type = 'text'
    noteInput.placeholder = 'Optional review note for this action'
    noteInput.value = routeControl(route, 'note', '')
    noteInput.addEventListener('input', function() {
      setRouteControl(route, 'note', noteInput.value)
    })
    noteLabel.appendChild(noteInput)
    controls.appendChild(noteLabel)

    card.appendChild(controls)
  }

  function actionButton(route, action, label, tone) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'strategy-v2-action-btn strategy-v2-action-' + (tone || 'neutral')
    button.textContent = state.busyRouteId === route.routeId ? 'Working...' : label
    button.title = actionHelp(action)
    button.setAttribute('aria-label', label + '. ' + actionHelp(action))
    button.disabled = Boolean(state.busyRouteId)
    button.addEventListener('click', function() {
      reviewRoute(route, action)
    })
    return button
  }

  function actionHelp(action) {
    return {
      approve_apply: 'Approve and write this route to the destination record. Strategy routes remain visible in Applied.',
      needs_owner: 'Use the owner picker. With a selected owner, apply with that owner; otherwise send to needs-owner decision.',
      snooze: 'Park this proposal until the selected snooze date. It stays out of active review until then.',
      ignore: 'Mark this proposal ignored without creating a work record.',
      reject: 'Reject this proposal and suppress it from future route refreshes.',
    }[action] || 'Review this route.'
  }

  function renderSourceProof(provenance, route) {
    var proof = route.sourceProof || {}
    var items = Array.isArray(proof.items) ? proof.items : []
    if (!items.length) {
      appendText(provenance, 'p', 'No human-readable proof was attached to this route yet.', 'strategy-v2-muted')
      return
    }
    appendText(provenance, 'p', proof.summary || 'Source evidence attached for review.', 'strategy-v2-proof-summary')
    var list = document.createElement('div')
    list.className = 'strategy-v2-proof-list'
    items.forEach(function(item) {
      var proofCard = document.createElement('article')
      proofCard.className = 'strategy-v2-proof-card'
      var title = emptyText(item.title, 'Source evidence')
      appendText(proofCard, 'h5', title)
      var meta = document.createElement('div')
      meta.className = 'strategy-v2-proof-meta'
      appendText(meta, 'span', emptyText(item.sourceId, 'source missing'))
      appendText(meta, 'span', emptyText(item.sourceType, 'source'))
      appendText(meta, 'span', formatDateTime(item.occurredAt))
      if (item.from) appendText(meta, 'span', 'From: ' + item.from)
      proofCard.appendChild(meta)
      if (item.to) appendText(proofCard, 'p', 'To: ' + item.to, 'strategy-v2-proof-small')
      if (Array.isArray(item.participants) && item.participants.length) {
        appendText(proofCard, 'p', 'Participants: ' + item.participants.join(', '), 'strategy-v2-proof-small')
      }
      appendText(proofCard, 'p', emptyText(item.threadStatus, 'Thread status not captured'), 'strategy-v2-proof-small')
      if (item.threadContext) {
        var context = item.threadContext
        appendText(
          proofCard,
          'p',
          [
            context.threadStatus || 'Thread status not captured',
            context.latestActivityAt ? 'latest ' + formatDateTime(context.latestActivityAt) : 'latest activity missing',
            context.direction && context.direction.label ? context.direction.label : '',
            context.corroboration && context.corroboration.label ? context.corroboration.label : '',
          ].filter(Boolean).join(' | '),
          'strategy-v2-proof-small'
        )
        var weakFlags = Array.isArray(context.weakFlags) ? context.weakFlags : []
        if (weakFlags.length) {
          var flags = document.createElement('div')
          flags.className = 'strategy-v2-proof-facts'
          weakFlags.forEach(function(flag) {
            flags.appendChild(makePill(flag.label || flag.code || 'weak proof', flag.severity === 'risk' ? 'bad' : 'watch'))
          })
          proofCard.appendChild(flags)
        } else if (context.confidenceLabel) {
          proofCard.appendChild(makePill(context.confidenceLabel, 'good'))
        }
      }
      if (item.quote) {
        appendText(proofCard, 'blockquote', item.quote, 'strategy-v2-proof-quote')
      }
      if (item.context) appendText(proofCard, 'p', item.context, 'strategy-v2-muted')
      if (item.includedBecause) {
        appendText(proofCard, 'p', 'Why included: ' + item.includedBecause, 'strategy-v2-proof-small')
      }
      if (Array.isArray(item.factSummaries) && item.factSummaries.length) {
        var facts = document.createElement('div')
        facts.className = 'strategy-v2-proof-facts'
        item.factSummaries.forEach(function(fact) {
          facts.appendChild(makePill(fact, 'neutral'))
        })
        proofCard.appendChild(facts)
      }
      if (item.sourceUrl) {
        appendLink(proofCard, item.sourceUrl, 'Open source', 'section-support-link')
      }
      list.appendChild(proofCard)
    })
    provenance.appendChild(list)

    var refs = proof.technicalRefs || {}
    var tech = document.createElement('details')
    tech.className = 'strategy-v2-technical-refs'
    appendText(tech, 'summary', 'Technical refs')
    appendText(tech, 'p', 'Synthesized item: ' + emptyText(refs.synthesizedItemId, route.synthesizedItemId || 'missing'))
    appendText(tech, 'p', 'Facts: ' + ((refs.factRefs || route.factRefs || []).join(', ') || 'none'))
    appendText(tech, 'p', 'Atoms: ' + ((refs.atomRefs || route.evidenceRefs || []).join(', ') || 'none'))
    appendText(tech, 'p', 'Chunks: ' + ((refs.chunkRefs || route.evidenceChunkRefs || []).join(', ') || 'none'))
    provenance.appendChild(tech)
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
    appendText(meta, 'span', 'Proof items: ' + count(route.sourceProof && route.sourceProof.items))
    card.appendChild(meta)

    var provenance = document.createElement('details')
    provenance.className = 'strategy-v2-provenance'
    provenance.open = route.approvalStatus === 'pending' && Boolean(route.sourceProof && Array.isArray(route.sourceProof.items) && route.sourceProof.items.length)
    appendText(provenance, 'summary', 'Source proof')
    renderSourceProof(provenance, route)
    card.appendChild(provenance)
    var scoperRouteOutput = renderRouteScoperOutputs(route, state.data)
    if (scoperRouteOutput) card.appendChild(scoperRouteOutput)

    renderRouteControls(card, route)

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
    var reviewRoutes = routes.filter(function(route) {
      return ['pending', 'approved'].indexOf(route.approvalStatus) !== -1
    })
    var appliedDoneRoutes = routes.filter(function(route) {
      return ['applied', 'rejected', 'cancelled'].indexOf(route.approvalStatus) !== -1
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
    appendText(copy, 'div', 'Strategy Review Queue', 'eyebrow')
    appendText(copy, 'h3', 'Strategic review')
    appendText(copy, 'p', 'This view is reserved for strategy prep, source-map gaps, goal gaps, and pillar decisions. Operating work stays in Ops or Foundation.', 'strategy-v2-muted')
    header.appendChild(copy)
    appendText(header, 'div', String(routes.length) + ' strategy routes', 'doc-meta')
    panel.appendChild(header)

    var summary = document.createElement('div')
    summary.className = 'strategy-v2-route-summary'
    summary.appendChild(makePill(String(pendingRoutes) + ' pending', pendingRoutes ? 'watch' : 'good'))
    summary.appendChild(makePill(String(approvedRoutes) + ' approved', approvedRoutes ? 'watch' : 'neutral'))
    summary.appendChild(makePill(String(appliedRoutes) + ' applied', appliedRoutes ? 'good' : 'neutral'))
    summary.appendChild(makePill(String(appliedWithDestination) + ' destination records', appliedWithDestination ? 'good' : 'neutral'))
    panel.appendChild(summary)

    var legend = document.createElement('div')
    legend.className = 'strategy-v2-action-legend'
    appendText(legend, 'strong', 'Action guide')
    ;[
      ['Approve and apply', 'Writes the route to its destination and keeps Strategy routes visible in Applied.'],
      ['Needs owner', 'Use the owner picker first. Without an owner, it creates a needs-owner question.'],
      ['Snooze', 'Parks the route for the selected duration.'],
      ['Ignore', 'Dismisses without creating work.'],
      ['Reject', 'Suppresses the proposal from future route refreshes after confirmation.'],
    ].forEach(function(item) {
      appendText(legend, 'span', item[0] + ': ' + item[1])
    })
    panel.appendChild(legend)

    var stack = document.createElement('div')
    stack.className = 'strategy-v2-route-stack'
    if (!routes.length) {
      appendText(stack, 'p', 'No Strategy Hub review records are ready yet. This is intentional: generic operating work is hidden, and Strategy proposals should be generated only after the clustered synthesis sample is accepted.', 'strategy-v2-muted')
    } else {
      appendText(stack, 'h4', 'Needs review', 'strategy-v2-route-group-title')
      if (reviewRoutes.length) {
        reviewRoutes.forEach(function(route) {
          stack.appendChild(renderRouteCard(route))
        })
      } else {
        appendText(stack, 'p', 'No pending or approved Strategy routes need review.', 'strategy-v2-muted')
      }
      appendText(stack, 'h4', 'Applied / done', 'strategy-v2-route-group-title')
      if (appliedDoneRoutes.length) {
        appliedDoneRoutes.forEach(function(route) {
          stack.appendChild(renderRouteCard(route))
        })
      } else {
        appendText(stack, 'p', 'No Strategy routes have been applied or closed yet.', 'strategy-v2-muted')
      }
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
    appendText(panel, 'p', 'Strategy Hub v2 now renders deterministic source-backed planning queues, but it still cannot produce unsupported advisor-chat recommendations or apply decisions automatically.', 'strategy-v2-muted')
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
    } else if (state.section === 'planning') {
      renderPlanningWorkflow(container, state.data)
    } else if (state.section === 'meeting') {
      renderMeetingReady(container, state.data)
    } else if (state.section === 'business-atoms') {
      renderBusinessAtoms(container, state.data)
    } else if (state.section === 'governance') {
      renderGovernanceAccountability(container, state.data)
    } else if (state.section === 'route-review') {
      renderRouteReview(container, state.data)
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

  async function saveQuarterContext(event) {
    event.preventDefault()
    var form = event.currentTarget
    var body = {}
    ;['theme', 'criticalNumber', 'planningStatus', 'ownerNote'].forEach(function(name) {
      var field = form.elements[name]
      if (field) body[name] = field.value
    })
    state.busyQuarterSave = true
    state.quarterMessage = ''
    renderApp()
    try {
      await fetchJson('/api/strategic-execution/quarter-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      state.quarterMessage = 'Saved'
      state.data = await fetchJson('/api/strategic-execution/v2')
    } catch (error) {
      state.quarterMessage = error.message || 'Save failed'
    } finally {
      state.busyQuarterSave = false
      renderApp()
    }
  }

  function snoozeUntilForControl(route) {
    var duration = routeControl(route, 'snoozeDuration', '1w')
    if (duration === 'custom') return routeControl(route, 'snoozeUntil', '')
    return ''
  }

  async function reviewRoute(route, action) {
    var actionLabels = {
      approve_apply: 'Approve and apply this route into its destination ledger.',
      reject: 'Reject this route and remove the source item from future proposal refreshes.',
      needs_owner: 'Use the owner picker. If no clear owner is selected, send it to the needs-owner question queue.',
      ignore: 'Mark this synthesized item ignored without creating work.',
      snooze: 'Snooze this item for the selected duration.',
    }
    var routeId = route.routeId
    var confirmMessage = action === 'reject'
      ? 'Reject this Strategy proposal? This suppresses the proposal from future route refreshes but keeps provenance.'
      : 'Confirm: ' + (actionLabels[action] || action)
    var confirmed = window.confirm(confirmMessage)
    if (!confirmed) return
    var controls = state.routeControls[routeId] || {}
    var note = controls.note || ''
    state.busyRouteId = routeId
    renderApp()
    try {
      var response = await fetchJson('/api/strategic-execution/action-routes/' + encodeURIComponent(routeId) + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          note: note,
          owner: controls.owner || route.owner || '',
          snoozeDuration: controls.snoozeDuration || '1w',
          snoozeUntil: snoozeUntilForControl(route),
        }),
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
