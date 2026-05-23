(function() {
  'use strict'

  var ROUTES = {
    hub: '/api/foundation/dev-team-hub',
    sprint: '/api/foundation/current-sprint',
    backlog: '/api/foundation/backlog?limit=80',
    buildLog: '/api/foundation/build-log?limit=20',
  }

  var VIEW_COPY = {
    overview: {
      title: 'Overview',
      subtitle: 'Recommended build candidates, approval decisions, latest intel, sprint state, and proof from Foundation truth.',
    },
    sprint: {
      title: 'Current Sprint',
      subtitle: 'Active card, queue order, and sprint stage state from the Foundation sprint API.',
    },
    backlog: {
      title: 'Backlog',
      subtitle: 'Build queue and backlog context, read from Foundation without creating new cards.',
    },
    intel: {
      title: 'Build Intel',
      subtitle: 'Creator watch status, tracked videos, scout report, atoms, and evidence from Foundation.',
    },
    opportunities: {
      title: 'Opportunities',
      subtitle: 'Scout-backed proposals and review routes. Nothing promotes until Steve approves it.',
    },
    approvals: {
      title: 'Approvals',
      subtitle: 'Links and exact source items that require Steve approval before any follow-up work.',
    },
    recent: {
      title: 'Recent Work',
      subtitle: 'Recent repository and Foundation activity from the existing build log.',
    },
  }

  var VIEW_ORDER = ['overview', 'sprint', 'backlog', 'intel', 'opportunities', 'approvals', 'recent']
  var state = { data: null, view: normalizeView(new URLSearchParams(window.location.search).get('view')) }

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

  function fetchOptional(url) {
    return fetchJson(url).then(function(payload) {
      return { route: url, payload: payload, error: null }
    }).catch(function(error) {
      return { route: url, payload: null, error: error }
    })
  }

  function $(id) {
    return document.getElementById(id)
  }

  function list(value) {
    return Array.isArray(value) ? value : []
  }

  function clear(node) {
    if (!node) return
    while (node.firstChild) node.removeChild(node.firstChild)
  }

  function text(value) {
    return String(value == null ? '' : value).trim()
  }

  function valueOrNeed(value) {
    return text(value) || 'Needs source'
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

  function shortSha(value) {
    return text(value).slice(0, 8) || 'Needs source'
  }

  function hostFromUrl(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, '')
    } catch (error) {
      return ''
    }
  }

  function normalizeView(value) {
    return VIEW_ORDER.indexOf(value) >= 0 ? value : 'overview'
  }

  function h(tag, options, children) {
    var node = document.createElement(tag)
    options = options || {}
    if (options.className) node.className = options.className
    if (options.id) node.id = options.id
    if (options.type) node.type = options.type
    if (options.href) node.href = options.href
    if (options.target) node.target = options.target
    if (options.rel) node.rel = options.rel
    if (options.title) node.title = options.title
    if (options.role) node.setAttribute('role', options.role)
    if (options.colspan) node.colSpan = options.colspan
    if (options.text != null) node.textContent = options.text
    if (options.hidden) node.hidden = true
    if (options.dataset) {
      Object.keys(options.dataset).forEach(function(key) {
        node.dataset[key] = options.dataset[key]
      })
    }
    if (options.aria) {
      Object.keys(options.aria).forEach(function(key) {
        node.setAttribute('aria-' + key, options.aria[key])
      })
    }
    append(node, children)
    return node
  }

  function append(parent, children) {
    if (!children) return parent
    if (!Array.isArray(children)) children = [children]
    children.forEach(function(child) {
      if (!child && child !== 0) return
      if (typeof child === 'string' || typeof child === 'number') {
        parent.appendChild(document.createTextNode(String(child)))
      } else {
        parent.appendChild(child)
      }
    })
    return parent
  }

  function meta(label, value) {
    var rendered = Array.isArray(value) ? value.filter(Boolean).join(', ') : value
    return h('span', { className: 'dev-meta-item' }, [
      h('strong', { text: label + ': ' }),
      h('span', { text: valueOrNeed(rendered) }),
    ])
  }

  function tag(value, tone) {
    var className = 'dev-tag'
    var rendered = valueOrNeed(value)
    var lowered = rendered.toLowerCase()
    if (tone) className += ' ' + tone
    if (!tone && (lowered.indexOf('done') >= 0 || lowered.indexOf('ready') >= 0 || lowered.indexOf('generated') >= 0)) className += ' good'
    if (!tone && (lowered.indexOf('need') >= 0 || lowered.indexOf('approval') >= 0 || lowered.indexOf('blocked') >= 0)) className += ' needs'
    return h('span', { className: className, text: rendered })
  }

  function emptyState(message) {
    return h('div', { className: 'dev-empty', text: message || 'Needs source' })
  }

  function actionButton(label, view) {
    return h('button', {
      className: 'dev-text-button',
      type: 'button',
      text: label,
      dataset: { viewTarget: view },
    })
  }

  function urlText(value) {
    return h('span', { className: 'dev-url-text', text: valueOrNeed(value) })
  }

  function panel(eyebrow, title, badge, children, note) {
    var headChildren = [
      h('div', null, [
        h('p', { className: 'dev-eyebrow', text: eyebrow }),
        h('h2', { text: title }),
      ]),
    ]
    if (badge) headChildren.push(h('span', { className: 'dev-source-pill', text: badge }))
    return h('article', { className: 'dev-panel' }, [
      h('div', { className: 'dev-panel-head' }, headChildren),
      note ? h('p', { className: 'dev-section-note', text: note }) : null,
      children,
    ])
  }

  function row(title, body, tags, metas, actions) {
    return h('div', { className: 'dev-row' }, [
      h('div', { className: 'dev-row-head' }, [
        h('h3', { className: 'dev-row-title', text: valueOrNeed(title) }),
        tags && tags.length ? h('div', { className: 'dev-card-actions' }, tags) : null,
      ]),
      body ? h('p', { className: 'dev-row-text', text: body }) : null,
      metas && metas.length ? h('div', { className: 'dev-meta' }, metas) : null,
      actions && actions.length ? h('div', { className: 'dev-actions' }, actions) : null,
    ])
  }

  function metric(label, value, source) {
    return h('article', { className: 'dev-metric' }, [
      h('div', { className: 'dev-metric-head' }, [
        h('span', { text: label }),
        h('span', { className: 'dev-chip', text: source }),
      ]),
      h('strong', { text: formatNumber(value) }),
      h('small', { text: 'Source: ' + source }),
    ])
  }

  function getCounts(data) {
    return (data.hub || {}).counts || {}
  }

  function getActiveCard(data) {
    var hubSprint = (data.hub || {}).activeSprint || {}
    var hubCard = hubSprint.activeCard || {}
    var sprint = (data.sprint || {}).sprint || {}
    var activeBlocker = sprint.activeBlocker || {}
    var cardId = hubCard.cardId || activeBlocker.cardId
    var sprintItem = list((data.sprint || {}).items).find(function(item) {
      return item.cardId === cardId
    }) || {}
    var backlog = sprintItem.backlog || {}
    return {
      cardId: cardId || sprintItem.cardId,
      title: hubCard.title || activeBlocker.title || sprintItem.title || backlog.title,
      stage: hubCard.stage || sprintItem.stage || activeBlocker.lane,
      nextAction: hubCard.nextAction || activeBlocker.nextAction || sprintItem.nextAction || sprintItem.backlogNextAction || backlog.nextAction,
      definitionOfDone: hubCard.definitionOfDone || sprintItem.definitionOfDone,
      sourceRoute: hubSprint.sourceRoute || ROUTES.sprint,
      sprintId: hubSprint.sprintId || sprint.sprintId,
    }
  }

  function itemTitle(item) {
    return item.title || item.backlogTitle || (item.backlog && item.backlog.title) || item.cardId
  }

  function itemNextAction(item) {
    return item.nextAction || item.backlogNextAction || (item.backlog && item.backlog.nextAction) || item.definitionOfDone
  }

  function sprintItems(data) {
    return list((data.sprint || {}).items).slice().sort(function(a, b) {
      return Number(a.order || 999) - Number(b.order || 999)
    })
  }

  function sprintStages(data) {
    return Object.keys((data.sprint || {}).stages || {}).map(function(key) {
      return data.sprint.stages[key]
    }).filter(function(stage) {
      return stage && Array.isArray(stage.items)
    })
  }

  function opportunityTitle(item, index) {
    return (item.rank || index + 1) + '. ' + valueOrNeed(item.title)
  }

  function renderMetricGrid(data) {
    var counts = getCounts(data)
    return h('section', { className: 'dev-metric-grid', aria: { label: 'Dev Team Hub source-backed counts' } }, [
      metric('Tracked Videos', counts.researchPool, 'daily watch'),
      metric('Scout Opportunities', counts.rankedOpportunities, 'scout/proof'),
      metric('Approval Items', counts.approvalRequiredLinks, 'scout/proof'),
      metric('Evidence Hits', counts.evidenceHits, 'atoms/proof'),
    ])
  }

  function isYoutubeWatchUrl(value) {
    var url = text(value)
    return /^https:\/\/(www\.)?youtube\.com\/watch\?/i.test(url) || /^https:\/\/youtu\.be\//i.test(url)
  }

  function approvalBuckets(data) {
    var links = list(((data.hub || {}).scout || {}).approvalRequiredLinks)
    return links.reduce(function(buckets, item) {
      var url = item.url || item.sourceUrl
      var classification = text(item.classification)
      if (isYoutubeWatchUrl(url) && !classification) buckets.sources.push(item)
      else buckets.external.push(item)
      return buckets
    }, { sources: [], external: [] })
  }

  function sourceVideoLabel(url) {
    if (!url) return 'Needs source'
    try {
      var parsed = new URL(url)
      return parsed.searchParams.get('v') || hostFromUrl(url) || url
    } catch (error) {
      return url
    }
  }

  function humanizeToken(value) {
    var cleaned = text(value).replace(/^approval_required_/, '').replace(/_/g, ' ')
    return cleaned.replace(/\b\w/g, function(character) {
      return character.toUpperCase()
    }) || 'Needs source'
  }

  function renderSourceProofStrip(data) {
    var counts = getCounts(data)
    var sourceIds = list((data.hub || {}).sourceIds).join(', ')
    var reportIds = list((data.hub || {}).reportArtifactIds).join(', ')
    return h('section', { className: 'dev-proof-strip', aria: { label: 'Source proof' } }, [
      h('div', { className: 'dev-proof-item' }, [
        h('span', { text: 'Build candidates' }),
        h('strong', { text: formatNumber(counts.rankedOpportunities) }),
        h('small', { text: 'scout/proof' }),
      ]),
      h('div', { className: 'dev-proof-item' }, [
        h('span', { text: 'Atoms' }),
        h('strong', { text: formatNumber(counts.atoms) }),
        h('small', { text: 'intelligence_atoms' }),
      ]),
      h('div', { className: 'dev-proof-item' }, [
        h('span', { text: 'Evidence hits' }),
        h('strong', { text: formatNumber(counts.evidenceHits) }),
        h('small', { text: 'intelligence_atom_hits' }),
      ]),
      h('div', { className: 'dev-proof-item wide' }, [
        h('span', { text: 'Source IDs' }),
        h('strong', { text: sourceIds || 'Needs source' }),
        h('small', { text: reportIds || 'Needs source' }),
      ]),
    ])
  }

  function renderActiveFocus(data) {
    var card = getActiveCard(data)
    return h('article', { className: 'dev-focus-card' }, [
      h('div', { className: 'dev-focus-head' }, [
        h('div', null, [
          h('p', { className: 'dev-eyebrow', text: 'Current Active Card' }),
          h('h2', { text: valueOrNeed(card.cardId) }),
        ]),
        tag(card.stage || 'active', 'strong'),
      ]),
      h('div', { className: 'dev-focus-body' }, [
        h('p', { className: 'dev-focus-text', text: valueOrNeed(card.title || card.definitionOfDone) }),
        h('p', { className: 'dev-row-text', text: valueOrNeed(card.nextAction || card.definitionOfDone) }),
        h('div', { className: 'dev-meta' }, [
          meta('sprint', card.sprintId),
          meta('source', card.sourceRoute),
        ]),
        h('div', { className: 'dev-actions' }, [
          actionButton('Open sprint view', 'sprint'),
          actionButton('See build queue', 'backlog'),
        ]),
      ]),
    ])
  }

  function approvalRow(linkItem, external) {
    var url = linkItem.url || linkItem.sourceUrl
    var title = external
      ? humanizeToken(linkItem.classification || hostFromUrl(url) || 'External permission')
      : 'Source video: ' + sourceVideoLabel(url)
    return row(title, linkItem.reason || linkItem.recommendation || 'Needs Steve approval before follow-up.', [
      tag(external ? 'permission needed' : 'approve extraction', 'needs'),
    ], [
      meta('source', linkItem.sourceId),
      meta('route', linkItem.sourceRoute),
    ], [
      urlText(url),
    ])
  }

  function approvalPreviewRow(linkItem, external) {
    var url = linkItem.url || linkItem.sourceUrl
    var title = external
      ? humanizeToken(linkItem.classification || hostFromUrl(url) || 'External permission')
      : 'Source video: ' + sourceVideoLabel(url)
    return row(title, linkItem.reason || linkItem.recommendation || 'Needs Steve approval before follow-up.', [
      tag(external ? 'permission needed' : 'approve extraction', 'needs'),
    ], [
      meta(external ? 'host' : 'video', external ? hostFromUrl(url) : sourceVideoLabel(url)),
      meta('source', linkItem.sourceId),
    ])
  }

  function renderApprovalsPreview(data) {
    var buckets = approvalBuckets(data)
    var sourceRows = buckets.sources.slice(0, 3).map(function(item) {
      return approvalPreviewRow(item, false)
    })
    var externalRows = buckets.external.slice(0, 3).map(function(item) {
      return approvalPreviewRow(item, true)
    })
    if (!sourceRows.length) sourceRows.push(emptyState('No source videos currently need approval.'))
    if (!externalRows.length) externalRows.push(emptyState('No external/private links currently need permission.'))
    return panel('Needs Steve Approval', 'Approval Queue', formatNumber(buckets.sources.length + buckets.external.length) + ' items', h('div', { className: 'dev-approval-split' }, [
      h('div', null, [
        h('h3', { className: 'dev-subhead', text: 'Videos/source items for deeper extraction' }),
        h('div', { className: 'dev-list tight' }, sourceRows),
      ]),
      h('div', null, [
        h('h3', { className: 'dev-subhead', text: 'External/private/download/auth links' }),
        h('div', { className: 'dev-list tight' }, externalRows),
      ]),
      h('div', { className: 'dev-actions' }, [actionButton('Review full approval queue', 'approvals')]),
    ]), 'The page displays decisions only. It does not follow links, approve routes, or write backlog.')
  }

  function renderRecommendedBuildCandidates(data, limit) {
    var opportunities = list(((data.hub || {}).scout || {}).rankedOpportunities).slice(0, limit || 3)
    var cards = opportunities.map(function(item, index) {
      return h('article', { className: 'dev-candidate' }, [
        h('div', { className: 'dev-row-head' }, [
          h('span', { className: 'dev-candidate-rank', text: '#' + (item.rank || index + 1) }),
          tag(item.confidence || 'proposal-only'),
        ]),
        h('h3', { className: 'dev-candidate-title', text: valueOrNeed(item.title) }),
        h('div', { className: 'dev-field' }, [
          h('span', { className: 'dev-field-label', text: 'Why it matters' }),
          h('p', { className: 'dev-row-text', text: valueOrNeed(item.observation || item.devTeamOpportunity) }),
        ]),
        h('div', { className: 'dev-field' }, [
          h('span', { className: 'dev-field-label', text: 'Recommended next step' }),
          h('p', { className: 'dev-row-text', text: valueOrNeed(item.recommendedNextStep) }),
        ]),
        h('div', { className: 'dev-meta' }, [
          meta('theme', item.theme),
          meta('source', item.sourceId),
        ]),
        h('div', { className: 'dev-actions' }, [
          urlText(item.sourceUrl),
          actionButton('View route', 'opportunities'),
        ]),
      ])
    })
    return panel('Recommended Build Candidates', 'Recommended Build Candidates', 'from scout/proof', cards.length ? h('div', { className: 'dev-candidate-grid' }, cards) : emptyState('Needs source: no build candidates returned.'), 'These are source-backed candidates, not approved backlog cards. Steve still chooses what moves forward.')
  }

  function renderSprintQueuePreview(data) {
    var rows = sprintItems(data).slice(0, 5).map(function(item) {
      return row(item.cardId, itemTitle(item), [tag(item.stage || item.stageLabel)], [
        meta('priority', item.backlogPriority || (item.backlog && item.backlog.priority)),
        meta('source', ROUTES.sprint),
      ])
    })
    if (!rows.length) rows.push(emptyState('Needs source: current sprint queue was not returned.'))
    rows.push(h('div', { className: 'dev-actions' }, [actionButton('Open sprint', 'sprint')]))
    return panel('Current Sprint Queue', 'Build Order', ROUTES.sprint, h('div', { className: 'dev-list tight' }, rows))
  }

  function renderLatestIntelSignal(data) {
    var mark = (data.hub || {}).markYoutube || {}
    var pool = list(((data.hub || {}).dailyWatch || {}).researchPool)
    var newItems = pool.filter(function(item) {
      return /new/i.test(text(item.deltaState || item.status || item.reviewState))
    })
    var rows = [
      row('Daily watch health', mark.targetStatus === 'succeeded' ? 'Daily creator watch is healthy and feeding the Build Intel pool.' : 'Daily creator watch needs review.', [
        tag(mark.targetStatus || mark.lookupStatus),
      ], [
        meta('last run', formatDateTime(mark.targetLastRunAt)),
        meta('next run', formatDateTime(mark.targetNextRunAt)),
        meta('new items since last run', formatNumber(newItems.length)),
      ]),
      row('Latest Mark video', mark.latestVideoTitle || 'Needs source', [
        tag(mark.lookupStatus || 'source'),
      ], [
        meta('source', mark.sourceId),
        meta('youtube source', mark.youtubeSourceId),
      ], [
        urlText(mark.latestVideoUrl),
        actionButton('Open intel', 'intel'),
      ]),
    ]
    return panel('Latest Intel Signal', 'Daily Watch', 'source-backed', h('div', { className: 'dev-list tight' }, rows), 'Tracked-video totals stay in Intel detail. Overview shows only the current signal.')
  }

  function renderCurrentSprintOverview(data) {
    var active = getActiveCard(data)
    var items = sprintItems(data)
    var activeIndex = items.findIndex(function(item) {
      return item.cardId === active.cardId
    })
    var nextItem = activeIndex >= 0 ? items.slice(activeIndex + 1).find(function(item) {
      return !/done/i.test(text(item.stage || item.stageLabel))
    }) : null
    var blockerText = active.cardId ? 'Yes: current active card is still the sprint blocker.' : 'No active blocker returned.'
    return panel('Current Sprint', 'Sprint State', ROUTES.sprint, h('div', { className: 'dev-list tight' }, [
      row('Active card', active.cardId, [tag(active.stage || 'active')], [
        meta('title', active.title || active.definitionOfDone),
        meta('blocker', blockerText),
      ]),
      row('Next card', nextItem ? nextItem.cardId : 'Needs source', nextItem ? itemTitle(nextItem) : 'No next card returned.', [
        tag(nextItem ? nextItem.stage || nextItem.stageLabel : 'Needs source'),
      ], [
        meta('source', ROUTES.sprint),
      ]),
      h('div', { className: 'dev-actions' }, [
        actionButton('Open sprint', 'sprint'),
        actionButton('See build queue', 'backlog'),
      ]),
    ]))
  }

  function renderRecentPreview(data) {
    var builds = list((data.buildLog || {}).builds).slice(0, 3)
    var rows = builds.map(function(build) {
      return row(build.subject || build.title || shortSha(build.sha || build.commit), build.whatChanged || build.whatItDoes, [
        tag(build.operatorStatus || 'repo-change'),
      ], [
        meta('commit', shortSha(build.sha || build.commit)),
        meta('when', formatDateTime(build.committedAt || build.when)),
        meta('source', ROUTES.buildLog),
      ])
    })
    if (!rows.length) rows.push(emptyState('Needs source: build log returned no recent builds.'))
    rows.push(h('div', { className: 'dev-actions' }, [actionButton('Open recent', 'recent')]))
    return panel('Recent Work', 'Latest Proof', ROUTES.buildLog, h('div', { className: 'dev-list tight' }, rows))
  }

  function renderOverview(data) {
    return [
      renderRecommendedBuildCandidates(data, 3),
      h('section', { className: 'dev-grid-two' }, [
        renderApprovalsPreview(data),
        renderLatestIntelSignal(data),
      ]),
      h('section', { className: 'dev-grid-three' }, [
        renderCurrentSprintOverview(data),
        renderRecentPreview(data),
        panel('Read Boundary', 'Proposal Only', 'no writes', h('div', { className: 'dev-list tight' }, [
          row('No extraction runs', 'This UI consumes existing Foundation APIs only.', [tag('read only', 'good')], [meta('routes', Object.keys(ROUTES).map(function(key) { return ROUTES[key] }))]),
          row('No automatic backlog cards', 'Opportunities and links stay review items until Steve approves exact source work.', [tag('approval gated', 'needs')]),
        ])),
      ]),
      renderSourceProofStrip(data),
    ]
  }

  function renderSprint(data) {
    var active = getActiveCard(data)
    var queueRows = sprintItems(data).map(function(item) {
      return row(item.cardId, itemTitle(item), [tag(item.stageLabel || item.stage)], [
        meta('order', item.order),
        meta('priority', item.backlogPriority || (item.backlog && item.backlog.priority)),
        meta('plan', item.planRef),
      ], item.cardId === active.cardId ? [actionButton('Open approvals', 'approvals')] : null)
    })
    var stageCards = sprintStages(data).map(function(stage) {
      var itemLines = list(stage.items).slice(0, 4).map(function(item) {
        return h('p', { className: 'dev-row-text', text: item.cardId + ' - ' + valueOrNeed(itemTitle(item)) })
      })
      if (!itemLines.length) itemLines.push(h('p', { className: 'dev-row-text', text: 'No cards in this stage.' }))
      return h('article', { className: 'dev-stage' }, [
        h('div', { className: 'dev-row-head' }, [
          h('h3', { text: stage.label || stage.key }),
          h('span', { className: 'dev-stage-count', text: formatNumber(list(stage.items).length) }),
        ]),
      ].concat(itemLines))
    })
    return [
      h('section', { className: 'dev-grid-two' }, [
        renderActiveFocus(data),
        panel('Sprint Source', 'Active Sprint', ROUTES.sprint, h('div', { className: 'dev-list tight' }, [
          row((data.sprint.sprint || {}).sprintId, (data.sprint.sprint || {}).goal, [tag((data.sprint.sprint || {}).status)], [
            meta('active blocker', active.cardId),
            meta('source', ROUTES.sprint),
          ]),
        ])),
      ]),
      panel('Current Sprint Queue', 'Ordered Cards', ROUTES.sprint, queueRows.length ? h('div', { className: 'dev-list' }, queueRows) : emptyState('Needs source: current sprint items were not returned.')),
      panel('Stage View', 'Sprint Stages', ROUTES.sprint, stageCards.length ? h('div', { className: 'dev-stage-grid' }, stageCards) : emptyState('Needs source: stage grid was not returned.')),
    ]
  }

  function relevantBacklogItems(data) {
    var ids = new Set(sprintItems(data).map(function(item) { return item.cardId }))
    var exclude = /skool|myicor|strategy|bhag|kpi/i
    var include = /youtube|dev team|build intel|creator|mark|approval|review route/i
    var seen = new Set()
    return list((data.backlog || {}).backlogItems).filter(function(item) {
      var id = item.id || item.cardId
      var haystack = [id, item.title, item.summary, item.nextAction, item.statusNote].join(' ')
      var keep = ids.has(id) || include.test(haystack)
      if (!keep || exclude.test(haystack) || seen.has(id)) return false
      seen.add(id)
      return true
    }).slice(0, 18)
  }

  function renderBacklog(data) {
    var queueRows = sprintItems(data).map(function(item) {
      return row(item.cardId, itemTitle(item), [tag(item.stageLabel || item.stage)], [
        meta('backlog lane', item.backlogLane || (item.backlog && item.backlog.lane)),
        meta('source', ROUTES.sprint),
      ])
    })
    var backlogRows = relevantBacklogItems(data).map(function(item) {
      return row(item.id || item.cardId, item.title, [tag(item.lane || item.priority)], [
        meta('priority', item.priority),
        meta('owner', item.owner),
        meta('source', ROUTES.backlog),
      ])
    })
    return [
      panel('Build Queue', 'Current Sprint Cards', ROUTES.sprint, queueRows.length ? h('div', { className: 'dev-list' }, queueRows) : emptyState('Needs source: current sprint queue was not returned.'), 'This queue is read-only. The UI does not create backlog cards.'),
      panel('Backlog Context', 'Relevant Foundation Items', ROUTES.backlog, backlogRows.length ? h('div', { className: 'dev-list' }, backlogRows) : emptyState('Needs source: no relevant backlog items returned.')),
    ]
  }

  function renderSourceStatus(data) {
    var mark = (data.hub || {}).markYoutube || {}
    var rows = [
      row(mark.displayName || 'Mark Kashef', mark.latestVideoTitle, [tag(mark.targetStatus || mark.lookupStatus)], [
        meta('creator source', mark.sourceId),
        meta('youtube source', mark.youtubeSourceId),
        meta('target', mark.targetKey),
        meta('last run', formatDateTime(mark.targetLastRunAt)),
      ]),
    ]
    list((data.hub || {}).sourceContracts).slice(0, 4).forEach(function(source) {
      rows.push(row(source.title || source.sourceId, source.validation, [tag(source.status)], [
        meta('source ID', source.sourceId),
        meta('last verified', source.lastVerified),
      ]))
    })
    return panel('Source Status', 'Mark / YouTube', ROUTES.hub, h('div', { className: 'dev-list' }, rows))
  }

  function renderScoutReport(data) {
    var scout = ((data.hub || {}).scout || {})
    var report = scout.report || {}
    var findingRows = list(report.topFindings).slice(0, 7).map(function(item, index) {
      return row((item.rank || index + 1) + '. ' + valueOrNeed(item.theme || item.finding), item.finding || item.recommendation, [tag('finding')], [
        meta('source', report.sourceRoute || scout.sourceRoute),
      ])
    })
    if (!findingRows.length) findingRows.push(emptyState('Needs source: scout findings were not returned.'))
    return panel('Scout Report', report.title || 'Public YouTube Scout', report.status || 'generated', h('div', { className: 'dev-list' }, [
      row(report.reportArtifactId, 'Proposal-only scout report for Dev Team review.', [tag(report.status)], [
        meta('source IDs', report.sourceIds),
        meta('updated', formatDateTime(report.updatedAt)),
        meta('route', report.sourceRoute || scout.sourceRoute),
      ]),
      h('div', { className: 'dev-list' }, findingRows),
    ]))
  }

  function renderTrackedVideoTable(data) {
    var pool = list(((data.hub || {}).dailyWatch || {}).researchPool)
    var rows = pool.slice(0, 30).map(function(item) {
      return h('tr', null, [
        h('td', { text: valueOrNeed(item.creator) }),
        h('td', null, [
          h('strong', { text: valueOrNeed(item.title) }),
          h('div', { className: 'dev-meta' }, [meta('url', item.url)]),
        ]),
        h('td', { text: valueOrNeed(item.deltaState || item.status || item.reviewState) }),
        h('td', { text: formatDateTime(item.firstSeenAt) }),
        h('td', { text: valueOrNeed(item.sourceId) }),
      ])
    })
    if (!rows.length) {
      rows.push(h('tr', null, [h('td', { colspan: 5 }, [emptyState('Needs source: tracked videos were not returned.')])]))
    }
    return panel('Daily Creator Watch', 'Tracked Videos', ROUTES.hub, h('div', { className: 'dev-table-wrap' }, [
      h('table', { className: 'dev-table' }, [
        h('thead', null, [
          h('tr', null, ['Creator', 'Video', 'State', 'First Seen', 'Source'].map(function(label) {
            return h('th', { text: label })
          })),
        ]),
        h('tbody', null, rows),
      ]),
    ]), '132 means tracked video rows from the daily creator watch. This table is intentionally deeper than Overview.')
  }

  function renderAtomsEvidence(data) {
    var scout = ((data.hub || {}).scout || {})
    var atomRows = list(scout.atoms).map(function(atom) {
      return row(atom.title, atom.derivedClaim || atom.evidenceExcerpt, [tag(atom.status)], [
        meta('atom', atom.atomId),
        meta('source', atom.sourceId),
        meta('score', atom.relevanceScore),
      ])
    })
    var hitRows = list(scout.evidenceHits).map(function(hit) {
      return row(hit.hitId, hit.evidenceExcerpt, [tag(hit.hitType || 'evidence')], [
        meta('atom', hit.atomId),
        meta('source', hit.sourceId),
        meta('confidence', hit.confidence == null ? null : String(hit.confidence)),
      ])
    })
    return h('section', { className: 'dev-grid-two' }, [
      panel('Atoms / Candidates', 'Atom Pool', 'proposal-only', atomRows.length ? h('div', { className: 'dev-list' }, atomRows) : emptyState('Needs source: atoms were not returned.')),
      panel('Evidence Hits', 'Proof Lines', 'source-backed', hitRows.length ? h('div', { className: 'dev-list' }, hitRows) : emptyState('Needs source: evidence hits were not returned.')),
    ])
  }

  function renderIntel(data) {
    return [
      renderMetricGrid(data),
      h('section', { className: 'dev-grid-two' }, [
        renderSourceStatus(data),
        renderScoutReport(data),
      ]),
      renderTrackedVideoTable(data),
      renderAtomsEvidence(data),
    ]
  }

  function renderOpportunities(data) {
    var scout = ((data.hub || {}).scout || {})
    var opportunityRows = list(scout.rankedOpportunities).map(function(item, index) {
      return row(opportunityTitle(item, index), item.observation || item.devTeamOpportunity, [tag(item.confidence || 'proposal-only')], [
        meta('theme', item.theme),
        meta('source', item.sourceId),
        meta('route', item.sourceRoute),
      ], [
        urlText(item.sourceUrl),
      ])
    })
    var routeRows = list(scout.reviewRoutes).map(function(routeItem) {
      return row(routeItem.reviewRouteId, routeItem.recommendation, [tag(routeItem.decisionState || 'needs review', 'needs')], [
        meta('proposal only', routeItem.proposalOnly ? 'yes' : 'no'),
        meta('writes backlog', routeItem.writesBacklog ? 'yes' : 'no'),
        meta('external writes', routeItem.externalWrites ? 'yes' : 'no'),
        meta('source', routeItem.sourceId),
      ], [
        urlText(routeItem.sourceUrl),
      ])
    })
    return [
      panel('Recommended Build Candidates', 'Recommended Build Candidates', '7 from scout/proof', opportunityRows.length ? h('div', { className: 'dev-list' }, opportunityRows) : emptyState('Needs source: no build candidates were returned.'), 'These are proposal-only scout outputs. They are not automatically backlog cards.'),
      panel('Review Routes', 'Promotion Gate', 'approval required', routeRows.length ? h('div', { className: 'dev-list' }, routeRows) : emptyState('Needs source: no review routes were returned.')),
    ]
  }

  function renderApprovals(data) {
    var buckets = approvalBuckets(data)
    var sourceRows = buckets.sources.map(function(linkItem) {
      return approvalRow(linkItem, false)
    })
    var externalRows = buckets.external.map(function(linkItem) {
      return approvalRow(linkItem, true)
    })
    return [
      panel('Needs Approval', 'Videos / Source Items', formatNumber(buckets.sources.length) + ' items', sourceRows.length ? h('div', { className: 'dev-list' }, sourceRows) : emptyState('No source videos currently need approval.'), 'Approve one exact source item before deeper extraction or promotion.'),
      panel('Needs Permission', 'External / Private / Download / Auth Links', formatNumber(buckets.external.length) + ' items', externalRows.length ? h('div', { className: 'dev-list' }, externalRows) : emptyState('No external/private links currently need permission.'), 'These are not followed by the UI and are not approval to access private, paid, auth, booking, download, or community surfaces.'),
    ]
  }

  function renderRecent(data) {
    var builds = list((data.buildLog || {}).builds).map(function(build) {
      return row(build.subject || build.title || shortSha(build.sha || build.commit), build.whatChanged || build.whatItDoes, [tag(build.operatorStatus || 'repo-change')], [
        meta('commit', shortSha(build.sha || build.commit)),
        meta('when', formatDateTime(build.committedAt || build.when)),
        meta('files', Array.isArray(build.files) ? build.files.length : build.fileCount),
        meta('source', ROUTES.buildLog),
      ])
    })
    var changes = list((data.buildLog || {}).recentChanges).slice(0, 12).map(function(change) {
      return row(change.summary || change.eventType, change.actor, [tag(change.eventType)], [
        meta('entity', change.entityTable),
        meta('when', formatDateTime(change.createdAt)),
        meta('source', ROUTES.buildLog),
      ])
    })
    return [
      panel('Recent Builds', 'Repository Work', ROUTES.buildLog, builds.length ? h('div', { className: 'dev-list' }, builds) : emptyState('Needs source: build log returned no builds.')),
      panel('Recent Foundation Events', 'Activity', ROUTES.buildLog, changes.length ? h('div', { className: 'dev-list' }, changes) : emptyState('Needs source: build log returned no recent events.')),
    ]
  }

  function renderView() {
    var root = $('dev-view-root')
    if (!root) return
    clear(root)
    var copy = VIEW_COPY[state.view] || VIEW_COPY.overview
    $('dev-view-title').textContent = copy.title
    $('dev-view-subtitle').textContent = copy.subtitle
    document.querySelectorAll('[data-view]').forEach(function(button) {
      button.classList.toggle('is-active', button.dataset.view === state.view)
    })
    if (!state.data) {
      root.appendChild(emptyState('Loading Foundation truth.'))
      return
    }
    var rendered
    if (state.view === 'sprint') rendered = renderSprint(state.data)
    else if (state.view === 'backlog') rendered = renderBacklog(state.data)
    else if (state.view === 'intel') rendered = renderIntel(state.data)
    else if (state.view === 'opportunities') rendered = renderOpportunities(state.data)
    else if (state.view === 'approvals') rendered = renderApprovals(state.data)
    else if (state.view === 'recent') rendered = renderRecent(state.data)
    else rendered = renderOverview(state.data)
    append(root, rendered)
  }

  function setView(view, replace) {
    state.view = normalizeView(view)
    var nextUrl = new URL(window.location.href)
    if (state.view === 'overview') nextUrl.searchParams.delete('view')
    else nextUrl.searchParams.set('view', state.view)
    var method = replace ? 'replaceState' : 'pushState'
    window.history[method]({ view: state.view }, '', nextUrl.pathname + nextUrl.search)
    renderView()
  }

  function renderStatus(data) {
    var status = $('dev-status')
    var sync = $('dev-sync-status')
    var errors = data.errors.filter(function(item) { return item.error })
    status.className = 'dev-status ' + (errors.length ? 'needs-source' : 'ready')
    status.textContent = errors.length
      ? 'Needs source: ' + errors.map(function(item) { return item.route }).join(', ')
      : 'Ready: loaded from existing Foundation APIs only. No extraction, source-route, sprint-logic, or backlog-write work ran.'
    if (sync) {
      sync.lastChild.textContent = errors.length ? 'Needs source' : 'Live truth'
    }
  }

  function boot() {
    document.addEventListener('click', function(event) {
      var target = event.target.closest('[data-view], [data-view-target]')
      if (!target) return
      event.preventDefault()
      setView(target.dataset.view || target.dataset.viewTarget)
      if (typeof target.blur === 'function') target.blur()
    })
    window.addEventListener('popstate', function() {
      state.view = normalizeView(new URLSearchParams(window.location.search).get('view'))
      renderView()
    })
    renderView()
    Promise.all([
      fetchJson(ROUTES.hub),
      fetchOptional(ROUTES.sprint),
      fetchOptional(ROUTES.backlog),
      fetchOptional(ROUTES.buildLog),
    ]).then(function(results) {
      var hub = results[0]
      if (!hub) return
      state.data = {
        hub: hub,
        sprint: results[1].payload || {},
        backlog: results[2].payload || {},
        buildLog: results[3].payload || {},
        errors: [results[1], results[2], results[3]],
      }
      renderStatus(state.data)
      setView(state.view, true)
    }).catch(function(error) {
      var status = $('dev-status')
      status.className = 'dev-status needs-source'
      status.textContent = error.message || 'Failed to load Dev Team Hub.'
    })
  }

  boot()
})()
