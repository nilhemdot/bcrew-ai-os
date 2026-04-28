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
    var goalTruth = data.goalTruth || {}
    var teamGroup = goalGroupByKey(goalTruth, 'team_volume')
    var strategyRoutes = strategyVisibleRoutes(actionRouter.recentRoutes || [])
    var pendingStrategyRoutes = strategyRoutes.filter(function(route) { return route.approvalStatus === 'pending' }).length
    var heroCopy = {
      overview: {
        label: 'Strategy Hub v2',
        title: 'Strategy Command',
        body: 'Current pace, capacity pressure, cash posture, and strategy-specific review items.',
      },
      'source-to-gap': {
        label: 'Source-To-Gap',
        title: 'Goal And Operating Truth',
        body: 'Current target, actual, and gap by source-backed business measure.',
      },
      'route-review': {
        label: 'Strategy Review Queue',
        title: 'Strategic Review',
        body: 'Only strategy prep, source-map gaps, goal gaps, and pillar decisions belong here.',
      },
    }[state.section] || {}
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
    } else {
      strip.appendChild(makePill(emptyText(teamGroup && teamGroup.statusLabel, 'Team pace missing'), statusTone(teamGroup && teamGroup.statusLabel)))
      strip.appendChild(makePill(String(pendingStrategyRoutes) + ' strategy reviews', pendingStrategyRoutes ? 'watch' : 'good'))
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

    page.appendChild(renderStrategyQueuePreview(pendingStrategyRoutes, actionRouter))

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

    var stack = document.createElement('div')
    stack.className = 'strategy-v2-route-stack'
    if (!routes.length) {
      appendText(stack, 'p', 'No Strategy Hub review records are ready yet. This is intentional: generic operating work is hidden, and Strategy proposals should be generated only after the clustered synthesis sample is accepted.', 'strategy-v2-muted')
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
    appendText(panel, 'p', 'Strategy Hub v2 can only render source-to-gap snapshots and strategy-marked review records until the next accepted hub slice changes that gate.', 'strategy-v2-muted')
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
