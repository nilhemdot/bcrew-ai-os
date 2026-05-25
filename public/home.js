var launcherSession = null

var launcherMotivations = [
  "Let's get after it.",
  'Another day to build.',
  'Make today count.',
  'Every deal matters.',
  'Energy over everything.',
  'Focus wins.',
  'Build. Ship. Win.',
  'Time to go.',
  'We work, it works.',
  'Today = momentum.',
  'Sold signs everywhere.',
  'Show up, suit up, win.',
  'Engine on.',
  'Push the system forward.',
  "One trunk. Eight hubs. Let's roll.",
]

var LAUNCHER_BHAG_DOC_ROUTE = '/api/doc?path=docs/strategy/bhag-model.md'
var LAUNCHER_ENGINE_DOC_ROUTE = '/api/doc?path=docs/strategy/agent-engine.md'
var LAUNCHER_SOURCE_OF_TRUTH_ROUTE = '/api/source-of-truth'
var LAUNCHER_SOURCE_LIFECYCLE_ROUTE = '/api/foundation/source-lifecycle'
var LAUNCHER_SOURCE_MATURITY_ROUTE = '/api/foundation/source-maturity-grid'
var LAUNCHER_CURRENT_SPRINT_ROUTE = '/api/foundation/current-sprint'
var LAUNCHER_SALES_ROUTE = '/api/sales-hub'
var LAUNCHER_OPS_ROUTE = '/api/ops-hub'

function launcherQuery(selector) {
  return document.querySelector(selector)
}

function launcherQueryAll(selector) {
  return Array.prototype.slice.call(document.querySelectorAll(selector))
}

function setText(selector, value) {
  var el = launcherQuery(selector)
  if (el) el.textContent = value
}

function getAdminHeaders() {
  try {
    var token = window.localStorage && window.localStorage.getItem('BCREW_ADMIN_TOKEN')
    return token ? { 'X-Admin-Token': token } : {}
  } catch (error) {
    return {}
  }
}

function fetchLauncherJson(route) {
  return fetch(route, { headers: getAdminHeaders(), cache: 'no-store' }).then(function(res) {
    if (!res.ok) throw new Error('Launcher truth fetch failed: ' + route)
    return res.json()
  })
}

function setLauncherSourceMeta(selector, route, sourceIds) {
  var el = launcherQuery(selector)
  if (!el) return
  el.dataset.sourceRoute = route || ''
  el.dataset.sourceId = Array.isArray(sourceIds) ? sourceIds.filter(Boolean).join(',') : String(sourceIds || '')
}

function clearElement(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild)
}

function setSourcedText(selector, value, route, sourceIds) {
  var el = launcherQuery(selector)
  if (!el) return
  el.textContent = value || 'Needs source'
  setLauncherSourceMeta(selector, route, sourceIds)
}

function setSourcedNumberWithTarget(selector, main, target, route, sourceIds) {
  var el = launcherQuery(selector)
  if (!el) return
  clearElement(el)
  el.appendChild(document.createTextNode(main || 'Needs source'))
  if (target) {
    var span = document.createElement('span')
    span.textContent = '/ ' + target
    el.appendChild(span)
  }
  setLauncherSourceMeta(selector, route, sourceIds)
}

function setHubWin(selector, parts, route, sourceIds) {
  var el = launcherQuery(selector)
  if (!el) return
  clearElement(el)
  ;(parts || ['Needs source']).forEach(function(part) {
    if (part && typeof part === 'object' && Object.prototype.hasOwnProperty.call(part, 'strong')) {
      var strong = document.createElement('b')
      strong.textContent = part.strong
      el.appendChild(strong)
      return
    }
    el.appendChild(document.createTextNode(String(part)))
  })
  setLauncherSourceMeta(selector, route, sourceIds)
}

function formatCount(value) {
  var number = Number(value)
  if (!Number.isFinite(number)) return ''
  return number.toLocaleString('en-US')
}

function cleanAgentCount(value) {
  return String(value || '').replace(/\s+agents?\b/i, '').trim()
}

function cleanPerMonth(value) {
  return String(value || '').replace(/\s*\/\s*mo\b/i, '').trim()
}

function normalizePerMonth(value) {
  return String(value || '').replace(/\s*\/\s*mo\b/i, '/mo').trim()
}

function parsePercent(value) {
  var match = String(value || '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function sourceRows(doc) {
  return Array.isArray(doc && doc.sourceSnapshot) ? doc.sourceSnapshot : []
}

function findSourceRow(doc, groupTitle, label) {
  return sourceRows(doc).find(function(row) {
    return row && row.groupTitle === groupTitle && row.label === label
  }) || null
}

function sourceIdsFromRows(rows) {
  return Array.from(new Set((rows || []).map(function(row) {
    return row && row.sourceId
  }).filter(Boolean)))
}

function firstFiniteValue(values) {
  for (var index = 0; index < values.length; index++) {
    var value = values[index]
    if (Number.isFinite(Number(value))) return value
  }
  return null
}

function setPace(selector, row, route) {
  var el = launcherQuery(selector)
  if (!el) return
  el.classList.remove('launcher-kpi-ahead', 'launcher-kpi-behind')
  if (!row || !row.value) {
    el.textContent = 'Needs source'
    return
  }
  el.textContent = row.value
  if (/ahead|above|strong/i.test(row.value)) el.classList.add('launcher-kpi-ahead')
  if (/behind|below|risk/i.test(row.value)) el.classList.add('launcher-kpi-behind')
  setLauncherSourceMeta(selector, route, row.sourceId)
}

function normalizeRole(role) {
  if (role === 'owner') return 'owner'
  if (role === 'sales') return 'sales'
  if (role === 'ops') return 'ops'
  return ''
}

function getAllowedHubs(role) {
  if (role === 'owner') {
    return ['foundation', 'strategy', 'marketing', 'sales', 'recruiting', 'retention', 'ops', 'dev', 'finance']
  }
  if (role === 'sales') return ['sales']
  if (role === 'ops') return ['sales', 'ops']
  return []
}

function getPrimaryRoute(role) {
  if (role === 'ops') return '/ops'
  if (role === 'sales') return '/sales'
  return '/foundation'
}

function getRoleLabel(user) {
  var role = normalizeRole(user && user.role)
  if (role === 'owner') return 'EXEC LEADERSHIP \u00b7 T1'
  if (role === 'sales') return 'SALES \u00b7 ACCESS'
  if (role === 'ops') return 'OPS \u00b7 ACCESS'
  return 'ACCESS'
}

function getAccessTag(user) {
  return normalizeRole(user && user.role) === 'owner' ? 'FULL ACCESS' : 'LIMITED ACCESS'
}

function getDisplayName(user) {
  if (user && user.name) return String(user.name).trim()
  if (user && user.email) return String(user.email).split('@')[0].replace(/[._-]+/g, ' ')
  return 'Crew'
}

function getFirstName(user) {
  var name = getDisplayName(user).trim()
  return name.split(/\s+/)[0] || 'Crew'
}

function getInitials(user) {
  var parts = getDisplayName(user).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '--'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function formatUserName(user) {
  return getDisplayName(user).toUpperCase()
}

function formatDateTime() {
  var now = new Date()
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(now)

  function get(type) {
    var part = parts.find(function(item) { return item.type === type })
    return part ? part.value : ''
  }

  return {
    date: get('day') + ' ' + get('month').toLowerCase() + ' ' + get('year'),
    time: get('hour') + ':' + get('minute') + ' ' + get('dayPeriod') + ' ' + get('timeZoneName'),
  }
}

function getTorontoHour() {
  var value = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    hour12: false,
  }).format(new Date())
  return parseInt(value, 10)
}

function getGreeting() {
  var hour = getTorontoHour()
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  if (hour >= 22 || hour < 5) return 'Late shift'
  return 'Good morning'
}

function setRotatingMotivation() {
  var motivation = launcherQuery('#launcher-motivation')
  if (!motivation || !launcherMotivations.length) return
  motivation.textContent = launcherMotivations[Math.floor(Math.random() * launcherMotivations.length)]
}

function tickLauncherTime() {
  var clock = launcherQuery('#launcher-clock')
  var greeting = launcherQuery('#launcher-greeting')
  var formatted = formatDateTime()
  if (clock) clock.innerHTML = formatted.date + ' <b>&middot; ' + formatted.time + '</b>'
  if (greeting) greeting.textContent = getGreeting()
}

function setPrimaryAction(user) {
  var action = launcherQuery('#launcher-primary-action')
  if (!action) return
  var role = normalizeRole(user && user.role)
  action.href = getPrimaryRoute(role)
  if (role === 'owner') {
    action.innerHTML = 'Open Foundation <span aria-hidden="true">&rarr;</span>'
    return
  }
  if (role === 'sales') {
    action.innerHTML = 'Open Sales Hub <span aria-hidden="true">&rarr;</span>'
    return
  }
  if (role === 'ops') {
    action.innerHTML = 'Open Ops Hub <span aria-hidden="true">&rarr;</span>'
    return
  }
  action.innerHTML = 'Open your hub <span aria-hidden="true">&rarr;</span>'
}

function updateUserChrome(user) {
  setText('#launcher-avatar', getInitials(user))
  setText('#launcher-user-name', formatUserName(user))
  setText('#launcher-user-role', getRoleLabel(user))
  setText('#launcher-first-name', getFirstName(user))
  setPrimaryAction(user)
}

function updateAccessSummary(user, allowedCount) {
  var tag = launcherQuery('#launcher-access-tag')
  var summary = launcherQuery('#launcher-hubs-summary')
  var accessLabel = getAccessTag(user)
  var role = normalizeRole(user && user.role)
  var stationLabel = role === 'owner' ? 'all stations available' : 'assigned stations only'

  if (tag) {
    tag.textContent = accessLabel
    tag.classList.toggle('launcher-limited', accessLabel !== 'FULL ACCESS')
  }

  if (summary) {
    summary.textContent = stationLabel + ' \u00b7 viewing as ' + getFirstName(user) + ' \u00b7 ' + getRoleLabel(user).replace(' \u00b7 ', ' / ')
  }
}

function setRouteCardLocked(card, locked) {
  if (!card.dataset.originalHref) card.dataset.originalHref = card.getAttribute('href') || '#'

  card.classList.toggle('launcher-route-locked', locked)
  card.setAttribute('aria-disabled', locked ? 'true' : 'false')
  if (locked) {
    card.setAttribute('href', '#')
    return
  }

  if (card.dataset.routeEnabled === 'true') {
    card.setAttribute('href', card.dataset.originalHref)
  } else {
    card.setAttribute('href', '#')
  }
}

function applyHubAccess(user) {
  var role = normalizeRole(user && user.role)
  var allowed = getAllowedHubs(role)
  var gridAllowedCount = 0

  launcherQueryAll('.launcher-route-card[data-hub]').forEach(function(card) {
    var hub = card.getAttribute('data-hub')
    var isAllowed = allowed.indexOf(hub) !== -1
    var routeEnabled = card.dataset.routeEnabled === 'true'
    if (isAllowed && hub !== 'foundation') gridAllowedCount++
    setRouteCardLocked(card, !isAllowed)
    card.classList.toggle('launcher-route-unavailable', isAllowed && !routeEnabled)
  })

  updateAccessSummary(user, gridAllowedCount)
}

function nudgeCard(card) {
  card.classList.remove('launcher-card-nudge')
  window.requestAnimationFrame(function() {
    card.classList.add('launcher-card-nudge')
    window.setTimeout(function() {
      card.classList.remove('launcher-card-nudge')
    }, 260)
  })
}

function handleRouteCardClick(event) {
  var card = event.target.closest && event.target.closest('.launcher-route-card')
  if (!card) return
  var locked = card.classList.contains('launcher-route-locked')
  var unavailable = card.dataset.routeEnabled !== 'true'
  if (!locked && !unavailable) return
  event.preventDefault()
  nudgeCard(card)
}

function setAccountMenuOpen(open) {
  var button = launcherQuery('#launcher-user-button')
  var menu = launcherQuery('#launcher-account-menu')
  if (!button || !menu) return
  button.setAttribute('aria-expanded', open ? 'true' : 'false')
  menu.hidden = !open
}

function toggleAccountMenu() {
  var button = launcherQuery('#launcher-user-button')
  if (!button) return
  setAccountMenuOpen(button.getAttribute('aria-expanded') !== 'true')
}

function handleAccountMenuDocumentClick(event) {
  var wrap = launcherQuery('#launcher-user')
  if (!wrap || wrap.contains(event.target)) return
  setAccountMenuOpen(false)
}

function handleAccountMenuKeydown(event) {
  if (event.key === 'Escape') setAccountMenuOpen(false)
}

function logoutLauncherUser() {
  var button = launcherQuery('#launcher-logout')
  if (button) {
    button.disabled = true
    button.textContent = 'Logging out...'
  }

  fetch('/api/auth/logout', {
    method: 'POST',
    headers: getAdminHeaders(),
    cache: 'no-store',
  })
    .then(function() {
      window.location.assign('/login?next=/')
    })
    .catch(function() {
      if (button) {
        button.disabled = false
        button.textContent = 'Log out'
      }
    })
}

function gradeFromScore(score) {
  var value = Number(score)
  if (!Number.isFinite(value)) return 'Needs'
  if (value >= 90) return 'A'
  if (value >= 80) return 'A-'
  if (value >= 73) return 'B+'
  if (value >= 66) return 'B'
  if (value >= 60) return 'C'
  return 'Watch'
}

function setFoundationStat(selector, main, unit, route, sourceIds) {
  var el = launcherQuery(selector)
  if (!el) return
  clearElement(el)
  el.appendChild(document.createTextNode(String(main)))
  var span = document.createElement('span')
  span.textContent = String(unit)
  el.appendChild(span)
  setLauncherSourceMeta(selector, route, sourceIds)
}

function populateFoundationStats(sourceTruth, lifecycle, maturityGrid) {
  var sourceSummary = sourceTruth && sourceTruth.sourceLayerStatus
    ? sourceTruth.sourceLayerStatus.summary || {}
    : {}
  var trustSummary = sourceTruth && sourceTruth.sourceTrustScoring
    ? sourceTruth.sourceTrustScoring.summary || {}
    : {}
  var lifecycleSummary = lifecycle && lifecycle.summary ? lifecycle.summary : {}
  var maturitySummary = maturityGrid && maturityGrid.summary ? maturityGrid.summary : {}

  var sourceCount = sourceSummary.sourceCount || trustSummary.sourceCount || 0
  var systemCount = lifecycleSummary.groupedSystemCount || sourceSummary.groupedSystemCount || 0
  var score = trustSummary.averageScore
  var completeSources = maturitySummary.completeSources
  var gapSources = maturitySummary.gapSources
  var laneCount = lifecycleSummary.laneCount

  if (sourceCount) setFoundationStat('#launcher-source-count', sourceCount, 'sources', LAUNCHER_SOURCE_OF_TRUTH_ROUTE, 'sourceLayerStatus.summary.sourceCount')
  if (systemCount) setFoundationStat('#launcher-system-count', systemCount, 'systems', LAUNCHER_SOURCE_LIFECYCLE_ROUTE, 'summary.groupedSystemCount')
  setFoundationStat('#launcher-trust-grade', gradeFromScore(score), 'grade', LAUNCHER_SOURCE_OF_TRUTH_ROUTE, 'sourceTrustScoring.summary.averageScore')
  if (Number.isFinite(Number(completeSources))) {
    setFoundationStat('#launcher-cascade-age', completeSources, 'complete', LAUNCHER_SOURCE_MATURITY_ROUTE, 'summary.completeSources')
  }

  var statusSummary = launcherQuery('#launcher-hubs-summary')
  if (
    statusSummary &&
    launcherSession &&
    normalizeRole(launcherSession.user && launcherSession.user.role) === 'owner' &&
    sourceCount &&
    Number.isFinite(Number(laneCount)) &&
    Number.isFinite(Number(gapSources))
  ) {
    statusSummary.textContent = sourceCount + ' sources \u00b7 ' + laneCount + ' lifecycle lanes \u00b7 ' + gapSources + ' maturity gaps'
    statusSummary.dataset.sourceRoute = [LAUNCHER_SOURCE_OF_TRUTH_ROUTE, LAUNCHER_SOURCE_LIFECYCLE_ROUTE, LAUNCHER_SOURCE_MATURITY_ROUTE].join(',')
    statusSummary.dataset.sourceId = 'sourceLayerStatus.summary.sourceCount,summary.laneCount,summary.gapSources'
  }
}

function fetchFoundationStatsIfAllowed(user) {
  if (normalizeRole(user && user.role) !== 'owner') return

  Promise.all([
    fetchLauncherJson(LAUNCHER_SOURCE_OF_TRUTH_ROUTE),
    fetchLauncherJson(LAUNCHER_SOURCE_LIFECYCLE_ROUTE),
    fetchLauncherJson(LAUNCHER_SOURCE_MATURITY_ROUTE),
  ])
    .then(function(results) {
      populateFoundationStats(results[0], results[1], results[2])
    })
    .catch(function() {
      setFoundationStat('#launcher-cascade-age', 'Needs', 'source')
    })
}

function populateStrategySnapshots(bhagDoc, engineDoc) {
  var teamCurrent = findSourceRow(engineDoc, 'Current Requirement', 'Current Active Agents')
  var teamTarget = findSourceRow(engineDoc, 'Current Requirement', 'Required Agents This Year')
  var teamPace = findSourceRow(engineDoc, 'Current Requirement', 'Gap This Year')
  var requiredRecruitingPace = findSourceRow(engineDoc, 'Current Requirement', 'Required Recruiting Pace')
  var currentRecruitingPace = findSourceRow(engineDoc, 'Current Requirement', 'Current Recruiting Pace')

  var communityCurrent = findSourceRow(bhagDoc, 'Community Goal: 10,000 Agents', 'Actual')
  var communityTarget = findSourceRow(bhagDoc, 'Community Goal: 10,000 Agents', '2026')
  var communityPace = findSourceRow(bhagDoc, 'Community Goal: 10,000 Agents', 'Pace')

  var growCurrent = findSourceRow(engineDoc, 'Current Requirement', 'Current Avg Production / Agent')
  var growTarget = findSourceRow(engineDoc, 'Current Requirement', 'Production Target / Agent')
  var growPace = findSourceRow(engineDoc, 'Current Requirement', 'Production Gap')

  var liveAttrition = findSourceRow(engineDoc, 'Current Requirement', 'Live Attrition Pressure')
  var planningAttrition = findSourceRow(engineDoc, 'Current Requirement', 'Planning Attrition Assumption')
  var avgAttrition = findSourceRow(engineDoc, 'Current Requirement', 'Avg Attrition / Month')

  if (teamCurrent && teamTarget) {
    setSourcedNumberWithTarget(
      '#launcher-attract-team-number',
      cleanAgentCount(teamCurrent.value),
      cleanAgentCount(teamTarget.value),
      LAUNCHER_ENGINE_DOC_ROUTE,
      sourceIdsFromRows([teamCurrent, teamTarget])
    )
  }
  setPace('#launcher-attract-team-pace', teamPace, LAUNCHER_ENGINE_DOC_ROUTE)

  if (communityCurrent && communityTarget) {
    setSourcedNumberWithTarget(
      '#launcher-attract-community-number',
      cleanAgentCount(communityCurrent.value),
      cleanAgentCount(communityTarget.value),
      LAUNCHER_BHAG_DOC_ROUTE,
      sourceIdsFromRows([communityCurrent, communityTarget])
    )
  }
  setPace('#launcher-attract-community-pace', communityPace, LAUNCHER_BHAG_DOC_ROUTE)

  if (requiredRecruitingPace) {
    setSourcedText(
      '#launcher-attract-foot',
      'Required pace: ' + normalizePerMonth(requiredRecruitingPace.value) + ' net adds.',
      LAUNCHER_ENGINE_DOC_ROUTE,
      requiredRecruitingPace.sourceId
    )
  }

  if (growCurrent && growTarget) {
    setSourcedNumberWithTarget(
      '#launcher-grow-number',
      cleanPerMonth(growCurrent.value),
      cleanPerMonth(growTarget.value),
      LAUNCHER_ENGINE_DOC_ROUTE,
      sourceIdsFromRows([growCurrent, growTarget])
    )
  }
  setPace('#launcher-grow-pace', growPace, LAUNCHER_ENGINE_DOC_ROUTE)
  setSourcedText(
    '#launcher-grow-foot',
    'Live Agent Engine production vs BHAG target.',
    LAUNCHER_ENGINE_DOC_ROUTE,
    sourceIdsFromRows([growCurrent, growTarget])
  )

  if (liveAttrition) {
    setSourcedNumberWithTarget('#launcher-retain-number', liveAttrition.value, '', LAUNCHER_ENGINE_DOC_ROUTE, liveAttrition.sourceId)
  }
  if (planningAttrition) {
    var liveValue = parsePercent(liveAttrition && liveAttrition.value)
    var planningValue = parsePercent(planningAttrition.value)
    setSourcedText('#launcher-retain-pace', 'Planning assumption ' + planningAttrition.value, LAUNCHER_ENGINE_DOC_ROUTE, planningAttrition.sourceId)
    var retainPace = launcherQuery('#launcher-retain-pace')
    if (retainPace && Number.isFinite(liveValue) && Number.isFinite(planningValue)) {
      retainPace.classList.remove('launcher-kpi-ahead', 'launcher-kpi-behind')
      retainPace.classList.add(liveValue <= planningValue ? 'launcher-kpi-ahead' : 'launcher-kpi-behind')
    }
  }
  if (avgAttrition) {
    setSourcedText('#launcher-retain-foot', 'Avg attrition: ' + normalizePerMonth(avgAttrition.value) + '.', LAUNCHER_ENGINE_DOC_ROUTE, avgAttrition.sourceId)
  }

  if (requiredRecruitingPace && currentRecruitingPace) {
    setHubWin(
      '#launcher-recruiting-win',
      [
        { strong: normalizePerMonth(requiredRecruitingPace.value) },
        ' required \u00b7 ',
        { strong: normalizePerMonth(currentRecruitingPace.value) },
        ' current',
      ],
      LAUNCHER_ENGINE_DOC_ROUTE,
      sourceIdsFromRows([requiredRecruitingPace, currentRecruitingPace])
    )
  }

  if (liveAttrition && avgAttrition) {
    setHubWin(
      '#launcher-retention-win',
      [
        { strong: liveAttrition.value },
        ' attrition \u00b7 ',
        { strong: normalizePerMonth(avgAttrition.value) },
        ' avg',
      ],
      LAUNCHER_ENGINE_DOC_ROUTE,
      sourceIdsFromRows([liveAttrition, avgAttrition])
    )
  }
}

function fetchStrategySnapshotsIfAllowed(user) {
  if (normalizeRole(user && user.role) !== 'owner') return
  Promise.all([
    fetchLauncherJson(LAUNCHER_BHAG_DOC_ROUTE),
    fetchLauncherJson(LAUNCHER_ENGINE_DOC_ROUTE),
  ])
    .then(function(results) {
      populateStrategySnapshots(results[0], results[1])
    })
    .catch(function() {})
}

function fetchDevCardIfAllowed(user) {
  if (normalizeRole(user && user.role) !== 'owner') return
  fetchLauncherJson(LAUNCHER_CURRENT_SPRINT_ROUTE)
    .then(function(data) {
      var summary = data && data.currentSprint ? data.currentSprint.summary || {} : {}
      if (!Number.isFinite(Number(summary.itemCount)) || !Number.isFinite(Number(summary.doneThisSprintCount))) return
      setHubWin(
        '#launcher-dev-win',
        [
          { strong: formatCount(summary.itemCount) },
          ' cards \u00b7 ',
          { strong: formatCount(summary.doneThisSprintCount) },
          ' done',
        ],
        LAUNCHER_CURRENT_SPRINT_ROUTE,
        'currentSprint.summary'
      )
    })
    .catch(function() {})
}

function fetchSalesCardIfAllowed(user) {
  var role = normalizeRole(user && user.role)
  if (['owner', 'sales', 'ops'].indexOf(role) === -1) return
  fetchLauncherJson(LAUNCHER_SALES_ROUTE)
    .then(function(data) {
      var listingInventory = data && (data.listingInventory || (data.hub && data.hub.listingInventory))
      var summary = listingInventory && listingInventory.summary ? listingInventory.summary : {}
      var activeCases = firstFiniteValue([summary.activePipelineCases, summary.currentActiveGlsCases])
      var soldCases = summary.allTimeSoldCases
      if (!Number.isFinite(Number(activeCases)) || !Number.isFinite(Number(soldCases))) return
      setHubWin(
        '#launcher-sales-win',
        [
          { strong: formatCount(activeCases) },
          ' active cases \u00b7 ',
          { strong: formatCount(soldCases) },
          ' sold',
        ],
        LAUNCHER_SALES_ROUTE,
        data && data.meta ? data.meta.sourceId : 'SRC-CLICKUP-001'
      )
    })
    .catch(function() {})
}

function fetchOpsCardIfAllowed(user) {
  var role = normalizeRole(user && user.role)
  if (['owner', 'ops'].indexOf(role) === -1) return
  fetchLauncherJson(LAUNCHER_OPS_ROUTE)
    .then(function(data) {
      var jobs = data && data.foundationJobs ? data.foundationJobs : {}
      if (!Number.isFinite(Number(jobs.enabledJobs)) || !Number.isFinite(Number(jobs.dueJobs))) return
      setHubWin(
        '#launcher-ops-win',
        [
          { strong: formatCount(jobs.enabledJobs) },
          ' jobs \u00b7 ',
          { strong: formatCount(jobs.dueJobs) },
          ' due',
        ],
        LAUNCHER_OPS_ROUTE,
        'foundationJobs'
      )
    })
    .catch(function() {})
}

function fetchLauncherTruth(user) {
  fetchFoundationStatsIfAllowed(user)
  fetchStrategySnapshotsIfAllowed(user)
  fetchDevCardIfAllowed(user)
  fetchSalesCardIfAllowed(user)
  fetchOpsCardIfAllowed(user)
}

function bootLauncherSession() {
  fetch('/api/auth/session', { cache: 'no-store' })
    .then(function(res) {
      if (!res.ok) throw new Error('Session fetch failed.')
      return res.json()
    })
    .then(function(session) {
      launcherSession = session || null
      var user = session && session.user ? session.user : null
      if (!session || !session.authenticated || !user) {
        window.location.assign('/login?next=/')
        return
      }
      updateUserChrome(user)
      applyHubAccess(user)
      fetchLauncherTruth(user)
    })
    .catch(function() {
      applyHubAccess(null)
      setText('#launcher-user-name', 'SIGNED OUT')
      setText('#launcher-user-role', 'LOGIN REQUIRED')
    })
}

document.addEventListener('DOMContentLoaded', function() {
  setRotatingMotivation()
  tickLauncherTime()
  window.setInterval(tickLauncherTime, 60000)
  document.addEventListener('click', handleRouteCardClick)
  document.addEventListener('click', handleAccountMenuDocumentClick)
  document.addEventListener('keydown', handleAccountMenuKeydown)
  var userButton = launcherQuery('#launcher-user-button')
  var logoutButton = launcherQuery('#launcher-logout')
  if (userButton) userButton.addEventListener('click', toggleAccountMenu)
  if (logoutButton) logoutButton.addEventListener('click', logoutLauncherUser)
  bootLauncherSession()
})
