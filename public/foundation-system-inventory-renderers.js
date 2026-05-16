// Foundation Systems and System Inventory renderers split from public/foundation.js.
// Classic script globals are intentional; foundation-router.js calls these route owners after script load.

var capabilityCatalog = {
  'capabilities-skills': {
    title: 'Skills',
    eyebrow: 'System Inventory',
    intro: 'Skills are reusable operating instructions layered on top of tools and plugins. They are not data sources.',
    items: [
      {
        id: 'SKILL-BFOUND-001',
        title: 'BCrew Foundation Skill',
        type: 'Repo skill',
        state: 'Working now',
        tone: 'connected',
        availableTo: 'Coding assistants working inside this repo',
        purpose: 'Keeps strategy, source-trust, and Foundation-accountability work routed to the right home instead of drifting into loose docs or fake live values.',
      },
    ],
    backlogIds: ['SYSTEM-004'],
    statusCards: [
      {
        label: 'Live now',
        status: 'connected',
        detail: 'The rebuild already uses a repo-specific Foundation skill for strategy and source-trust work.',
      },
      {
        label: 'Still open',
        status: 'pending',
        detail: 'There is no full live skill registry in Foundation yet. That surface still needs to be built from runtime truth.',
      },
    ],
  },
  'capabilities-plugins': {
    title: 'Plugins and MCPs',
    eyebrow: 'System Inventory',
    intro: 'Runtime integration surfaces available to the coding stack. They are separate from business sources: a plugin can exist even when no business source is signed off yet.',
    items: [
      {
        id: 'PLUGIN-GDRIVE-001',
        title: 'Google Drive',
        type: 'Plugin / MCP surface',
        state: 'Working now',
        tone: 'connected',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Drive, Docs, Sheets, and Slides access already used during source-validation and doc work.',
      },
      {
        id: 'PLUGIN-GMAIL-001',
        title: 'Gmail',
        type: 'Plugin / MCP surface',
        state: 'Installed / workflow validation pending',
        tone: 'pending',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Email reads, triage, drafts, and mailbox workflows once BCrew boundaries and trust rules are signed off.',
      },
      {
        id: 'PLUGIN-GCAL-001',
        title: 'Google Calendar',
        type: 'Plugin / MCP surface',
        state: 'Installed / workflow validation pending',
        tone: 'pending',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Scheduling, event reads, and meeting-context workflows after trust boundaries are defined.',
      },
      {
        id: 'PLUGIN-CANVA-001',
        title: 'Canva',
        type: 'Plugin / MCP surface',
        state: 'Installed / workflow validation pending',
        tone: 'pending',
        availableTo: 'Codex runtime in this rebuild',
        purpose: 'Design generation and editing once that workflow becomes part of the trusted operating stack.',
      },
    ],
    backlogIds: ['SYSTEM-004'],
    statusCards: [
      {
        label: 'Live now',
        status: 'connected',
        detail: 'The rebuild has real plugin-backed surfaces available in the coding/runtime layer today.',
      },
      {
        label: 'Still open',
        status: 'pending',
        detail: 'Foundation still needs the proper live capabilities surface so plugin and MCP state stops living in scattered tool context.',
      },
    ],
  },
  'capabilities-agents': {
    title: 'Agents',
    eyebrow: 'System Inventory',
    intro: 'Agents are not data sources. This lane is for the agent model, registry, and operations layer.',
    items: [
      {
        id: 'AGENT-STATE-CURRENT',
        title: 'Business Agents',
        type: 'Current state',
        state: 'Not live yet',
        tone: 'missing',
        availableTo: 'Nobody yet',
        purpose: 'No approved business-agent registry exists yet in this rebuild. That is deliberate until the franchise model and boundaries are locked.',
      },
      {
        id: 'TOOL-CODEX-001',
        title: 'Codex / Claude Code',
        type: 'Implementation tools',
        state: 'Working now',
        tone: 'connected',
        availableTo: 'Coding and system-maintenance work',
        purpose: 'These are implementation tools inside the system, not business agents inside the operating model.',
      },
    ],
    backlogIds: ['AGENT-005', 'AGENT-006', 'AGENT-007', 'AGENT-008', 'INFRA-003', 'SYSTEM-011'],
    statusCards: [
      {
        label: 'Live now',
        status: 'connected',
        detail: 'The boundary is now explicit: coding assistants are tools, not business agents.',
      },
      {
        label: 'Still open',
        status: 'pending',
        detail: 'The franchise model, Agent Registry, Agent Operations, and isolated deployment model still need to be built before business agents go live.',
      },
    ],
  },
}

var currentInventoryDocCategories = [
  'Active doctrine',
  'Process & runbooks',
  'Source notes',
  'Specs',
  'Strategy reference',
  'Agent personas',
  'User profile',
]

var archiveHistoryInventoryDocCategories = [
  'Archive',
  'Plan history',
  'Recent audits - active',
  'Recent handoffs - active',
]

function buildByKey(items, keyName) {
  var map = {}
  ;(items || []).forEach(function(item) {
    var key = item && item[keyName]
    if (key) map[key] = item
  })
  return map
}

function renderFoundationSystemLinkedList(titleText, items, className) {
  var wrap = document.createElement('div')
  wrap.className = className || 'foundation-system-detail-list'

  var title = document.createElement('div')
  title.className = 'foundation-system-detail-title'
  title.textContent = titleText
  wrap.appendChild(title)

  var list = document.createElement('div')
  list.className = 'foundation-system-detail-items'
  if (!items || !items.length) {
    var empty = document.createElement('span')
    empty.className = 'foundation-system-empty'
    empty.textContent = 'None mapped yet'
    list.appendChild(empty)
  } else {
    items.forEach(function(item) {
      if (item.href) {
        var link = document.createElement('a')
        link.className = 'foundation-system-pill'
        link.href = item.href
        link.textContent = item.label
        list.appendChild(link)
      } else {
        var pill = document.createElement('span')
        pill.className = 'foundation-system-pill'
        pill.textContent = item.label
        list.appendChild(pill)
      }
    })
  }
  wrap.appendChild(list)
  return wrap
}

function renderFoundationSystemBacklogItems(system, backlogMap) {
  var ids = Array.isArray(system.backlogIds) ? system.backlogIds : []
  var items = ids.map(function(id) { return backlogMap[id] || { id: id, title: 'Not in live backlog snapshot', lane: 'missing' } })

  var wrap = document.createElement('div')
  wrap.className = 'foundation-system-backlog'

  var title = document.createElement('div')
  title.className = 'foundation-system-detail-title'
  title.textContent = 'Tracked work'
  wrap.appendChild(title)

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'foundation-system-empty'
    empty.textContent = 'No backlog cards mapped yet.'
    wrap.appendChild(empty)
    return wrap
  }

  items.forEach(function(item) {
    var row = document.createElement('a')
    row.className = 'foundation-system-backlog-row'
    row.href = item.id ? '/foundation#backlog:' + item.id : '/foundation#backlog'

    var top = document.createElement('div')
    top.className = 'foundation-system-backlog-top'
    var id = document.createElement('span')
    id.textContent = item.id || 'Unknown'
    top.appendChild(id)
    var lane = document.createElement('span')
    lane.textContent = [item.priority, item.lane].filter(Boolean).join(' · ') || 'Not classified'
    top.appendChild(lane)
    row.appendChild(top)

    var itemTitle = document.createElement('div')
    itemTitle.className = 'foundation-system-backlog-title'
    itemTitle.textContent = item.title || 'Untitled backlog item'
    row.appendChild(itemTitle)

    if (item.nextAction) {
      var next = document.createElement('div')
      next.className = 'foundation-system-backlog-next'
      next.textContent = item.nextAction
      row.appendChild(next)
    }

    wrap.appendChild(row)
  })

  return wrap
}

function renderFoundationSystemJobs(system, jobMap, latestRunMap) {
  var keys = Array.isArray(system.runtimeJobKeys) ? system.runtimeJobKeys : []
  var rows = keys.map(function(key) {
    var job = jobMap[key] || { key: key, title: key, runtimeMode: 'unmapped' }
    var run = latestRunMap[key]
    return {
      label: [
        job.key || key,
        job.title && job.title !== job.key ? job.title : '',
      ].filter(Boolean).join(' - '),
      meta: [
        job.enabled === false ? 'disabled' : 'enabled',
        job.runtimeMode || '',
        job.cadence || '',
        run && run.status ? 'latest ' + run.status : '',
      ].filter(Boolean).join(' · '),
    }
  })

  var wrap = document.createElement('div')
  wrap.className = 'foundation-system-jobs'
  var title = document.createElement('div')
  title.className = 'foundation-system-detail-title'
  title.textContent = 'Runtime jobs'
  wrap.appendChild(title)

  if (!rows.length) {
    var empty = document.createElement('p')
    empty.className = 'foundation-system-empty'
    empty.textContent = 'No runtime jobs mapped to this system yet.'
    wrap.appendChild(empty)
    return wrap
  }

  rows.forEach(function(row) {
    var item = document.createElement('div')
    item.className = 'foundation-system-job-row'
    var label = document.createElement('div')
    label.className = 'foundation-system-job-label'
    label.textContent = row.label
    item.appendChild(label)
    var meta = document.createElement('div')
    meta.className = 'foundation-system-job-meta'
    meta.textContent = row.meta || 'No runtime metadata'
    item.appendChild(meta)
    wrap.appendChild(item)
  })

  return wrap
}

function renderFoundationSystemFullCard(system, context) {
  var sourceContractMap = context.sourceContractMap || {}
  var connectorMap = context.connectorMap || {}
  var backlogMap = context.backlogMap || {}
  var jobMap = context.jobMap || {}
  var latestRunMap = context.latestRunMap || {}

  var details = document.createElement('details')
  details.className = 'foundation-system-stack-item'
  if (system.systemId) details.id = system.systemId

  var summary = document.createElement('summary')
  summary.className = 'foundation-system-summary'

  var left = document.createElement('div')
  left.className = 'foundation-system-summary-left'
  var title = document.createElement('div')
  title.className = 'foundation-system-summary-title'
  title.textContent = system.title || system.systemId
  left.appendChild(title)
  var meta = document.createElement('div')
  meta.className = 'foundation-system-summary-meta'
  meta.textContent = [system.serviceArea, system.systemId, system.maturityLevel, system.status].filter(Boolean).join(' · ')
  left.appendChild(meta)
  summary.appendChild(left)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags foundation-system-summary-tags'
  tags.appendChild(renderSourceTag(system.implementationState || 'partial', getFoundationSystemImplementationTone(system.implementationState)))
  tags.appendChild(renderSourceTag(system.maturityLabel || system.maturityLevel || 'Mapped', 'neutral'))
  tags.appendChild(renderSourceTag(system.status || 'Mapped', system.status === 'Not built' ? 'missing' : 'planned'))
  summary.appendChild(tags)
  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'foundation-system-body'

  var purpose = document.createElement('p')
  purpose.className = 'foundation-system-purpose'
  purpose.textContent = system.purpose || ''
  body.appendChild(purpose)

  var statusGrid = document.createElement('div')
  statusGrid.className = 'foundation-system-status-grid'
  statusGrid.appendChild(renderSourceMetaItem('Primary service area', system.serviceArea || 'Needs service area'))
  statusGrid.appendChild(renderSourceMetaItem('Current state', system.currentState || system.trustState || 'Not documented'))
  statusGrid.appendChild(renderSourceMetaItem('Next level plan', system.nextLevelPlan || 'Not documented'))
  statusGrid.appendChild(renderSourceMetaItem('Boundary', system.trustState || 'Not documented'))
  body.appendChild(statusGrid)

  if (Array.isArray(system.secondaryServiceAreas) && system.secondaryServiceAreas.length) {
    body.appendChild(renderSourceBulletGroup('Secondary service areas', system.secondaryServiceAreas))
  }

  var sourceItems = (system.sourceIds || []).map(function(id) {
    var contract = sourceContractMap[id]
    return {
      label: contract ? id + ' - ' + contract.title : id,
      href: '/foundation#source-overview:' + id,
    }
  })
  body.appendChild(renderFoundationSystemLinkedList('Source contracts', sourceItems))

  var supportingSourceItems = (system.supportingSourceIds || []).map(function(id) {
    var contract = sourceContractMap[id]
    return {
      label: contract ? id + ' - ' + contract.title : id,
      href: '/foundation#source-overview:' + id,
    }
  })
  if (supportingSourceItems.length) {
    body.appendChild(renderFoundationSystemLinkedList('Supporting evidence sources', supportingSourceItems))
  }

  var connectorItems = (system.connectorIds || []).map(function(id) {
    var connector = connectorMap[id]
    return {
      label: connector ? id + ' - ' + connector.title : id,
      href: '/foundation#source-connectors:' + id,
    }
  })
  body.appendChild(renderFoundationSystemLinkedList('Connectors', connectorItems))

  if (Array.isArray(system.appliesTo) && system.appliesTo.length) {
    body.appendChild(renderSourceBulletGroup('Applies to', system.appliesTo))
  }

  body.appendChild(renderFoundationSystemJobs(system, jobMap, latestRunMap))
  body.appendChild(renderFoundationSystemBacklogItems(system, backlogMap))
  appendSourceActions(body, system.actions || [])

  details.appendChild(body)
  return details
}

function getFoundationSystemImplementationTone(state) {
  if (state === 'live') return 'connected'
  if (state === 'planned') return 'pending'
  if (state === 'partial') return 'planned'
  return 'missing'
}

function groupFoundationSystemsByServiceArea(systems, serviceAreas) {
  var grouped = {}
  ;(serviceAreas || []).forEach(function(area) {
    grouped[area] = []
  })

  ;(systems || []).forEach(function(system) {
    var area = system.serviceArea || 'Needs service area'
    if (!grouped[area]) grouped[area] = []
    grouped[area].push(system)
  })

  return grouped
}

function renderFoundationSystemsServiceAreaSummary(systems, serviceAreas) {
  var panel = document.createElement('section')
  panel.className = 'panel foundation-service-area-summary'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Business View'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Service areas'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Systems are grouped by the part of the business they serve first. Technical details stay inside each system card.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'foundation-service-area-summary-grid'
  var grouped = groupFoundationSystemsByServiceArea(systems, serviceAreas)
  ;(serviceAreas || []).forEach(function(area) {
    var item = document.createElement('div')
    item.className = 'foundation-service-area-summary-item'
    var label = document.createElement('div')
    label.className = 'foundation-service-area-summary-label'
    label.textContent = area
    item.appendChild(label)
    var count = document.createElement('div')
    count.className = 'foundation-service-area-summary-count'
    var total = (grouped[area] || []).length
    count.textContent = total + (total === 1 ? ' system' : ' systems')
    item.appendChild(count)
    grid.appendChild(item)
  })
  panel.appendChild(grid)
  return panel
}

function renderFoundationSystemsServiceAreaGroup(area, systems, context) {
  var group = document.createElement('section')
  group.className = 'foundation-service-area-group'
  group.setAttribute('data-service-area', area)

  var header = document.createElement('div')
  header.className = 'foundation-service-area-header'
  var left = document.createElement('div')
  var title = document.createElement('h4')
  title.textContent = area
  left.appendChild(title)
  var detail = document.createElement('p')
  detail.textContent = systems.length
    ? systems.length + (systems.length === 1 ? ' mapped system' : ' mapped systems')
    : 'No mapped systems yet.'
  left.appendChild(detail)
  header.appendChild(left)
  group.appendChild(header)

  var body = document.createElement('div')
  body.className = 'foundation-service-area-systems'
  if (!systems.length) {
    var empty = document.createElement('p')
    empty.className = 'foundation-system-empty'
    empty.textContent = 'No mapped systems yet.'
    body.appendChild(empty)
  } else {
    systems.forEach(function(system) {
      body.appendChild(renderFoundationSystemFullCard(system, context))
    })
  }
  group.appendChild(body)
  return group
}

function renderFoundationSystems() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading systems.</p>'

  Promise.all([fetchSourceOfTruth(), fetchFoundationHub()]).then(function(results) {
    var sourceData = results[0]
    var hub = results[1]
    var systems = sourceData.groupedSystems || []
    var serviceAreas = sourceData.systemServiceAreas || []
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'
    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'
    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation Systems'
    heroInner.appendChild(heroTitle)
    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = 'Business-first map of the systems that run the company: what each system is for, which service area owns it, what is partial, and which source-backed details prove it.'
    heroInner.appendChild(heroCopy)
    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = systems.length + ' systems mapped · ' + serviceAreas.length + ' service areas · ' + (sourceData.sources || []).length + ' source contracts · ' + ((hub.foundationJobs && hub.foundationJobs.jobs) || []).length + ' runtime jobs'
    heroInner.appendChild(heroMeta)
    hero.appendChild(heroInner)

    container.appendChild(hero)

    var statusPanel = renderOverviewStatusPanel([
      {
        label: 'Purpose',
        status: 'connected',
        detail: 'This page answers what each system is for and what has to happen before it reaches the next level.',
      },
      {
        label: 'Source Proof',
        status: 'connected',
        detail: 'Every system lists the source contracts and source notes that prove what AIOS understands.',
      },
      {
        label: 'Execution Path',
        status: 'pending',
        detail: 'Each system lists mapped jobs and backlog cards so next work does not disappear into chat.',
      },
    ], {
      eyebrow: 'How To Use This',
      title: 'Systems Are The Middle Layer',
      intro: 'Sources are the raw inputs. Systems are the operating bundles. Hubs use systems.',
    })
    if (statusPanel) container.appendChild(statusPanel)
    container.appendChild(renderFoundationSystemsServiceAreaSummary(systems, serviceAreas))

    var sourceContractMap = buildByKey(sourceData.sources || [], 'sourceId')
    var connectorMap = buildByKey(sourceData.connectors || [], 'connectorId')
    var backlogMap = buildByKey(hub.backlogItems || [], 'id')
    var jobs = (hub.foundationJobs && hub.foundationJobs.jobs) || []
    var latestRuns = (hub.foundationJobs && hub.foundationJobs.latestRuns) || []
    var jobMap = buildByKey(jobs, 'key')
    var latestRunMap = buildByKey(latestRuns, 'jobKey')

    var panel = document.createElement('section')
    panel.className = 'panel foundation-systems-panel'
    var header = document.createElement('div')
    header.className = 'panel-header'
    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'System Map'
    left.appendChild(eyebrow)
    var title = document.createElement('h3')
    title.textContent = 'Systems by service area'
    left.appendChild(title)
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'Open a system to see business purpose first, then source contracts, connectors, runtime jobs, notes, backlog cards, and next-level plan.'
    left.appendChild(intro)
    header.appendChild(left)
    panel.appendChild(header)

    var stack = document.createElement('div')
    stack.className = 'foundation-service-area-stack'
    var grouped = groupFoundationSystemsByServiceArea(systems, serviceAreas)
    serviceAreas.forEach(function(area) {
      stack.appendChild(renderFoundationSystemsServiceAreaGroup(area, grouped[area] || [], {
        sourceContractMap: sourceContractMap,
        connectorMap: connectorMap,
        backlogMap: backlogMap,
        jobMap: jobMap,
        latestRunMap: latestRunMap,
      }))
    })
    panel.appendChild(stack)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Systems could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderCapabilityCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title = document.createElement('h4')
  title.textContent = item.title
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = item.id
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  if (item.type) tags.appendChild(renderSourceTag(item.type, 'neutral'))
  tags.appendChild(renderSourceTag(item.state, item.tone || 'pending'))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = item.purpose
  article.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  grid.appendChild(renderSourceMetaItem('Available to', item.availableTo || 'Not set'))
  article.appendChild(grid)

  return article
}

function getInventoryUsageTag(doc) {
  if (doc.usage === 'runtime') return { label: 'Used now', tone: 'connected' }
  if (doc.usage === 'private-local') return { label: 'Private local', tone: 'missing' }
  return { label: 'Reference', tone: 'pending' }
}

function renderInventoryDocCard(doc) {
  var article = document.createElement('article')
  article.className = 'section-card source-card'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'source-card-title-wrap'

  var title
  if (doc.openHref) {
    title = document.createElement('a')
    title.className = 'inventory-doc-link'
    title.href = doc.openHref
    title.textContent = doc.title
    if (doc.usage === 'private-local') {
      title.target = '_blank'
      title.rel = 'noopener noreferrer'
    }
  } else {
    title = document.createElement('h4')
    title.textContent = doc.title
  }
  titleWrap.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-card-id'
  meta.textContent = doc.path
  titleWrap.appendChild(meta)
  article.appendChild(titleWrap)

  var tags = document.createElement('div')
  tags.className = 'source-card-tags'
  tags.appendChild(renderSourceTag(doc.storageClass || 'Doc', 'neutral'))
  var usageTag = getInventoryUsageTag(doc)
  tags.appendChild(renderSourceTag(usageTag.label, usageTag.tone))
  if (doc.surfaceLabel) tags.appendChild(renderSourceTag('Surfaced', 'planned'))
  article.appendChild(tags)

  var copy = document.createElement('p')
  copy.className = 'source-card-copy'
  copy.textContent = doc.role
  article.appendChild(copy)

  var grid = document.createElement('div')
  grid.className = 'source-card-meta-grid'
  if (doc.surfaceLabel) grid.appendChild(renderSourceMetaItem('Surface', doc.surfaceLabel))
  grid.appendChild(renderSourceMetaItem('Edit mode', doc.editMode || 'Manual only'))
  if (doc.updatedAt) grid.appendChild(renderSourceMetaItem('Updated', formatDate(doc.updatedAt)))
  if (typeof doc.lines === 'number') grid.appendChild(renderSourceMetaItem('Lines', String(doc.lines)))
  article.appendChild(grid)

  if (doc.whyHidden) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Why hidden', doc.whyHidden))
  }

  if (doc.usage === 'private-local' && doc.localOpenReason) {
    article.appendChild(renderLabeledCopy('decision-meta', 'Local open status', doc.localOpenReason))
  }

  var actions = []
  if (doc.openHref) actions.push({ label: doc.usage === 'private-local' ? 'Open Local Doc' : 'Open Doc', href: doc.openHref, targetBlank: doc.usage === 'private-local' })
  if (doc.surfaceHref) actions.push({ label: 'Open Surface', href: doc.surfaceHref })
  appendSourceActions(article, actions)

  return article
}

function renderInventoryGroupStack(groupTitle, introText, items) {
  if (!items || !items.length) return null

  var details = document.createElement('details')
  details.className = 'source-stack'

  var summary = document.createElement('summary')
  summary.className = 'source-stack-summary source-stack-summary-connected'

  var left = document.createElement('div')
  left.className = 'source-stack-summary-left'

  var title = document.createElement('div')
  title.className = 'source-stack-title'
  title.textContent = groupTitle
  left.appendChild(title)

  var intro = document.createElement('div')
  intro.className = 'source-stack-intro'
  intro.textContent = introText
  left.appendChild(intro)

  summary.appendChild(left)

  var count = document.createElement('span')
  count.className = 'source-stack-count'
  count.textContent = items.length
  summary.appendChild(count)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-stack-body'
  items.forEach(function(item) {
    body.appendChild(renderInventoryDocCard(item))
  })
  details.appendChild(body)
  return details
}

function renderFoundationIdentityPanel(identity) {
  if (!identity) return null

  var runtimeDocs = identity.workspaceRuntimeDocs || []
  var localMemory = identity.localPrivateMemory || {}
  var dailyMemory = localMemory.dailyMemory || {}
  var capabilities = identity.runtimeCapabilities || {}
  var skills = capabilities.skills || {}
  var plugins = capabilities.plugins || {}
  var bcrewSkill = skills.bcrewFoundationSkill || {}

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Workspace Identity'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = 'What guides the system'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = identity.plainEnglish || 'Foundation shows the active guidance stack without copying private local memory content into shared system truth.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var statusItems = [
    {
      label: 'Identity status',
      status: identity.status === 'healthy' ? 'connected' : 'pending',
      detail: identity.status || 'unknown',
    },
    {
      label: 'Repo-visible docs',
      status: runtimeDocs.length ? 'connected' : 'pending',
      detail: runtimeDocs.length + ' identity and doctrine docs are tracked as repo-visible truth.',
    },
    {
      label: 'Private memory',
      status: localMemory.contentCopied === false ? 'connected' : 'risk',
      detail: 'Root docs plus ' + (dailyMemory.fileCount || 0) + ' daily memory files are metadata-only.',
    },
    {
      label: 'bcrew-foundation',
      status: bcrewSkill.detected ? 'connected' : 'risk',
      detail: bcrewSkill.detected ? 'Runtime skill detected: ' + (bcrewSkill.path || bcrewSkill.id) : 'Runtime skill not detected.',
    },
    {
      label: 'Plugins',
      status: plugins.sourceTruthApproved === false ? 'connected' : 'risk',
      detail: (plugins.total || 0) + ' plugin surfaces / ' + (plugins.skillCount || 0) + ' plugin skills. Runtime capability only, not source-truth signoff.',
    },
  ]
  var statusGrid = document.createElement('div')
  statusGrid.className = 'status-grid'
  statusItems.forEach(function(item) {
    statusGrid.appendChild(renderStatusCard(item))
  })
  panel.appendChild(statusGrid)

  var identityGrid = document.createElement('div')
  identityGrid.className = 'source-card-grid'

  var repoCard = document.createElement('article')
  repoCard.className = 'section-card source-card'
  var repoTitle = document.createElement('h4')
  repoTitle.textContent = 'Repo-visible guidance'
  repoCard.appendChild(repoTitle)
  var repoCopy = document.createElement('p')
  repoCopy.className = 'source-card-copy'
  repoCopy.textContent = 'Safe shared doctrine includes docs/users/steve.md, AGENTS.md, SOUL.md, and privacy/doctrine process docs when tracked.'
  repoCard.appendChild(repoCopy)
  var repoMeta = document.createElement('div')
  repoMeta.className = 'source-card-meta-grid'
  repoMeta.appendChild(renderSourceMetaItem('Visible profile', identity.repoVisibleProfile && identity.repoVisibleProfile.path ? identity.repoVisibleProfile.path : 'missing'))
  repoMeta.appendChild(renderSourceMetaItem('Docs detected', String(runtimeDocs.filter(function(doc) { return doc.exists }).length)))
  repoCard.appendChild(repoMeta)
  identityGrid.appendChild(repoCard)

  var privateCard = document.createElement('article')
  privateCard.className = 'section-card source-card'
  var privateTitle = document.createElement('h4')
  privateTitle.textContent = 'Local-private memory'
  privateCard.appendChild(privateTitle)
  var privateCopy = document.createElement('p')
  privateCopy.className = 'source-card-copy'
  privateCopy.textContent = 'USER.md, MEMORY.md, and memory/*.md are listed as metadata-only signals. Their content is not copied into shared Foundation truth.'
  privateCard.appendChild(privateCopy)
  var privateMeta = document.createElement('div')
  privateMeta.className = 'source-card-meta-grid'
  privateMeta.appendChild(renderSourceMetaItem('Root docs', String((localMemory.rootDocs || []).length)))
  privateMeta.appendChild(renderSourceMetaItem('Daily memory', String(dailyMemory.fileCount || 0)))
  privateMeta.appendChild(renderSourceMetaItem('Content mode', localMemory.contentMode || 'metadata-only'))
  privateCard.appendChild(privateMeta)
  identityGrid.appendChild(privateCard)

  var runtimeCard = document.createElement('article')
  runtimeCard.className = 'section-card source-card'
  var runtimeTitle = document.createElement('h4')
  runtimeTitle.textContent = 'Runtime instructions'
  runtimeCard.appendChild(runtimeTitle)
  var runtimeCopy = document.createElement('p')
  runtimeCopy.className = 'source-card-copy'
  runtimeCopy.textContent = 'Skills guide assistants and plugins expose local tool surfaces. They are not business agents and they are not data-source approval.'
  runtimeCard.appendChild(runtimeCopy)
  var runtimeMeta = document.createElement('div')
  runtimeMeta.className = 'source-card-meta-grid'
  runtimeMeta.appendChild(renderSourceMetaItem('Skills', String(skills.total || 0)))
  runtimeMeta.appendChild(renderSourceMetaItem('Workspace skills', String(skills.workspace || 0)))
  runtimeMeta.appendChild(renderSourceMetaItem('Plugins', String(plugins.total || 0)))
  runtimeCard.appendChild(runtimeMeta)
  identityGrid.appendChild(runtimeCard)

  panel.appendChild(identityGrid)
  return panel
}

function isArchiveHistoryDoc(doc) {
  var category = String(doc && doc.category || '')
  var docPath = String(doc && doc.path || '')
  if (archiveHistoryInventoryDocCategories.indexOf(category) !== -1) return true
  if (docPath.indexOf('docs/_archive/') === 0) return true
  if (docPath.indexOf('docs/rebuild/plan-history/') === 0) return true
  return /\b(retired|superseded|history|archive)\b/i.test(docPath)
}

function isCurrentInventoryDoc(doc) {
  return currentInventoryDocCategories.indexOf(String(doc && doc.category || '')) !== -1 && !isArchiveHistoryDoc(doc)
}

function splitInventoryDocs(trackedDocs) {
  var split = {
    currentDocs: [],
    archiveHistoryDocs: [],
    uncategorizedDocs: [],
  }

  ;(trackedDocs || []).forEach(function(doc) {
    if (isArchiveHistoryDoc(doc)) {
      split.archiveHistoryDocs.push(doc)
    } else if (isCurrentInventoryDoc(doc)) {
      split.currentDocs.push(doc)
    } else {
      split.uncategorizedDocs.push(doc)
    }
  })

  return split
}

function renderInventoryDocs() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading docs inventory.</p>'

  fetchSystemInventory().then(function(inventory) {
    container.innerHTML = ''

    var trackedDocs = inventory.docs && inventory.docs.tracked ? inventory.docs.tracked : []
    var privateLocalDocs = inventory.docs && inventory.docs.privateLocal ? inventory.docs.privateLocal : []
    var inventorySplit = splitInventoryDocs(trackedDocs)
    var currentDocs = inventorySplit.currentDocs
    var archiveHistoryDocs = inventorySplit.archiveHistoryDocs
    var runtimeDocs = currentDocs.filter(function(doc) { return doc.usage === 'runtime' })
    var referenceDocs = currentDocs.filter(function(doc) { return doc.usage !== 'runtime' })
    var surfacedDocs = currentDocs.filter(function(doc) { return !!doc.surfaceHref })
    var docCategorySummary = inventory.docs && inventory.docs.categorySummary ? inventory.docs.categorySummary : {}
    var trackedOtherCount = currentDocs.filter(function(doc) { return doc.category === 'Other' }).length

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroEyebrow = document.createElement('div')
    heroEyebrow.className = 'eyebrow'
    heroEyebrow.textContent = 'System Inventory'
    heroInner.appendChild(heroEyebrow)

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Current Docs'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = currentDocs.length + ' current docs · ' + archiveHistoryDocs.length + ' archive/history docs preserved separately · ' + privateLocalDocs.length + ' private local docs'
    heroInner.appendChild(heroMeta)

    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = 'Use this default view for current operating docs. Archive and history evidence stay preserved in their own lane.'
    heroInner.appendChild(heroCopy)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderSystemInventoryPurposePanel('inventory-docs', {
      inventory: inventory,
      trackedDocs: currentDocs,
      privateLocalDocs: privateLocalDocs,
      archiveHistoryDocs: archiveHistoryDocs,
    })
    if (purposePanel) container.appendChild(purposePanel)

    var identityPanel = renderFoundationIdentityPanel(inventory.identity)
    if (identityPanel) container.appendChild(identityPanel)

    var statusPanel = renderOverviewStatusPanel([
      {
        label: 'Live runtime docs',
        status: 'connected',
        detail: runtimeDocs.length + ' docs are part of the active operating system right now.',
      },
      {
        label: 'Current reference docs',
        status: 'pending',
        detail: referenceDocs.length + ' current docs are stored as references, specs, source notes, or strategy support.',
      },
      {
        label: 'Shown in Foundation',
        status: 'connected',
        detail: surfacedDocs.length + ' docs are directly tied to a visible system surface today.',
      },
      {
        label: 'Archive / History',
        status: 'connected',
        detail: archiveHistoryDocs.length + ' archive, plan-history, audit, and handoff docs are preserved in Archive / History instead of this default view.',
      },
      {
        label: 'Private local docs',
        status: privateLocalDocs.length ? 'pending' : 'connected',
        detail: privateLocalDocs.length
          ? privateLocalDocs.length + ' local-private docs exist and are listed with a reason instead of being silently hidden.'
          : 'No private local markdown files detected.',
      },
      {
        label: 'Doc categories',
        status: trackedOtherCount ? 'risk' : 'connected',
        detail: Object.keys(docCategorySummary).length + ' approved categories tracked; ' + trackedOtherCount + ' tracked docs remain in Other.',
      },
    ], {
      eyebrow: 'Inventory State',
      title: 'Doc visibility',
      intro: 'Every doc should be shown, inventoried, or deliberately private with a reason.',
    })
    if (statusPanel) container.appendChild(statusPanel)

    var groups = {}
    currentDocs.forEach(function(doc) {
      if (!groups[doc.category]) groups[doc.category] = []
      groups[doc.category].push(doc)
    })

    var panel = document.createElement('section')
    panel.className = 'panel'

    var header = document.createElement('div')
    header.className = 'panel-header'

    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Tracked docs'
    left.appendChild(eyebrow)

    var title = document.createElement('h3')
    title.textContent = 'Repo docs by role'
    left.appendChild(title)

    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'Current tracked markdown docs are grouped by role. Archive, plan-history, audit, and handoff evidence is intentionally separated from this default view.'
    left.appendChild(intro)

    header.appendChild(left)
    panel.appendChild(header)

    var board = document.createElement('div')
    board.className = 'source-contract-stack'
    Object.keys(groups).sort().forEach(function(groupKey) {
      var stack = renderInventoryGroupStack(groupKey, 'Grouped by role so current operating docs stay separate from preserved history.', groups[groupKey])
      if (stack) board.appendChild(stack)
    })
    panel.appendChild(board)
    container.appendChild(panel)

    if (privateLocalDocs.length) {
      var privatePanel = document.createElement('section')
      privatePanel.className = 'panel'

      var privateHeader = document.createElement('div')
      privateHeader.className = 'panel-header'

      var privateLeft = document.createElement('div')
      var privateEyebrow = document.createElement('div')
      privateEyebrow.className = 'eyebrow'
      privateEyebrow.textContent = 'Local Private'
      privateLeft.appendChild(privateEyebrow)

      var privateTitle = document.createElement('h3')
      privateTitle.textContent = 'Local-private docs not shown in shared pages'
      privateLeft.appendChild(privateTitle)

      var privateIntro = document.createElement('p')
      privateIntro.className = 'section-intro'
      privateIntro.textContent = 'These files are listed with a reason, but their content stays out of shared pages by default.'
      privateLeft.appendChild(privateIntro)

      privateHeader.appendChild(privateLeft)
      privatePanel.appendChild(privateHeader)

      var privateBoard = document.createElement('div')
      privateBoard.className = 'source-contract-stack'
      privateLocalDocs.forEach(function(doc) {
        privateBoard.appendChild(renderInventoryDocCard(doc))
      })
      privatePanel.appendChild(privateBoard)
      container.appendChild(privatePanel)
    }
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Docs inventory could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderInventoryArchiveHistory() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading archive and history inventory.</p>'

  fetchSystemInventory().then(function(inventory) {
    container.innerHTML = ''

    var trackedDocs = inventory.docs && inventory.docs.tracked ? inventory.docs.tracked : []
    var inventorySplit = splitInventoryDocs(trackedDocs)
    var archiveHistoryDocs = inventorySplit.archiveHistoryDocs
    var currentDocs = inventorySplit.currentDocs

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroEyebrow = document.createElement('div')
    heroEyebrow.className = 'eyebrow'
    heroEyebrow.textContent = 'System Inventory'
    heroInner.appendChild(heroEyebrow)

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Archive / History'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = archiveHistoryDocs.length + ' preserved archive/history docs · ' + currentDocs.length + ' current docs stay in Current Docs'
    heroInner.appendChild(heroMeta)

    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = 'Use this lane when you need old evidence, audits, handoffs, or retired plans. It is preserved history, not the current command surface.'
    heroInner.appendChild(heroCopy)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderOverviewStatusPanel([
      {
        label: 'Purpose',
        status: 'connected',
        detail: 'Preserve old evidence without mixing it into the current-doc default view.',
      },
      {
        label: 'Current docs separated',
        status: 'connected',
        detail: currentDocs.length + ' current docs remain in System Inventory > Current Docs.',
      },
      {
        label: 'History preserved',
        status: archiveHistoryDocs.length ? 'connected' : 'pending',
        detail: archiveHistoryDocs.length + ' archive, plan-history, audit, and handoff docs are still reachable here.',
      },
    ], {
      eyebrow: 'Archive Boundary',
      title: 'Preserved evidence, not current command truth',
      intro: 'Current Plan, Current State, Systems, Data Sources, and Backlog remain the daily truth surfaces.',
    })
    if (purposePanel) container.appendChild(purposePanel)

    var groups = {}
    archiveHistoryDocs.forEach(function(doc) {
      if (!groups[doc.category]) groups[doc.category] = []
      groups[doc.category].push(doc)
    })

    var panel = document.createElement('section')
    panel.className = 'panel'

    var header = document.createElement('div')
    header.className = 'panel-header'

    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Preserved Docs'
    left.appendChild(eyebrow)

    var title = document.createElement('h3')
    title.textContent = 'Archive and history docs by role'
    left.appendChild(title)

    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'These docs are kept for evidence and continuity. They do not compete with current doctrine or the live Backlog.'
    left.appendChild(intro)

    header.appendChild(left)
    panel.appendChild(header)

    var board = document.createElement('div')
    board.className = 'source-contract-stack'
    Object.keys(groups).sort().forEach(function(groupKey) {
      var stack = renderInventoryGroupStack(groupKey, 'Preserved history kept reachable without crowding the current-doc view.', groups[groupKey])
      if (stack) board.appendChild(stack)
    })
    panel.appendChild(board)
    container.appendChild(panel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Archive and history inventory could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderSystemInventoryPurposePanel(section, context) {
  var ctx = context || {}
  var inventory = ctx.inventory || {}
  var trackedDocs = ctx.trackedDocs || (inventory.docs && inventory.docs.tracked) || []
  var privateLocalDocs = ctx.privateLocalDocs || (inventory.docs && inventory.docs.privateLocal) || []
  var archiveHistoryDocs = ctx.archiveHistoryDocs || []
  var skills = ctx.skills || inventory.skills || []
  var plugins = ctx.plugins || inventory.plugins || []
  var agentSystem = ctx.agentSystem || null
  var title = 'Inventory Page Job'
  var statusCards = []

  if (section === 'inventory-docs') {
    title = 'Current Docs inventory job'
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show current tracked markdown docs plus local-private metadata, while keeping archive/history evidence out of the default view.',
      },
      {
        label: 'Live backing',
        status: 'connected',
        detail: trackedDocs.length + ' current docs, ' + archiveHistoryDocs.length + ' archive/history docs, and ' + privateLocalDocs.length + ' local-private docs from /api/system-inventory.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'Current Docs is storage inventory, not active doctrine. Current Plan, Overview, Systems, Data Sources, and the live Backlog decide operational truth.',
      },
    ]
  } else if (section === 'capabilities-skills') {
    title = 'Skills inventory job'
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show reusable Codex/runtime instructions available in this environment.',
      },
      {
        label: 'Live backing',
        status: skills.length ? 'connected' : 'pending',
        detail: skills.length + ' skills detected from the local runtime inventory.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'Skills guide assistants. They are not business agents, data sources, or source-signoff proof.',
      },
    ]
  } else if (section === 'capabilities-plugins') {
    title = 'Plugins and MCPs inventory job'
    statusCards = [
      {
        label: 'Page job',
        status: 'connected',
        detail: 'Show installed local plugin and MCP surfaces available to the coding/runtime layer.',
      },
      {
        label: 'Live backing',
        status: plugins.length ? 'connected' : 'pending',
        detail: plugins.length + ' plugin/MCP surfaces detected from the local runtime inventory.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'A plugin can exist even when the related business source is not signed off. Use Data Sources for source truth.',
      },
    ]
  } else if (section === 'capabilities-agents') {
    title = 'Agents inventory job'
    statusCards = [
      {
        label: 'Page job',
        status: 'pending',
        detail: 'Show the current agent-system boundary while the real Agent Registry and Agent Operations surfaces are still backlog work.',
      },
      {
        label: 'Live backing',
        status: agentSystem ? 'connected' : 'pending',
        detail: agentSystem
          ? 'Backed by ' + agentSystem.systemId + ' in the Foundation Systems map: ' + (agentSystem.status || 'mapped') + '.'
          : 'No source-backed agent system is mapped yet.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'This is not a live Agent Registry yet. AGENT-006 owns registry, AGENT-007 owns operations, and AGENT-010 owns personal-agent onboarding.',
      },
    ]
  }

  if (!statusCards.length) return null
  return renderOverviewStatusPanel(statusCards, {
    eyebrow: 'Page Purpose',
    title: title,
    intro: 'System Inventory pages show repo and runtime capability surfaces. They do not replace Data Sources or Systems.',
  })
}

function renderCapabilitySection(section) {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading capabilities.</p>'

  Promise.all([fetchFoundationHub(), fetchSystemInventory(), fetchSourceOfTruth()]).then(function(results) {
    var hub = results[0]
    var inventory = results[1]
    var sourceData = results[2]
    container.innerHTML = ''

    var config = capabilityCatalog[section]
    if (!config) {
      renderOverview()
      return
    }

    var liveItems = config.items || []
    var statusCards = config.statusCards || []
    var agentSystem = (sourceData.groupedSystems || []).filter(function(system) {
      return system.systemId === 'SYS-AGENTS-001'
    })[0] || null

    if (section === 'capabilities-skills') {
      liveItems = (inventory.skills || []).map(function(skill) {
        return {
          id: skill.id,
          title: skill.title,
          type: skill.scope,
          state: 'Installed',
          tone: 'connected',
          availableTo: 'Coding/runtime layer on this machine',
          purpose: skill.description || 'Skill inventory item',
        }
      })

      var workspaceSkills = liveItems.filter(function(item) { return item.type === 'Workspace skill' }).length
      statusCards = [
        {
          label: 'Workspace skill',
          status: workspaceSkills ? 'connected' : 'pending',
          detail: workspaceSkills + ' repo-specific workspace skill is installed in this environment.',
        },
        {
          label: 'System skills',
          status: liveItems.length - workspaceSkills ? 'connected' : 'pending',
          detail: (liveItems.length - workspaceSkills) + ' built-in system skills are available in this environment.',
        },
        {
          label: 'Boundary',
          status: 'pending',
          detail: 'Skills are assistant instructions, not business sources or agent registry records.',
        },
      ]
    } else if (section === 'capabilities-plugins') {
      liveItems = (inventory.plugins || []).map(function(plugin) {
        return {
          id: plugin.id,
          title: plugin.title,
          type: plugin.type,
          state: plugin.status,
          tone: 'connected',
          availableTo: 'Coding/runtime layer on this machine',
          purpose: plugin.skillCount + ' plugin skill' + (plugin.skillCount === 1 ? '' : 's') + ' detected: ' + plugin.skills.map(function(skill) {
            return skill.title
          }).join(', '),
        }
      })

      statusCards = [
        {
          label: 'Installed plugins',
          status: liveItems.length ? 'connected' : 'pending',
          detail: liveItems.length + ' plugin or MCP surfaces are installed in this environment.',
        },
        {
          label: 'Boundary',
          status: 'pending',
          detail: 'An installed plugin does not mean the business source is signed off. Source trust stays in Data Sources.',
        },
      ]
    } else if (section === 'capabilities-agents') {
      liveItems = []
      if (agentSystem) {
        liveItems.push({
          id: agentSystem.systemId,
          title: agentSystem.title,
          type: agentSystem.maturityLevel || 'Mapped system',
          state: agentSystem.status || 'Mapped',
          tone: 'pending',
          availableTo: 'Foundation Systems map and future agent surfaces',
          purpose: [
            agentSystem.currentState || agentSystem.purpose,
            agentSystem.nextLevelPlan ? 'Next: ' + agentSystem.nextLevelPlan : '',
          ].filter(Boolean).join(' '),
        })
      }
      liveItems = liveItems.concat(config.items || [])

      statusCards = [
        {
          label: 'Agent system map',
          status: agentSystem ? 'connected' : 'pending',
          detail: agentSystem
            ? (agentSystem.systemId + ' is mapped in Foundation Systems at ' + (agentSystem.maturityLevel || 'an early level') + '.')
            : 'No agent system map exists yet.',
        },
        {
          label: 'Registry',
          status: 'pending',
          detail: 'Not a live Agent Registry yet. AGENT-006 owns the contract-backed registry.',
        },
        {
          label: 'Operations',
          status: 'pending',
          detail: 'Agent runtime status is not live here yet. AGENT-007 owns the operations surface.',
        },
      ]
    }

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroEyebrow = document.createElement('div')
    heroEyebrow.className = 'eyebrow'
    heroEyebrow.textContent = config.eyebrow
    heroInner.appendChild(heroEyebrow)

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = config.title
    heroInner.appendChild(heroTitle)

    var heroCopy = document.createElement('p')
    heroCopy.className = 'hero-copy'
    heroCopy.textContent = config.intro
    heroInner.appendChild(heroCopy)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderSystemInventoryPurposePanel(section, {
      inventory: inventory,
      skills: inventory.skills || [],
      plugins: inventory.plugins || [],
      agentSystem: agentSystem,
    })
    if (purposePanel) container.appendChild(purposePanel)

    var statusPanel = renderOverviewStatusPanel(statusCards, {
      eyebrow: 'Lane state',
      title: config.title + ' state',
      intro: 'This lane is separate from Data Sources.',
    })
    if (statusPanel) container.appendChild(statusPanel)

    var catalogPanel = document.createElement('section')
    catalogPanel.className = 'panel'

    var catalogHeader = document.createElement('div')
    catalogHeader.className = 'panel-header'

    var catalogLeft = document.createElement('div')
    var catalogEyebrow = document.createElement('div')
    catalogEyebrow.className = 'eyebrow'
    catalogEyebrow.textContent = 'Current Surface'
    catalogLeft.appendChild(catalogEyebrow)

    var catalogTitle = document.createElement('h3')
    catalogTitle.textContent = 'What exists right now'
    catalogLeft.appendChild(catalogTitle)

    var catalogIntro = document.createElement('p')
    catalogIntro.className = 'section-intro'
    catalogIntro.textContent = 'Current lane-level view of what exists now.'
    catalogLeft.appendChild(catalogIntro)

    catalogHeader.appendChild(catalogLeft)
    catalogPanel.appendChild(catalogHeader)

    var catalogGrid = document.createElement('div')
    catalogGrid.className = 'source-contract-stack'
    ;(liveItems || []).forEach(function(item) {
      catalogGrid.appendChild(renderCapabilityCard(item))
    })
    catalogPanel.appendChild(catalogGrid)
    container.appendChild(catalogPanel)

    var backlogItems = (hub.backlogItems || []).filter(function(item) {
      return (config.backlogIds || []).indexOf(item.id) !== -1
    })

    if (backlogItems.length) {
      var backlogPanel = document.createElement('section')
      backlogPanel.className = 'panel'

      var backlogHeader = document.createElement('div')
      backlogHeader.className = 'panel-header'

      var backlogLeft = document.createElement('div')
      var backlogEyebrow = document.createElement('div')
      backlogEyebrow.className = 'eyebrow'
      backlogEyebrow.textContent = 'Next To Build'
      backlogLeft.appendChild(backlogEyebrow)

      var backlogTitle = document.createElement('h3')
      backlogTitle.textContent = 'Backlog already tied to this lane'
      backlogLeft.appendChild(backlogTitle)

      var backlogIntro = document.createElement('p')
      backlogIntro.className = 'section-intro'
      backlogIntro.textContent = 'These cards are the live work behind this lane.'
      backlogLeft.appendChild(backlogIntro)

      backlogHeader.appendChild(backlogLeft)
      backlogPanel.appendChild(backlogHeader)

      var backlogStack = document.createElement('div')
      backlogStack.className = 'backlog-stack-body'
      sortBacklogItems(backlogItems).forEach(function(item) {
        backlogStack.appendChild(renderBacklogAccordionItem(item))
      })
      backlogPanel.appendChild(backlogStack)
      container.appendChild(backlogPanel)
    }
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Capabilities could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}
