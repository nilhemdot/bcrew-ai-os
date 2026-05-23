(function() {
  var API_ROUTE = '/api/foundation/dev-team-hub'
  var state = { payload: null }

  function getAdminHeaders() {
    try {
      var token = window.localStorage && (
        window.localStorage.getItem('BCREW_ADMIN_TOKEN') ||
        window.localStorage.getItem('bcrew.foundation.adminToken')
      )
      return token ? { 'X-Admin-Token': token } : {}
    } catch (error) {
      return {}
    }
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store', headers: getAdminHeaders() }).then(function(response) {
      if (response.status === 401) {
        window.location.assign('/login?next=' + encodeURIComponent('/dev'))
        return null
      }
      if (!response.ok) throw new Error(url + ' returned ' + response.status)
      return response.json()
    })
  }

  function $(id) {
    return document.getElementById(id)
  }

  function clear(node) {
    if (!node) return
    while (node.firstChild) node.removeChild(node.firstChild)
  }

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text != null) node.textContent = text
    return node
  }

  function append(parent) {
    Array.prototype.slice.call(arguments, 1).forEach(function(child) {
      if (child) parent.appendChild(child)
    })
    return parent
  }

  function valueOrNeed(value) {
    var text = String(value == null ? '' : value).trim()
    return text || 'Needs source'
  }

  function formatNumber(value) {
    var number = Number(value)
    if (!Number.isFinite(number)) return 'Needs source'
    return new Intl.NumberFormat('en-US').format(number)
  }

  function formatDateTime(value) {
    if (!value) return 'Needs source'
    var date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  function sourceMeta(label, value) {
    var span = el('span')
    var strong = el('strong', null, label + ': ')
    span.appendChild(strong)
    span.appendChild(el('code', null, valueOrNeed(value)))
    return span
  }

  function statusTag(value) {
    var tag = el('span', 'dev-tag', valueOrNeed(value))
    if (String(value || '').toLowerCase().includes('needs')) tag.className += ' needs'
    return tag
  }

  function emptyState(message) {
    return el('div', 'dev-empty', message || 'Needs source')
  }

  function linkOrText(url, label) {
    if (!url) return el('span', 'dev-link-text', 'Needs source')
    var anchor = el('a', 'dev-link-text', label || url)
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noreferrer'
    return anchor
  }

  function renderKpis(payload) {
    var root = $('dev-kpis')
    clear(root)
    var counts = payload.counts || {}
    var items = [
      { label: 'Research pool', value: counts.researchPool, source: '/api/foundation/build-intel/youtube-creator-daily-watch' },
      { label: 'Opportunities', value: counts.rankedOpportunities, source: 'scout report' },
      { label: 'Atoms', value: counts.atoms, source: 'intelligence_atoms' },
      { label: 'Evidence hits', value: counts.evidenceHits, source: 'intelligence_atom_hits' },
    ]
    items.forEach(function(item) {
      var card = el('article', 'dev-kpi')
      append(card,
        el('span', null, item.label),
        el('strong', null, formatNumber(item.value)),
        el('small', null, 'Source: ' + item.source)
      )
      root.appendChild(card)
    })
  }

  function renderSourceStatus(payload) {
    var root = $('dev-source-status')
    clear(root)
    var mark = payload.markYoutube || {}
    var head = el('div', 'dev-card')
    var headTop = el('div', 'dev-card-head')
    append(headTop, el('h3', null, valueOrNeed(mark.displayName)), statusTag(mark.targetStatus))
    append(head,
      headTop,
      el('p', null, valueOrNeed(mark.latestVideoTitle)),
      append(el('div', 'dev-meta'),
        sourceMeta('creator source', mark.sourceId),
        sourceMeta('youtube source', mark.youtubeSourceId),
        sourceMeta('target', mark.targetKey),
        sourceMeta('last run', formatDateTime(mark.targetLastRunAt))
      )
    )
    if (mark.latestVideoUrl) {
      var linkLine = el('p')
      linkLine.appendChild(linkOrText(mark.latestVideoUrl, mark.latestVideoUrl))
      head.appendChild(linkLine)
    }
    root.appendChild(head)

    var list = el('div', 'dev-source-list')
    ;(payload.sourceContracts || []).forEach(function(source) {
      var card = el('article', 'dev-source-card')
      append(card,
        append(el('div', 'dev-card-head'), el('h3', null, source.title || source.sourceId), statusTag(source.status)),
        append(el('div', 'dev-meta'),
          sourceMeta('source ID', source.sourceId),
          sourceMeta('validation', source.validation),
          sourceMeta('last verified', source.lastVerified)
        )
      )
      list.appendChild(card)
    })
    root.appendChild(list)
  }

  function renderActiveCard(payload) {
    var root = $('dev-active-card')
    clear(root)
    var sprint = payload.activeSprint || {}
    var card = sprint.activeCard || {}
    if (!card.cardId) {
      root.appendChild(emptyState('Needs source: active sprint card was not returned.'))
      return
    }
    var node = el('div', 'dev-card')
    append(node,
      append(el('div', 'dev-card-head'), el('h3', null, valueOrNeed(card.cardId)), statusTag(card.stage)),
      el('p', null, valueOrNeed(card.title || card.nextAction)),
      append(el('div', 'dev-meta'),
        sourceMeta('sprint', sprint.sprintId),
        sourceMeta('active blocker', sprint.activeBlockerCardId),
        sourceMeta('source', sprint.sourceRoute)
      )
    )
    root.appendChild(node)
  }

  function renderResearchPool(payload) {
    var root = $('dev-research-pool')
    clear(root)
    var pool = ((payload.dailyWatch || {}).researchPool || []).slice(0, 16)
    if (!pool.length) {
      root.appendChild(emptyState('Needs source: daily creator watch pool has no rows.'))
      return
    }
    var wrap = el('div', 'dev-table-wrap')
    var table = el('table', 'dev-table')
    var thead = el('thead')
    var header = el('tr')
    ;['Creator', 'Video', 'State', 'First seen', 'Source'].forEach(function(label) {
      header.appendChild(el('th', null, label))
    })
    thead.appendChild(header)
    table.appendChild(thead)
    var tbody = el('tbody')
    pool.forEach(function(item) {
      var row = el('tr')
      row.appendChild(el('td', null, valueOrNeed(item.creator)))
      var title = el('td')
      title.appendChild(linkOrText(item.url, valueOrNeed(item.title)))
      row.appendChild(title)
      row.appendChild(el('td', null, valueOrNeed(item.deltaState || item.status)))
      row.appendChild(el('td', null, formatDateTime(item.firstSeenAt)))
      row.appendChild(el('td', null, valueOrNeed(item.sourceId)))
      tbody.appendChild(row)
    })
    table.appendChild(tbody)
    wrap.appendChild(table)
    root.appendChild(wrap)
  }

  function renderScoutReport(payload) {
    var root = $('dev-scout-report')
    clear(root)
    var scout = payload.scout || {}
    var report = scout.report || {}
    if (!report.reportArtifactId) {
      root.appendChild(emptyState('Needs source: scout report artifact is missing.'))
      return
    }
    var card = el('div', 'dev-card')
    append(card,
      append(el('div', 'dev-card-head'), el('h3', null, valueOrNeed(report.title)), statusTag(report.status)),
      append(el('div', 'dev-meta'),
        sourceMeta('report', report.reportArtifactId),
        sourceMeta('seed video', scout.source && scout.source.seedVideoId),
        sourceMeta('updated', formatDateTime(report.updatedAt)),
        sourceMeta('source IDs', (report.sourceIds || []).join(', '))
      )
    )
    var seedUrl = scout.source && scout.source.seedVideoUrl
    if (seedUrl) {
      var seed = el('p')
      seed.appendChild(linkOrText(seedUrl, seedUrl))
      card.appendChild(seed)
    }
    root.appendChild(card)

    var findings = report.topFindings || []
    if (findings.length) {
      var stack = el('div', 'dev-stack')
      findings.slice(0, 6).forEach(function(item, index) {
        var finding = el('article', 'dev-card')
        append(finding,
          append(el('div', 'dev-card-head'), el('h3', null, (item.rank || index + 1) + '. ' + valueOrNeed(item.theme || item.finding)), statusTag('finding')),
          el('p', null, valueOrNeed(item.finding || item.recommendation)),
          append(el('div', 'dev-meta'), sourceMeta('source', report.sourceRoute))
        )
        stack.appendChild(finding)
      })
      root.appendChild(stack)
    }
  }

  function renderOpportunities(payload) {
    var root = $('dev-opportunities')
    clear(root)
    var scout = payload.scout || {}
    var opportunities = scout.rankedOpportunities || []
    var routes = scout.reviewRoutes || []
    if (!opportunities.length && !routes.length) {
      root.appendChild(emptyState('Needs source: no ranked opportunities or review routes were returned.'))
      return
    }
    var stack = el('div', 'dev-stack')
    opportunities.forEach(function(item, index) {
      var card = el('article', 'dev-card')
      append(card,
        append(el('div', 'dev-card-head'), el('h3', null, (item.rank || index + 1) + '. ' + valueOrNeed(item.title)), statusTag(item.confidence || 'proposal')),
        el('p', null, valueOrNeed(item.observation)),
        el('p', null, valueOrNeed(item.recommendedNextStep)),
        append(el('div', 'dev-meta'),
          sourceMeta('theme', item.theme),
          sourceMeta('source', item.sourceId),
          sourceMeta('route', item.sourceRoute)
        )
      )
      stack.appendChild(card)
    })
    routes.forEach(function(route) {
      var card = el('article', 'dev-card')
      append(card,
        append(el('div', 'dev-card-head'), el('h3', null, valueOrNeed(route.reviewRouteId)), statusTag(route.decisionState)),
        el('p', null, valueOrNeed(route.recommendation)),
        append(el('div', 'dev-meta'),
          sourceMeta('proposal only', route.proposalOnly ? 'yes' : 'no'),
          sourceMeta('backlog write', route.writesBacklog ? 'yes' : 'no'),
          sourceMeta('external write', route.externalWrites ? 'yes' : 'no')
        )
      )
      stack.appendChild(card)
    })
    root.appendChild(stack)
  }

  function renderAtoms(payload) {
    var root = $('dev-atoms')
    clear(root)
    var atoms = ((payload.scout || {}).atoms || []).slice(0, 8)
    if (!atoms.length) {
      root.appendChild(emptyState('Needs source: no atoms were returned for the scout report.'))
      return
    }
    var stack = el('div', 'dev-stack')
    atoms.forEach(function(atom) {
      var card = el('article', 'dev-card')
      append(card,
        append(el('div', 'dev-card-head'), el('h3', null, valueOrNeed(atom.title)), statusTag(atom.status)),
        el('p', null, valueOrNeed(atom.derivedClaim || atom.evidenceExcerpt)),
        append(el('div', 'dev-meta'),
          sourceMeta('atom', atom.atomId),
          sourceMeta('source', atom.sourceId),
          sourceMeta('score', formatNumber(atom.relevanceScore))
        )
      )
      stack.appendChild(card)
    })
    root.appendChild(stack)
  }

  function renderEvidence(payload) {
    var root = $('dev-evidence')
    clear(root)
    var hits = ((payload.scout || {}).evidenceHits || []).slice(0, 8)
    if (!hits.length) {
      root.appendChild(emptyState('Needs source: no evidence hits were returned for the scout report.'))
      return
    }
    var stack = el('div', 'dev-stack')
    hits.forEach(function(hit) {
      var card = el('article', 'dev-card')
      append(card,
        append(el('div', 'dev-card-head'), el('h3', null, valueOrNeed(hit.hitId)), statusTag(hit.hitType || 'evidence')),
        el('p', null, valueOrNeed(hit.evidenceExcerpt)),
        append(el('div', 'dev-meta'),
          sourceMeta('atom', hit.atomId),
          sourceMeta('source', hit.sourceId),
          sourceMeta('confidence', hit.confidence == null ? 'Needs source' : String(hit.confidence))
        )
      )
      stack.appendChild(card)
    })
    root.appendChild(stack)
  }

  function renderApprovalLinks(payload) {
    var root = $('dev-approval-links')
    clear(root)
    var links = ((payload.scout || {}).approvalRequiredLinks || []).slice(0, 12)
    if (!links.length) {
      root.appendChild(emptyState('Needs source: no approval-required links were returned.'))
      return
    }
    var stack = el('div', 'dev-stack')
    links.forEach(function(link) {
      var card = el('article', 'dev-card')
      append(card,
        append(el('div', 'dev-card-head'), el('h3', null, valueOrNeed(link.classification || link.host)), statusTag('requires approval')),
        el('p', 'dev-link-text', valueOrNeed(link.url)),
        el('p', null, valueOrNeed(link.reason)),
        append(el('div', 'dev-meta'),
          sourceMeta('source', link.sourceId),
          sourceMeta('route', link.sourceRoute)
        )
      )
      stack.appendChild(card)
    })
    root.appendChild(stack)
  }

  function render(payload) {
    state.payload = payload
    var status = $('dev-status')
    status.className = 'dev-status ' + (payload.status === 'ready' ? 'ready' : 'needs-source')
    status.textContent = payload.status === 'ready'
      ? 'Ready: all visible values are sourced from Foundation routes and report artifacts.'
      : 'Needs source: ' + ((payload.sourceNeeds || []).join(', ') || 'one or more values')

    renderKpis(payload)
    renderSourceStatus(payload)
    renderActiveCard(payload)
    renderResearchPool(payload)
    renderScoutReport(payload)
    renderOpportunities(payload)
    renderAtoms(payload)
    renderEvidence(payload)
    renderApprovalLinks(payload)
  }

  function boot() {
    fetchJson(API_ROUTE).then(function(payload) {
      if (!payload) return
      render(payload)
    }).catch(function(error) {
      var status = $('dev-status')
      status.className = 'dev-status needs-source'
      status.textContent = error.message || 'Failed to load Dev Team Hub.'
    })
  }

  boot()
})()
