var launcherSession = null

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
    action.innerHTML = '7 calls waiting on you <span aria-hidden="true">&rarr;</span>'
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
  var count = Number.isFinite(allowedCount) ? allowedCount : getAllowedHubs(role).filter(function(hub) {
    return hub !== 'foundation'
  }).length

  if (tag) {
    tag.textContent = accessLabel
    tag.classList.toggle('launcher-limited', accessLabel !== 'FULL ACCESS')
  }

  if (summary) {
    summary.textContent = 'showing ' + count + ' of 8 \u00b7 viewing as ' + getFirstName(user) + ' \u00b7 ' + getRoleLabel(user).replace(' \u00b7 ', ' / ')
  }
}

function setRouteCardLocked(card, locked) {
  var status = card.querySelector('.launcher-hub-status')
  if (!card.dataset.originalHref) card.dataset.originalHref = card.getAttribute('href') || '#'

  card.classList.toggle('launcher-route-locked', locked)
  card.setAttribute('aria-disabled', locked ? 'true' : 'false')
  if (locked) {
    card.setAttribute('href', '#')
    if (status) {
      if (!status.dataset.originalText) status.dataset.originalText = status.textContent
      status.textContent = 'LOCKED'
    }
    return
  }

  if (status && status.dataset.originalText) status.textContent = status.dataset.originalText
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

function gradeFromScore(score) {
  var value = Number(score)
  if (!Number.isFinite(value)) return 'B+'
  if (value >= 90) return 'A'
  if (value >= 80) return 'A-'
  if (value >= 73) return 'B+'
  if (value >= 66) return 'B'
  if (value >= 60) return 'C'
  return 'Watch'
}

function setFoundationStat(selector, main, unit) {
  var el = launcherQuery(selector)
  if (!el) return
  el.innerHTML = String(main) + '<span>' + String(unit) + '</span>'
}

function populateSourceStatus(data) {
  if (!data || typeof data !== 'object') return

  var sources = Array.isArray(data.sources) ? data.sources : []
  var systems = Array.isArray(data.groupedSystems) ? data.groupedSystems : []
  var systemStatus = Array.isArray(data.systemStatus) ? data.systemStatus : []
  var liveStatusCount = systemStatus.filter(function(item) {
    return item && (item.status === 'connected' || item.status === 'live')
  }).length
  var pendingCount = systemStatus.filter(function(item) {
    return item && item.status === 'pending'
  }).length
  var score = data.sourceTrustScoring && data.sourceTrustScoring.summary
    ? data.sourceTrustScoring.summary.averageScore
    : null

  if (sources.length) setFoundationStat('#launcher-source-count', sources.length, 'items')
  if (systems.length) setFoundationStat('#launcher-system-count', systems.length, 'live')
  setFoundationStat('#launcher-trust-grade', gradeFromScore(score), 'grade')
  if (liveStatusCount) setFoundationStat('#launcher-cascade-age', liveStatusCount + '/' + systemStatus.length, 'live')

  var statusSummary = launcherQuery('#launcher-hubs-summary')
  if (statusSummary && launcherSession && normalizeRole(launcherSession.user && launcherSession.user.role) === 'owner') {
    statusSummary.textContent = 'showing 8 of 8 \u00b7 ' + liveStatusCount + ' live layers \u00b7 ' + pendingCount + ' pending'
  }
}

function fetchSourceStatusIfAllowed(user) {
  if (normalizeRole(user && user.role) !== 'owner') return

  fetch('/api/source-of-truth', { headers: getAdminHeaders(), cache: 'no-store' })
    .then(function(res) {
      if (!res.ok) throw new Error('Source status fetch failed.')
      return res.json()
    })
    .then(populateSourceStatus)
    .catch(function() {
      setFoundationStat('#launcher-cascade-age', 'Live', 'now')
    })
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
      fetchSourceStatusIfAllowed(user)
    })
    .catch(function() {
      applyHubAccess(null)
      setText('#launcher-user-name', 'SIGNED OUT')
      setText('#launcher-user-role', 'LOGIN REQUIRED')
    })
}

document.addEventListener('DOMContentLoaded', function() {
  tickLauncherTime()
  window.setInterval(tickLauncherTime, 60000)
  document.addEventListener('click', handleRouteCardClick)
  bootLauncherSession()
})
