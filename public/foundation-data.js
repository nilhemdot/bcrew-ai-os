/* Foundation data/cache helpers extracted from public/foundation.js. */

/* ── data cache ──────────────────────────────────────────── */

var cache = {
  sourceOfTruth: null,
  foundationHub: null,
  foundationBacklog: null,
  foundationBacklogDoneArchive: null,
  foundationOperatorPulse: null,
  currentSprint: null,
  actionReview: null,
  actionRouteReviewInbox: null,
  systemInventory: null,
  buildLog: null,
  changeLog: null,
  dailySummary: {},
  sourceLifecycle: null,
  sheetStructureStatus: null,
  fubLeadSources: {},
  ownersLeadSourceGovernance: null,
  ownersReviewQueue: null,
  docs: {},
}
var FOUNDATION_ADMIN_TOKEN_KEY = 'BCREW_ADMIN_TOKEN'
var LEGACY_FOUNDATION_ADMIN_TOKEN_KEY = 'bcrew.foundation.adminToken'

var liveDocPaths = {
  'docs/strategy/bhag-model.md': true,
  'docs/strategy/agent-engine.md': true,
}

var strategyPacketDocPaths = [
  'docs/business-strategy.md',
  'docs/strategy/bhag-model.md',
  'docs/strategy/agent-engine.md',
  'docs/strategy/core-values.md',
  'docs/strategy/department-mandates.md',
  'docs/strategy/marketmasters.md',
  'docs/strategy/governance.md',
]

function isLiveDocPath(docPath) {
  return !!liveDocPaths[docPath]
}

function isStrategyPacketDocPath(docPath) {
  return strategyPacketDocPaths.indexOf(docPath) !== -1
}

function fetchSourceOfTruth() {
  if (cache.sourceOfTruth) return Promise.resolve(cache.sourceOfTruth)

  return foundationRead('/api/source-of-truth').then(function(res) {
    if (!res.ok) throw new Error('Source of truth API failed.')
    return res.json()
  }).then(function(data) {
    cache.sourceOfTruth = data
    return data
  })
}

function fetchFoundationHub() {
  if (cache.foundationHub) return Promise.resolve(cache.foundationHub)

  return foundationRead('/api/foundation-hub').then(function(res) {
    if (!res.ok) throw new Error('Foundation hub API failed.')
    return res.json()
  }).then(function(data) {
    cache.foundationHub = data
    return data
  })
}

function fetchFoundationHubFull() {
  return foundationRead('/api/foundation-hub?view=full').then(function(res) {
    if (!res.ok) throw new Error('Foundation hub full diagnostic API failed.')
    return res.json()
  })
}

function fetchFoundationBacklog(options) {
  var ids = options && Array.isArray(options.ids) ? options.ids.filter(Boolean) : []
  if (!ids.length && cache.foundationBacklog) return Promise.resolve(cache.foundationBacklog)

  var path = '/api/foundation/backlog'
  if (ids.length) {
    path += '?ids=' + encodeURIComponent(ids.join(','))
  }
  return foundationRead(path).then(function(res) {
    if (!res.ok) throw new Error('Foundation backlog API failed.')
    return res.json()
  }).then(function(data) {
    if (!ids.length) cache.foundationBacklog = data
    return data
  })
}

function fetchFoundationBacklogDoneArchive() {
  if (cache.foundationBacklogDoneArchive) return Promise.resolve(cache.foundationBacklogDoneArchive)

  return foundationRead('/api/foundation/backlog/done-archive').then(function(res) {
    if (!res.ok) throw new Error('Foundation done archive API failed.')
    return res.json()
  }).then(function(data) {
    cache.foundationBacklogDoneArchive = data
    return data
  })
}

function fetchFoundationOperatorPulse() {
  if (cache.foundationOperatorPulse) return Promise.resolve(cache.foundationOperatorPulse)

  return foundationRead('/api/foundation/operator-pulse').then(function(res) {
    if (!res.ok) throw new Error('Foundation operator pulse API failed.')
    return res.json()
  }).then(function(data) {
    cache.foundationOperatorPulse = data
    return data
  })
}

function fetchFoundationCurrentSprint() {
  if (cache.currentSprint) return Promise.resolve(cache.currentSprint)

  return foundationRead('/api/foundation/current-sprint').then(function(res) {
    if (!res.ok) throw new Error('Foundation current sprint API failed.')
    return res.json()
  }).then(function(data) {
    cache.currentSprint = data
    return data
  })
}

function fetchActionReview() {
  if (cache.actionReview) return Promise.resolve(cache.actionReview)

  return foundationRead('/api/foundation/action-review').then(function(res) {
    if (!res.ok) {
      return res.json().catch(function() { return null }).then(function(payload) {
        throw parseApiErrorPayload(payload, 'Action Review failed to load.')
      })
    }
    return res.json()
  }).then(function(data) {
    cache.actionReview = data
    return data
  })
}

function fetchActionRouteReviewInbox() {
  if (cache.actionRouteReviewInbox) return Promise.resolve(cache.actionRouteReviewInbox)

  return foundationRead('/api/foundation/action-route-review-inbox').then(function(res) {
    if (!res.ok) {
      return res.json().catch(function() { return null }).then(function(payload) {
        throw parseApiErrorPayload(payload, 'Action Route Review Inbox failed to load.')
      })
    }
    return res.json()
  }).then(function(data) {
    cache.actionRouteReviewInbox = data
    return data
  })
}

function applyActionRoutePromotionWorkflow(routeId, body) {
  return foundationMutation('/api/foundation/action-route-review-inbox/' + encodeURIComponent(routeId) + '/workflow', 'POST', body)
    .then(function(payload) {
      cache.actionRouteReviewInbox = payload.actionRouteReviewInbox || null
      return payload
    })
}

function fetchSystemInventory() {
  if (cache.systemInventory) return Promise.resolve(cache.systemInventory)

  return foundationRead('/api/system-inventory').then(function(res) {
    if (!res.ok) throw new Error('System inventory API failed.')
    return res.json()
  }).then(function(data) {
    cache.systemInventory = data
    return data
  })
}

function fetchFoundationBuildLog() {
  if (cache.buildLog) return Promise.resolve(cache.buildLog)

  return foundationRead('/api/foundation/build-log?limit=60').then(function(res) {
    if (!res.ok) throw new Error('Foundation build log API failed.')
    return res.json()
  }).then(function(data) {
    cache.buildLog = data
    return data
  })
}

function fetchFoundationChangeLog() {
  if (cache.changeLog) return Promise.resolve(cache.changeLog)

  return foundationRead('/api/foundation/change-log?limit=100').then(function(res) {
    if (!res.ok) throw new Error('Foundation change log API failed.')
    return res.json()
  }).then(function(data) {
    cache.changeLog = data
    return data
  })
}

function getDailySummaryDate() {
  var focus = getSectionFocus()
  if (/^\d{4}-\d{2}-\d{2}$/.test(focus)) return focus
  return ''
}

function fetchFoundationDailySummary(date) {
  var key = date || 'today'
  if (cache.dailySummary[key]) return Promise.resolve(cache.dailySummary[key])

  var path = '/api/foundation/daily-summary?days=7'
  if (date) path += '&date=' + encodeURIComponent(date)
  return foundationRead(path).then(function(res) {
    if (!res.ok) throw new Error('Foundation daily summary API failed.')
    return res.json()
  }).then(function(data) {
    cache.dailySummary[key] = data
    return data
  })
}

function fetchSourceLifecycle() {
  if (cache.sourceLifecycle) return Promise.resolve(cache.sourceLifecycle)

  return foundationRead('/api/foundation/source-lifecycle').then(function(res) {
    if (!res.ok) throw new Error('Foundation source lifecycle API failed.')
    return res.json()
  }).then(function(data) {
    cache.sourceLifecycle = data
    return data
  })
}

function fetchFubLeadSources(contextKey) {
  var key = contextKey || 'owner'
  if (cache.fubLeadSources[key]) return Promise.resolve(cache.fubLeadSources[key])

  return foundationRead('/api/fub/lead-sources?context=' + encodeURIComponent(key)).then(function(res) {
    if (!res.ok) throw new Error('FUB lead-source API failed.')
    return res.json()
  }).then(function(data) {
    cache.fubLeadSources[key] = data
    return data
  })
}

function fetchOwnersLeadSourceGovernance() {
  if (cache.ownersLeadSourceGovernance) return Promise.resolve(cache.ownersLeadSourceGovernance)

  return foundationRead('/api/owners/lead-source-governance').then(function(res) {
    if (!res.ok) throw new Error('Owners lead-source governance API failed.')
    return res.json()
  }).then(function(data) {
    cache.ownersLeadSourceGovernance = data
    return data
  })
}

function fetchOwnersReviewQueue() {
  if (cache.ownersReviewQueue) return Promise.resolve(cache.ownersReviewQueue)

  return foundationRead('/api/owners/review-queue').then(function(res) {
    if (!res.ok) throw new Error('Owners review queue API failed.')
    return res.json()
  }).then(function(data) {
    cache.ownersReviewQueue = data
    return data
  })
}

function fetchSheetStructureStatus() {
  if (cache.sheetStructureStatus) return Promise.resolve(cache.sheetStructureStatus)

  return foundationRead('/api/sheets/structure-status').then(function(res) {
    if (!res.ok) throw new Error('Sheet structure status API failed.')
    return res.json()
  }).then(function(data) {
    cache.sheetStructureStatus = data
    return data
  })
}

function refreshFubLeadSources(contextKey) {
  var key = contextKey || 'owner'
  return foundationMutation('/api/fub/lead-sources/refresh', 'POST', {
    context: key,
  }).then(function(data) {
    cache.fubLeadSources[key] = data
    return data
  })
}

function fetchDoc(docPath) {
  if (!isLiveDocPath(docPath) && cache.docs[docPath]) return Promise.resolve(cache.docs[docPath])

  var requestUrl = '/api/doc?path=' + encodeURIComponent(docPath)
  var requestOptions = {}

  if (isLiveDocPath(docPath)) {
    requestUrl += '&_ts=' + Date.now()
    requestOptions.cache = 'no-store'
  }

  return foundationRead(requestUrl, requestOptions).then(function(res) {
    if (!res.ok) throw new Error('Document failed to load.')
    return res.json()
  }).then(function(data) {
    if (!isLiveDocPath(docPath)) cache.docs[docPath] = data
    return data
  })
}

function getStoredAdminToken() {
  try {
    return window.localStorage.getItem(FOUNDATION_ADMIN_TOKEN_KEY) ||
      window.localStorage.getItem(LEGACY_FOUNDATION_ADMIN_TOKEN_KEY) ||
      ''
  } catch {
    return ''
  }
}

function setStoredAdminToken(value) {
  try {
    window.localStorage.removeItem(LEGACY_FOUNDATION_ADMIN_TOKEN_KEY)
    if (!value) window.localStorage.removeItem(FOUNDATION_ADMIN_TOKEN_KEY)
    else window.localStorage.setItem(FOUNDATION_ADMIN_TOKEN_KEY, value)
  } catch {
    // Ignore storage failures and let the request fail visibly.
  }
}

function clearFoundationCaches() {
  cache.sourceOfTruth = null
  cache.foundationHub = null
  cache.actionReview = null
  cache.actionRouteReviewInbox = null
  cache.systemInventory = null
  cache.fubLeadSources = {}
  cache.sourceLifecycle = null
  cache.ownersLeadSourceGovernance = null
  cache.ownersReviewQueue = null
}

function parseApiErrorPayload(payload, fallbackMessage) {
  if (payload && payload.error && payload.error.message) return payload.error
  return { code: 'unknown_error', message: fallbackMessage || 'Request failed.' }
}

function foundationRead(url, options) {
  var requestOptions = Object.assign({}, options || {})
  var headers = Object.assign({}, requestOptions.headers || {})
  var token = getStoredAdminToken()
  if (token) headers['X-Admin-Token'] = token
  requestOptions.headers = headers
  return fetch(url, requestOptions)
}

function downloadStrategyPdf() {
  foundationRead('/foundation/export/strategy.pdf').then(function(res) {
    if (!res.ok) throw new Error('Strategy PDF failed.')
    return res.blob()
  }).then(function(blob) {
    var blobUrl = URL.createObjectURL(blob)
    var link = document.createElement('a')
    link.href = blobUrl
    link.download = 'benson-crew-business-strategy.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }).catch(function(error) {
    window.alert(error.message || 'Strategy PDF failed.')
  })
}

function foundationMutation(url, method, body) {
  return fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': getStoredAdminToken(),
    },
    body: JSON.stringify(body || {}),
  }).then(function(res) {
    return res.json().catch(function() { return null }).then(function(payload) {
      if (!res.ok) {
        throw parseApiErrorPayload(payload, 'Request failed.')
      }
      clearFoundationCaches()
      return payload
    })
  })
}

function controlFoundationJob(job, action, button) {
  var runtimeMode = action === 'pause'
    ? 'paused'
    : (job.scheduleEveryMinutes ? 'scheduled' : 'manual')
  var pauseReason = action === 'pause'
    ? 'Paused from Foundation dashboard.'
    : ''

  if (button) {
    button.disabled = true
    button.textContent = action === 'pause' ? 'Pausing...' : 'Resuming...'
  }

  return foundationMutation('/api/foundation/jobs/' + encodeURIComponent(job.key) + '/control', 'POST', {
    runtimeMode: runtimeMode,
    enabled: true,
    scheduleEveryMinutes: job.scheduleEveryMinutes || null,
    pauseReason: pauseReason,
    actor: 'foundation-dashboard',
  }).then(function() {
    cache.foundationHub = null
    renderDataHealth()
  }).catch(function(error) {
    window.alert('Job control failed: ' + (error.message || 'Unknown error'))
    if (button) {
      button.disabled = false
      button.textContent = action === 'pause' ? 'Pause' : 'Resume'
    }
  })
}

function stopFoundationJobRun(run, button) {
  if (!run || !run.runId) return
  if (button) {
    button.disabled = true
    button.textContent = 'Stopping...'
  }

  return foundationMutation('/api/foundation/job-runs/' + encodeURIComponent(run.runId) + '/stop', 'POST', {
    signal: 'SIGTERM',
    reason: 'Stopped from Runtime Health.',
  }).then(function() {
    cache.foundationHub = null
    renderDataHealth()
  }).catch(function(error) {
    window.alert('Stop failed: ' + (error.message || 'Unknown error'))
    if (button) {
      button.disabled = false
      button.textContent = 'Stop'
    }
  })
}

function decommissionFoundationJob(job, button) {
  if (!job || !job.key) return
  var expected = 'DECOMMISSION ' + job.key
  var confirmation = window.prompt('Type ' + expected + ' to decommission this job.')
  if (confirmation !== expected) return
  if (button) {
    button.disabled = true
    button.textContent = 'Decommissioning...'
  }

  return foundationMutation('/api/foundation/jobs/' + encodeURIComponent(job.key) + '/decommission', 'POST', {
    confirmation: confirmation,
  }).then(function() {
    cache.foundationHub = null
    renderDataHealth()
  }).catch(function(error) {
    window.alert('Decommission failed: ' + (error.message || 'Unknown error'))
    if (button) {
      button.disabled = false
      button.textContent = 'Decommission'
    }
  })
}
