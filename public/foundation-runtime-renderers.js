function renderFoundationOperationsPurposePanel(surfaceKey, hub) {
  var backlogCount = (hub.backlogItems || []).length
  var decisions = hub.decisions || []
  var questions = hub.openQuestions || []
  var openQuestionCount = questions.filter(function(item) { return item.status !== 'resolved' }).length
  var resolvedQuestionCount = questions.filter(function(item) { return item.status === 'resolved' }).length
  var foundationJobs = hub.foundationJobs || {}
  var extractionControl = hub.extractionControl || {}

  var configs = {
    backlog: {
      title: 'Backlog Page Job',
    intro: 'This is the root Foundation build queue: task truth, not a strategy doc and not an Ops inbox.',
      items: [
        {
          label: 'Purpose',
          status: 'connected',
          detail: 'Track work, priority, lane, owner, and next action. If future build work matters, it belongs here or in a governed hub queue.',
        },
        {
          label: 'Backed by',
          status: 'connected',
          detail: backlogCount + ' live Postgres backlog rows with admin-gated create/update APIs and seed/live drift checks.',
        },
        {
          label: 'Boundary',
          status: 'pending',
          detail: 'This is the root Foundation queue. SYSTEM-006 owns the later split between root records and hub-local execution queues.',
        },
      ],
    },
    decisions: {
      title: 'Decision Page Job',
      intro: 'This is the governance ledger. It is still a manual first slice.',
      items: [
        {
          label: 'Purpose',
          status: 'connected',
          detail: 'Record system, rebuild, source, execution, people, and promoted strategy agreements with provenance.',
        },
        {
          label: 'Backed by',
          status: 'connected',
          detail: decisions.length + ' live decision records, ' + ((hub.pendingDocUpdates || []).length) + ' pending doc updates, and ' + ((hub.decisionReview && hub.decisionReview.total) || 0) + ' current review flags.',
        },
        {
          label: 'Not automatic yet',
          status: 'pending',
          detail: 'It does not auto-import every meeting or chat decision yet. DECISION-007 reconciles old decision lists; ACTION-ROUTER-001 routes future synthesis into this ledger.',
        },
      ],
    },
    'open-questions': {
      title: 'Question Page Job',
      intro: 'This is the exception queue for real unresolved Foundation blockers. It should not become a second backlog.',
      items: [
        {
          label: 'Purpose',
          status: openQuestionCount ? 'pending' : 'connected',
          detail: 'Hold questions that block source truth, a decision, or a routed action when the answer is genuinely unknown.',
        },
        {
          label: 'Backed by',
          status: 'connected',
          detail: openQuestionCount + ' open and ' + resolvedQuestionCount + ' resolved Postgres question records with admin-gated create/update APIs.',
        },
        {
          label: 'Current rule',
          status: 'connected',
          detail: 'Old carry-forward questions were resolved or routed to backlog/source docs. New questions should be rare, owner-bound, and cleared quickly.',
        },
      ],
    },
    'system-activity': {
      title: 'Activity Page Job',
      intro: 'This is the short audit feed for recent trust-layer changes.',
      items: [
        {
          label: 'Purpose',
          status: 'connected',
          detail: 'Show the latest change events for operator review and debugging without turning the page into an unreadable feed.',
        },
        {
          label: 'Backed by',
          status: 'connected',
          detail: ((hub.recentChanges || []).length) + ' newest events from the DB change-event log are visible here.',
        },
        {
          label: 'Not enough yet',
          status: 'pending',
          detail: 'This is not the full searchable audit explorer. SYSTEM-007 owns search, filters, date range, and deeper metadata review.',
        },
      ],
    },
    'system-health': {
      title: 'Runtime Health Page Job',
      intro: 'This page answers what is running, what is stale, and where the next runtime fix belongs.',
      items: [
        {
          label: 'Purpose',
          status: 'connected',
          detail: 'Check jobs, schedules, extraction targets, LLM routes, source queues, and low-level runtime state.',
        },
        {
          label: 'Backed by',
          status: 'connected',
          detail: ((foundationJobs.jobs || []).length) + ' jobs, ' + ((extractionControl.targets || []).length) + ' extraction targets, and ' + ((hub.memoryStatus || []).length) + ' trust-layer components.',
        },
        {
          label: 'Alerting not built yet',
          status: 'pending',
          detail: 'This is live diagnostics, not a full alert/degradation model. SYSTEM-008 owns thresholds, warnings, and deeper health semantics.',
        },
      ],
    },
  }

  var config = configs[surfaceKey]
  if (!config) return null

  return renderOverviewStatusPanel(config.items, {
    eyebrow: 'Page Purpose',
    title: config.title,
    intro: config.intro,
  })
}

function getStrategyChangeContext(hub, docPath) {
  var targetPaths = docPath ? [docPath] : strategyPacketDocPaths.slice()
  var targetPathSet = new Set(targetPaths)
  var updates = (hub && hub.pendingDocUpdates || []).filter(function(item) {
    return targetPathSet.has(item.targetDocPath)
  })
  var updateMap = new Map()
  updates.forEach(function(item) {
    updateMap.set(item.id, item)
  })

  var changes = (hub && hub.recentChanges || []).filter(function(item) {
    if (String(item.eventType || '').indexOf('doc_update_') !== 0) return false
    var targetDocPath = item.metadata && item.metadata.targetDocPath
    if (!targetDocPath) {
      var linked = updateMap.get(item.entityId)
      targetDocPath = linked ? linked.targetDocPath : null
    }
    return targetPathSet.has(targetDocPath)
  })

  var linkedDecisionIds = []
  updates.forEach(function(item) {
    if (!item.decisionId) return
    if (linkedDecisionIds.indexOf(item.decisionId) === -1) linkedDecisionIds.push(item.decisionId)
  })

  return {
    targetPaths: targetPaths,
    updates: updates,
    linkedDecisionIds: linkedDecisionIds,
    orphanUpdates: updates.filter(function(item) { return !item.decisionId }),
    openUpdates: updates.filter(function(item) {
      return item.status === 'pending' || item.status === 'approved' || item.status === 'failed'
    }),
    changes: changes,
    appliedChanges: changes.filter(function(item) {
      return item.eventType === 'doc_update_applied'
    }),
  }
}

function renderStrategyChangeWatchPanel(hub, docPath) {
  var context = getStrategyChangeContext(hub, docPath)
  var ledgerItems = buildStrategyLedgerItems(context)

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Strategy Change Watch'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = docPath ? 'This doc change queue and history' : 'Strategy packet change queue and history'
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Meaningful strategy edits should show up here instead of disappearing into silent doc changes. Pending proposals stay reviewable. Applied or rejected updates stay visible as history. Linked decision context should travel with the change.'
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var statusGrid = document.createElement('div')
  statusGrid.className = 'status-grid'
  statusGrid.appendChild(renderStatusCard({
    label: 'Open proposals',
    status: context.openUpdates.length ? 'pending' : 'connected',
    detail: context.openUpdates.length
      ? context.openUpdates.length + ' strategy doc update proposal' + (context.openUpdates.length === 1 ? '' : 's') + ' still need review / apply.'
      : 'No open strategy doc proposals right now.',
  }))
  statusGrid.appendChild(renderStatusCard({
    label: 'Recent applied',
    status: context.appliedChanges.length ? 'connected' : 'planned',
    detail: context.appliedChanges.length
      ? context.appliedChanges.length + ' applied strategy doc change event' + (context.appliedChanges.length === 1 ? '' : 's') + ' are visible in recent history.'
      : 'No applied strategy doc changes are in the current recent-history window.',
  }))
  statusGrid.appendChild(renderStatusCard({
    label: 'Scope',
    status: 'neutral',
    detail: docPath
      ? 'This panel is scoped to the current doc only.'
      : context.targetPaths.length + ' packet docs are being watched here.',
  }))
  statusGrid.appendChild(renderStatusCard({
    label: 'Decision links',
    status: context.orphanUpdates.length ? 'pending' : (context.linkedDecisionIds.length ? 'connected' : 'neutral'),
    detail: context.orphanUpdates.length
      ? context.orphanUpdates.length + ' proposal' + (context.orphanUpdates.length === 1 ? '' : 's') + ' still have no linked decision. ' + context.linkedDecisionIds.length + ' decision link' + (context.linkedDecisionIds.length === 1 ? '' : 's') + ' are already attached.'
      : context.linkedDecisionIds.length
        ? context.linkedDecisionIds.length + ' decision link' + (context.linkedDecisionIds.length === 1 ? '' : 's') + ' are attached to this watch scope.'
        : 'No linked decisions are in this watch scope yet.',
  }))
  panel.appendChild(statusGrid)

  if (context.openUpdates.length) {
    var queueWrap = document.createElement('details')
    queueWrap.className = 'decision-stack'

    var queueSummary = document.createElement('summary')
    queueSummary.className = 'decision-stack-summary decision-stack-summary-review'

    var queueSummaryLeft = document.createElement('div')
    queueSummaryLeft.className = 'decision-stack-summary-left'

    var queueTitle = document.createElement('div')
    queueTitle.className = 'decision-stack-title'
    queueTitle.textContent = 'Open Strategy Doc Proposals'
    queueSummaryLeft.appendChild(queueTitle)

    var queueIntro = document.createElement('div')
    queueIntro.className = 'decision-stack-intro'
    queueIntro.textContent = 'Review only the meaningful changes you want to promote into the strategy layer.'
    queueSummaryLeft.appendChild(queueIntro)

    queueSummary.appendChild(queueSummaryLeft)

    var queueCount = document.createElement('span')
    queueCount.className = 'decision-stack-count'
    queueCount.textContent = context.openUpdates.length
    queueSummary.appendChild(queueCount)

    queueWrap.appendChild(queueSummary)

    var queueBody = document.createElement('div')
    queueBody.className = 'decision-stack-body'
    context.openUpdates.forEach(function(item) {
      queueBody.appendChild(renderPendingDocUpdateCard(item))
    })
    queueWrap.appendChild(queueBody)
    panel.appendChild(queueWrap)
  }

  if (ledgerItems.length) {
    var historyWrap = document.createElement('details')
    historyWrap.className = 'decision-stack'

    var historySummary = document.createElement('summary')
    historySummary.className = 'decision-stack-summary decision-stack-summary-history'

    var historySummaryLeft = document.createElement('div')
    historySummaryLeft.className = 'decision-stack-summary-left'

    var historyTitle = document.createElement('div')
    historyTitle.className = 'decision-stack-title'
    historyTitle.textContent = docPath ? 'Doc-scoped change annotations' : 'Strategy packet change ledger'
    historySummaryLeft.appendChild(historyTitle)

    var historyIntro = document.createElement('div')
    historyIntro.className = 'decision-stack-intro'
    historyIntro.textContent = docPath
      ? 'These are the visible change annotations for this doc.'
      : 'This is the newest-first visible ledger for strategy changes and their linked decisions.'
    historySummaryLeft.appendChild(historyIntro)

    historySummary.appendChild(historySummaryLeft)

    var historyCount = document.createElement('span')
    historyCount.className = 'decision-stack-count'
    historyCount.textContent = ledgerItems.length
    historySummary.appendChild(historyCount)

    historyWrap.appendChild(historySummary)

    var historyBody = document.createElement('div')
    historyBody.className = 'decision-stack-body'
    ledgerItems.slice(0, 10).forEach(function(item) {
      historyBody.appendChild(renderStrategyLedgerCard(item))
    })
    historyWrap.appendChild(historyBody)
    panel.appendChild(historyWrap)
  }

  return panel
}

function getSystemHealthGroups(items) {
  return [
    {
      title: 'Live Components',
      intro: 'Components that are already wired and behaving as real parts of the Foundation trust layer.',
      items: (items || []).filter(function(item) { return item.status === 'live' }),
    },
    {
      title: 'Needs Work',
      intro: 'Components that matter now but are still incomplete, provisional, or not yet trusted.',
      items: (items || []).filter(function(item) { return item.status === 'pending' || item.status === 'risk' }),
    },
    {
      title: 'Later Layers',
      intro: 'Planned layers that should not be confused with current Foundation closeout work.',
      items: (items || []).filter(function(item) { return item.status === 'planned' }),
    },
  ].filter(function(group) {
    return group.items.length
  })
}

function createActionButton(label, handler, className) {
  var button = document.createElement('button')
  button.className = className || 'secondary-button'
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', handler)
  return button
}

function createActionLink(label, href, className) {
  var link = document.createElement('a')
  link.className = className || 'secondary-button'
  link.href = href
  link.textContent = label
  return link
}

function getSourceValidationCounts(sourceContracts) {
  return (sourceContracts || []).reduce(function(counts, contract) {
    var state = String(contract.validation || '').trim()
    var status = String(contract.status || '').trim()
    if (state === 'Signed Off' || state === 'Signed Off For Current Reality') counts.signedOff += 1
    else if (state === 'Readable Only' || status === 'Verified Readable') counts.readableOnly += 1
    else if (state === 'Partially Signed Off') counts.partial += 1
    else counts.notSignedOff += 1
    return counts
  }, {
    signedOff: 0,
    readableOnly: 0,
    partial: 0,
    notSignedOff: 0,
  })
}

function renderFoundationShortcutCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card foundation-shortcut-card'

  var title = document.createElement('h4')
  title.textContent = item.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.className = 'foundation-shortcut-copy'
  body.textContent = item.body
  article.appendChild(body)

  if (item.meta) {
    var meta = document.createElement('p')
    meta.className = 'foundation-shortcut-meta'
    meta.textContent = item.meta
    article.appendChild(meta)
  }

  var actions = document.createElement('div')
  actions.className = 'foundation-shortcut-actions'
  actions.appendChild(createActionLink(item.cta || 'Open', item.href))
  article.appendChild(actions)

  return article
}

function renderFoundationShortcutPanel(titleText, introText, items, options) {
  if (!items || !items.length) return null

  var opts = options || {}
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = opts.eyebrow || 'Start Here'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = titleText
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = introText
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'foundation-shortcut-grid'
  items.forEach(function(item) {
    grid.appendChild(renderFoundationShortcutCard(item))
  })
  panel.appendChild(grid)

  return panel
}

function getFoundationHomeSnapshotItems(sourceData, hub) {
  return [
    {
      label: 'Done',
      status: 'connected',
      detail: 'Strategy docs, source contracts, verifier, runtime visibility, subscription-routed LLM proof, extraction control substrate, and SRC-OWNERS-001 are real now.',
    },
    {
      label: 'Open now',
      status: 'pending',
      detail: 'Foundation closeout is paced miners, auth/tier/redaction, SYSTEM-010 controls, Action Router v1, and source trust closures before Strategy Hub.',
    },
    {
      label: 'Not part of closeout yet',
      status: 'risk',
      detail: 'Strategy Hub UI, trusted assistants, and autonomous agents stay blocked until the source-to-action loop and privacy gates are closed.',
    },
  ]
}

function getFoundationHomeWaitingItems() {
  return [
    {
      title: 'Use the active plan, not handoffs',
      body: 'Current Plan and Foundation Overview are the authority. Handoffs, audits, specs, and research are evidence unless promoted.',
      meta: 'Doc authority',
      href: '/doc?path=docs/rebuild/current-plan.md',
      cta: 'Open Current Plan',
    },
    {
      title: 'Close the privacy gate',
      body: 'Auth/tier middleware and subject-person redaction must land before broad hub, assistant, or query access to sensitive comms intelligence.',
      meta: 'P0 Foundation gate',
      href: '/doc?path=docs/specs/2026-04-23-auth-tiers-vault.md',
      cta: 'Open Auth Spec',
    },
    {
      title: 'Close the action loop',
      body: 'Synthesized items must route into decisions, tasks, questions, contradictions, ignore/snooze, or owner-bound actions with source evidence.',
      meta: 'Action Router v1',
      href: '/foundation#current-state',
      cta: 'Open Overview',
    },
    {
      title: 'Finish source trust in order',
      body: 'Owners, FUB, finance, KPI, and marketing source closeouts still matter, but they follow the active Foundation closeout order.',
      meta: 'Source trust',
      href: '/doc?path=docs/rebuild/owners-closeout.md',
      cta: 'Open Owners Closeout',
    },
  ]
}

function getFoundationHomeActionItems() {
  return [
    {
          title: 'Foundation overview',
      body: 'Shortest read on trusted sources, live systems, open gaps, and next execution.',
      meta: 'Best first click',
      href: '/foundation#current-state',
      cta: 'Open Overview',
    },
    {
      title: 'Rebuild Plan',
      body: 'The active execution order and the locked direction.',
      meta: 'Canonical plan',
      href: '/foundation#rebuild-plan',
      cta: 'Open Plan',
    },
    {
      title: 'Data Sources',
      body: 'Source contracts, FUB review, and trust status.',
      meta: 'Source trust layer',
      href: '/foundation#source-overview',
      cta: 'Open Data Sources',
    },
    {
      title: 'Backlog',
      body: 'Live work queue after you know the state and plan.',
      meta: 'Execution queue',
      href: '/foundation#backlog',
      cta: 'Open Backlog',
    },
  ]
}

function getSourceOverviewSnapshotItems(sourceContracts, sourceConnectors) {
  var counts = getSourceValidationCounts(sourceContracts)

  return [
    {
      label: 'Signed off',
      status: 'connected',
      detail: counts.signedOff + ' validation units are signed off now, including current-reality source signoffs.',
    },
    {
      label: 'Strategy inputs',
      status: 'connected',
      detail: 'Freedom Community, BHAG, Agent Engine, and the strategy-used Owners slice are signed off for the current source package.',
    },
    {
      label: 'FUB',
      status: 'connected',
      detail: 'FUB is readable, the v1 lead-source taxonomy is locked, and remaining invalid-source or missing-link issues route through Ops findings.',
    },
    {
      label: 'Freshness',
      status: 'planned',
      detail: 'Level 3 freshness is not universal yet. ' + (sourceConnectors || []).length + ' connectors are tracked, but connector access does not mean fresh trusted data.',
    },
  ]
}

function renderFoundationPurposeCard(config) {
  var article = document.createElement('article')
  article.className = 'foundation-purpose-card'

  var icon = document.createElement('div')
  icon.className = 'foundation-purpose-icon'
  icon.innerHTML = config.icon
  article.appendChild(icon)

  var title = document.createElement('h3')
  title.textContent = config.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.textContent = config.body
  article.appendChild(body)

  return article
}

function renderFoundationModuleCard(section) {
  var article = document.createElement('article')
  article.className = 'foundation-module-card'

  var title = document.createElement('h4')
  title.textContent = section.title
  article.appendChild(title)

  var excerpt = document.createElement('p')
  excerpt.textContent = section.content.split('\n')[0]
  article.appendChild(excerpt)

  var actions = document.createElement('div')
  actions.className = 'foundation-module-actions'

  var openPacket = document.createElement('a')
  openPacket.className = 'secondary-button'
  openPacket.href = '/foundation#overview'
  openPacket.textContent = 'Open Packet'
  actions.appendChild(openPacket)

  var supportDoc = sectionSupportDocs[section.title]
  if (supportDoc) {
    var supportLink = document.createElement('a')
    supportLink.className = 'secondary-button'
    supportLink.href = buildDocHref(supportDoc.path, 'docs/business-strategy.md')
    supportLink.textContent = 'Supporting Doc'
    actions.appendChild(supportLink)
  }

  article.appendChild(actions)
  return article
}

function renderStatusGroupPanel(titleText, introText, items) {
  if (!items || !items.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Live State'
  left.appendChild(eyebrow)

  var title = document.createElement('h3')
  title.textContent = titleText
  left.appendChild(title)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = introText
  left.appendChild(intro)

  header.appendChild(left)
  panel.appendChild(header)

  var grid = document.createElement('div')
  grid.className = 'status-grid'
  items.forEach(function(item) {
    grid.appendChild(renderStatusCard(item))
  })
  panel.appendChild(grid)

  return panel
}

function normalizeRuntimeHealthPanelStatus(status) {
  var normalized = String(status || '').toLowerCase()
  if (normalized === 'healthy' || normalized === 'live' || normalized === 'ok' || normalized === 'quiet' || normalized === 'connected') return 'live'
  if (normalized === 'risk' || normalized === 'critical' || normalized === 'failed' || normalized === 'blocked') return 'risk'
  return 'pending'
}

function scrollToRuntimeDiagnosticSection(targetId) {
  var target = document.getElementById(targetId)
  if (!target) return
  if (target.tagName && target.tagName.toLowerCase() === 'details') target.open = true
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function buildRuntimeHealthJumpAction(label, targetId) {
  return {
    label: label,
    secondary: true,
    onClick: function() {
      scrollToRuntimeDiagnosticSection(targetId)
    },
  }
}

function buildRuntimeHealthAttentionItems(hub) {
  var items = []
  var runtimeProcessControl = hub.runtimeProcessControl || {}
  var serviceSupervisor = runtimeProcessControl.serviceSupervisor || {}
  var serviceSummary = serviceSupervisor.summary || {}
  var processSummary = runtimeProcessControl.summary || {}
  var foundationJobs = hub.foundationJobs || {}
  var workerReliability = foundationJobs.workerReliability || {}
  var workerSummary = workerReliability.summary || {}
  var backlogHygiene = hub.backlogHygiene || {}
  var postShipFanout = hub.postShipFanout || {}
  var kpiHealth = hub.kpiHealth || {}
  var sourceOutageBoundary = hub.sourceOutageBoundary || {}
  var endpointBudgets = hub.endpointBudgets || hub.foundationEndpointBudgets || {}
  var assetBudget = hub.foundationFrontendAssetBudget || hub.frontendAssetBudget || {}

  if (serviceSupervisor.status && serviceSupervisor.status !== 'healthy') {
    items.push({
      label: 'Service supervision',
      status: 'risk',
      detail: serviceSupervisor.plainEnglish || 'Dashboard or worker service supervision needs attention.',
      actions: [buildRuntimeHealthJumpAction('Open Services', 'runtime-diagnostic-process-control')],
    })
  }

  if ((processSummary.staleRiskCount || 0) > 0) {
    items.push({
      label: 'Stale active work',
      status: 'risk',
      detail: (processSummary.staleRiskCount || 0) + ' stale active process risk' + ((processSummary.staleRiskCount || 0) === 1 ? '' : 's') + ' need review.',
      actions: [buildRuntimeHealthJumpAction('Open Processes', 'runtime-diagnostic-process-control')],
    })
  }

  if (workerReliability.status === 'risk' || (workerSummary.failedLatestRuns || 0) > 0 || (workerSummary.staleActiveRuns || 0) > 0) {
    items.push({
      label: 'Worker jobs',
      status: workerReliability.status === 'risk' ? 'risk' : 'pending',
      detail: 'Failed latest runs ' + (workerSummary.failedLatestRuns || 0)
        + ', retry candidates ' + (workerSummary.retryCandidateJobs || 0)
        + ', blocked scheduled ' + (workerSummary.blockedScheduledJobs || 0)
        + ', stale active ' + (workerSummary.staleActiveRuns || 0) + '.',
      actions: [buildRuntimeHealthJumpAction('Open Jobs', 'runtime-diagnostic-foundation-jobs')],
    })
  }

  if ((backlogHygiene.criticalFindings || backlogHygiene.critical || 0) > 0 || backlogHygiene.status === 'critical') {
    items.push({
      label: 'Backlog hygiene',
      status: 'risk',
      detail: (backlogHygiene.criticalFindings || backlogHygiene.critical || 0) + ' critical backlog hygiene finding' + ((backlogHygiene.criticalFindings || backlogHygiene.critical || 0) === 1 ? '' : 's') + '.',
      actions: [buildRuntimeHealthJumpAction('Open Hygiene', 'runtime-diagnostic-backlog-hygiene')],
    })
  }

  if (postShipFanout.status && !['healthy', 'passed', 'ok'].includes(String(postShipFanout.status).toLowerCase())) {
    items.push({
      label: 'Post-ship fanout',
      status: normalizeRuntimeHealthPanelStatus(postShipFanout.status),
      detail: postShipFanout.plainEnglish || 'Post-ship fanout needs review.',
      actions: [buildRuntimeHealthJumpAction('Open Fanout', 'runtime-diagnostic-post-ship-fanout')],
    })
  }

  if (kpiHealth.status && kpiHealth.status !== 'healthy') {
    items.push({
      label: 'KPI / Supabase health',
      status: normalizeRuntimeHealthPanelStatus(kpiHealth.status),
      detail: kpiHealth.plainEnglish || 'KPI source health is not fully healthy.',
      actions: [buildRuntimeHealthJumpAction('Open KPI', 'runtime-diagnostic-kpi-warning')],
    })
  }

  if (sourceOutageBoundary.status && sourceOutageBoundary.status !== 'healthy') {
    items.push({
      label: 'Source outage boundary',
      status: normalizeRuntimeHealthPanelStatus(sourceOutageBoundary.status),
      detail: sourceOutageBoundary.plainEnglish || 'One or more source providers are degraded.',
      actions: [buildRuntimeHealthJumpAction('Open Source Trust', 'runtime-diagnostic-source-reference-trust')],
    })
  }

  if (endpointBudgets.status && endpointBudgets.status !== 'healthy') {
    items.push({
      label: 'Endpoint budgets',
      status: normalizeRuntimeHealthPanelStatus(endpointBudgets.status),
      detail: endpointBudgets.plainEnglish || 'Endpoint latency or payload budget needs review.',
      actions: [buildRuntimeHealthJumpAction('Open Budgets', 'runtime-diagnostic-runtime-process-control')],
    })
  }

  if (assetBudget.status && !['healthy', 'ok'].includes(String(assetBudget.status).toLowerCase())) {
    items.push({
      label: 'Frontend asset budget',
      status: normalizeRuntimeHealthPanelStatus(assetBudget.status),
      detail: assetBudget.plainEnglish || 'Foundation frontend asset budget needs review.',
      actions: [buildRuntimeHealthJumpAction('Open Assets', 'runtime-diagnostic-runtime-process-control')],
    })
  }

  if (!items.length) {
    items.push({
      label: 'No immediate runtime attention',
      status: 'live',
      detail: 'Service supervision, stale process risk, worker reliability, backlog hygiene, fanout, KPI health, and source outage signals do not show critical attention items in this payload.',
      actions: [buildRuntimeHealthJumpAction('Open Deep Diagnostics', 'runtime-diagnostic-process-control')],
    })
  }

  return items.slice(0, 8)
}

function buildRuntimeHealthCommandItems(hub) {
  var runtimeProcessControl = hub.runtimeProcessControl || {}
  var serviceSupervisor = runtimeProcessControl.serviceSupervisor || {}
  var foundationJobs = hub.foundationJobs || {}
  var workerReliability = foundationJobs.workerReliability || {}
  var workerSummary = workerReliability.summary || {}
  var attentionItems = buildRuntimeHealthAttentionItems(hub)
  var riskItems = attentionItems.filter(function(item) { return item.status === 'risk' })
  var pendingItems = attentionItems.filter(function(item) { return item.status === 'pending' })
  var systemOk = !riskItems.length
  var serviceCount = serviceSupervisor.summary && serviceSupervisor.summary.serviceCount
    ? serviceSupervisor.summary.serviceCount
    : ((serviceSupervisor.services || []).length || 0)

  return [
    {
      label: systemOk ? 'Runtime is usable' : 'Runtime needs attention',
      status: systemOk ? 'live' : 'risk',
      detail: systemOk
        ? 'No critical runtime attention items are visible in the current payload. Use the deep diagnostics only when you need proof.'
        : riskItems.length + ' runtime attention item' + (riskItems.length === 1 ? '' : 's') + ' should be reviewed before trusting unattended work.',
      actions: [buildRuntimeHealthJumpAction('Open Attention', 'runtime-health-attention')],
    },
    {
      label: 'Services supervised',
      status: serviceSupervisor.status === 'healthy' ? 'live' : 'risk',
      detail: serviceCount + ' supervised service' + (serviceCount === 1 ? '' : 's') + '. ' + (serviceSupervisor.plainEnglish || 'Dashboard and worker service metadata are available.'),
      actions: [buildRuntimeHealthJumpAction('Open Services', 'runtime-diagnostic-process-control')],
    },
    {
      label: 'Worker job signal',
      status: workerReliability.status === 'risk' ? 'risk' : (workerReliability.status === 'healthy' ? 'live' : 'pending'),
      detail: 'Scheduled ' + (workerSummary.scheduledJobs || foundationJobs.scheduledJobs || 0)
        + ', due ' + (workerSummary.dueJobs || foundationJobs.dueJobs || 0)
        + ', failed latest ' + (workerSummary.failedLatestRuns || 0)
        + ', retry candidates ' + (workerSummary.retryCandidateJobs || 0) + '.',
      actions: [buildRuntimeHealthJumpAction('Open Jobs', 'runtime-diagnostic-foundation-jobs')],
    },
    {
      label: 'Attention queue',
      status: riskItems.length ? 'risk' : (pendingItems.length ? 'pending' : 'live'),
      detail: riskItems.length + ' risk and ' + pendingItems.length + ' watch item' + (pendingItems.length === 1 ? '' : 's') + ' in the attention-only summary.',
      actions: [buildRuntimeHealthJumpAction('Open Attention', 'runtime-health-attention')],
    },
  ]
}

function renderRuntimeHealthCommandPanel(hub) {
  var panel = document.createElement('section')
  panel.className = 'panel runtime-health-command-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Runtime Command'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What Needs Attention Now'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Fast operator read first. Detailed diagnostics are still available below, grouped by proof area.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var commandGrid = document.createElement('div')
  commandGrid.className = 'status-grid runtime-health-command-grid'
  buildRuntimeHealthCommandItems(hub || {}).forEach(function(item) {
    commandGrid.appendChild(renderStatusCard(item))
  })
  panel.appendChild(commandGrid)

  var attentionTitle = document.createElement('div')
  attentionTitle.id = 'runtime-health-attention'
  attentionTitle.className = 'runtime-health-attention-title'
  attentionTitle.textContent = 'Attention-only summary'
  panel.appendChild(attentionTitle)

  var attentionGrid = document.createElement('div')
  attentionGrid.className = 'status-grid runtime-health-attention-grid'
  buildRuntimeHealthAttentionItems(hub || {}).forEach(function(item) {
    attentionGrid.appendChild(renderStatusCard(item))
  })
  panel.appendChild(attentionGrid)

  return panel
}

function appendRuntimeDiagnosticPanel(container, panel, options) {
  if (!panel) return
  var config = options || {}
  var wrapper = document.createElement('details')
  wrapper.className = 'runtime-health-diagnostic-section'
  if (config.id) wrapper.id = config.id
  if (config.open === true) wrapper.open = true

  var summary = document.createElement('summary')
  summary.className = 'runtime-health-diagnostic-summary'
  var title = document.createElement('span')
  title.className = 'runtime-health-diagnostic-title'
  title.textContent = config.title || 'Runtime diagnostic'
  summary.appendChild(title)
  var intro = document.createElement('span')
  intro.className = 'runtime-health-diagnostic-intro'
  intro.textContent = config.intro || 'Open for full source-backed detail.'
  summary.appendChild(intro)

  wrapper.appendChild(summary)
  wrapper.appendChild(panel)
  container.appendChild(wrapper)
}

function renderFoundationJobsPanel(foundationJobs) {
  var jobs = foundationJobs && Array.isArray(foundationJobs.jobs) ? foundationJobs.jobs : []
  if (!jobs.length) return null
  var workerReliability = foundationJobs && foundationJobs.workerReliability ? foundationJobs.workerReliability : null
  var workerSummary = workerReliability && workerReliability.summary ? workerReliability.summary : {}
  var summary = 'Registered routines the system can run and track. '
    + (foundationJobs.scheduledJobs || 0) + ' scheduled, '
    + (foundationJobs.dueJobs || 0) + ' due, '
    + (foundationJobs.manualJobs || 0) + ' manual.'
  var workerItems = []
  if (workerReliability) {
    workerItems.push({
      label: 'Worker reliability',
      status: workerReliability.status === 'healthy' ? 'live' : (workerReliability.status === 'risk' ? 'risk' : 'pending'),
      detail: (workerReliability.plainEnglish || 'Worker reliability status is unavailable.')
        + ' Scheduled ' + (workerSummary.scheduledJobs || 0)
        + ', due ' + (workerSummary.dueJobs || 0)
        + ', failed latest ' + (workerSummary.failedLatestRuns || 0)
        + ', retry candidates ' + (workerSummary.retryCandidateJobs || 0)
        + ', blocked ' + (workerSummary.blockedScheduledJobs || 0)
        + ', stale active ' + (workerSummary.staleActiveRuns || 0) + '.',
    })
  }

  return renderStatusGroupPanel(
    'Foundation Jobs',
    summary,
    workerItems.concat(jobs.map(function(job) {
      var latest = job.latestRun || null
      var runLine = latest
        ? 'Last ' + latest.status + ' · ' + formatDate(latest.finishedAt || latest.startedAt || latest.createdAt)
        : 'No run recorded'
      var nextLine = job.nextRunAt
        ? ' Next ' + formatDate(job.nextRunAt) + '.'
        : ''
      var scheduleLine = job.scheduleStatus
        ? ' ' + job.scheduleStatus + '.'
        : ''
      var controlLine = job.controlUpdatedAt
        ? ' Control updated ' + formatDate(job.controlUpdatedAt) + (job.controlUpdatedBy ? ' by ' + job.controlUpdatedBy : '') + '.'
        : ''
      var actions = []
      if (job.runtimeMode === 'decommissioned') {
        actions.push({
          label: 'Decommissioned',
          disabled: true,
        })
      } else if (job.runtimeMode === 'paused' || job.enabled === false) {
        actions.push({
          label: 'Resume',
          onClick: function(button) {
            controlFoundationJob(job, 'resume', button)
          },
        })
        if (!latest || (latest.status !== 'running' && latest.status !== 'queued')) {
          actions.push({
            label: 'Decommission',
            secondary: true,
            onClick: function(button) {
              decommissionFoundationJob(job, button)
            },
          })
        }
      } else {
        actions.push({
          label: 'Pause',
          secondary: true,
          onClick: function(button) {
            controlFoundationJob(job, 'pause', button)
          },
        })
      }
      return {
        label: job.title,
        status: job.status || 'pending',
        detail: runLine + '.' + nextLine + scheduleLine + controlLine + ' ' + (job.nextAction || job.statusDetail || ''),
        actions: actions,
      }
    }))
  )
}

function renderRuntimeProcessControlPanel(runtimeProcessControl) {
  if (!runtimeProcessControl || !runtimeProcessControl.summary) return null
  var summary = runtimeProcessControl.summary || {}
  var active = runtimeProcessControl.activeProcessView || {}
  var controls = runtimeProcessControl.controls || {}
  var restart = runtimeProcessControl.restartOnPush || {}
  var serviceSupervisor = runtimeProcessControl.serviceSupervisor || {}
  var costRisk = runtimeProcessControl.costRisk || {}
  var items = [
    {
      label: 'Active process view',
      status: runtimeProcessControl.status === 'healthy' ? 'live' : 'risk',
      detail: (summary.activeFoundationJobRuns || 0) + ' Foundation job runs, '
        + (summary.activeSourceCrawlRuns || 0) + ' source-crawl runs, '
        + (summary.leasedSourceCrawlItems || 0) + ' leased source items, '
        + (summary.activeLlmCalls || 0) + ' active LLM calls. Stale risks: '
        + (summary.staleRiskCount || 0) + '.',
    },
    {
      label: 'Supervised services',
      status: serviceSupervisor.status === 'healthy' ? 'live' : 'risk',
      detail: serviceSupervisor.plainEnglish || 'Dashboard and Foundation worker LaunchAgent status, pid match, code trust, log paths, and restart commands are reported here.',
    },
    {
      label: 'Dead-man and stop guard',
      status: (summary.staleRiskCount || 0) > 0 ? 'risk' : 'live',
      detail: (summary.stopEligibleRuns || 0) + ' active runs expose owned PID stop metadata. Missing or unowned PID rows fail closed instead of guessing.',
    },
    {
      label: 'Restart-on-push status',
      status: restart.status === 'automatic' ? 'live' : 'pending',
      detail: restart.plainEnglish || 'Restart status is reported from runtime metadata and restart commands.',
    },
    {
      label: 'Cost/process risk',
      status: costRisk.status === 'quiet' ? 'live' : 'pending',
      detail: 'Open estimated LLM cost: $' + Number(costRisk.estimatedOpenCostUsd || 0).toFixed(6)
        + '. Connector work: ' + (costRisk.activeConnectorWork || 0)
        + '. LLM work: ' + (costRisk.activeLlmWork || 0)
        + '. Unknown budget work: ' + (costRisk.activeUnknownBudgetWork || 0) + '.',
    },
  ]

  ;(Array.isArray(active.foundationJobRuns) ? active.foundationJobRuns : []).slice(0, 8).forEach(function(run) {
    var liveness = run.liveness || {}
    var decision = run.stopDecision || {}
    items.push({
      label: 'Run ' + (run.runId || run.jobKey || 'active'),
      status: liveness.stale ? 'risk' : 'pending',
      detail: (run.jobKey || 'Foundation job') + ' is ' + (run.status || 'active')
        + '. Age seconds: ' + (liveness.ageSeconds == null ? 'unknown' : liveness.ageSeconds)
        + '. Stop ' + (decision.ok ? 'available.' : 'blocked: ' + ((decision.reasons || []).join(' ') || 'not eligible.')),
      actions: decision.ok ? [{
        label: 'Stop',
        secondary: true,
        onClick: function(button) {
          stopFoundationJobRun(run, button)
        },
      }] : [],
    })
  })

  ;(Array.isArray(serviceSupervisor.services) ? serviceSupervisor.services : []).forEach(function(service) {
    var runtime = service.runtime || {}
    var launchAgent = service.launchAgent || {}
    var logLine = Array.isArray(service.logPaths) && service.logPaths.length
      ? ' Logs: ' + service.logPaths.join(' · ') + '.'
      : ''
    items.push({
      label: service.label || service.key || 'Supervised service',
      status: service.status === 'healthy' ? 'live' : 'risk',
      detail: 'LaunchAgent ' + (launchAgent.label || 'missing')
        + ' pid ' + (launchAgent.pid || 'missing')
        + '; recorded pid ' + (runtime.processId || 'missing')
        + '; code ' + (runtime.codeMatchesHead ? 'matches HEAD' : 'does not match HEAD')
        + '; metadata age ' + (runtime.capturedAgeSeconds == null ? 'unknown' : runtime.capturedAgeSeconds + 's')
        + '; restart-on-push ' + (service.restartOnPushStatus || 'unknown')
        + '. Restart: ' + (service.restartCommand || 'missing') + '.'
        + logLine,
    })
  })

  if (Array.isArray(controls.decommissionedJobs) && controls.decommissionedJobs.length) {
    items.push({
      label: 'Decommissioned jobs',
      status: 'pending',
      detail: controls.decommissionedJobs.slice(0, 8).map(function(job) {
        return job.key || job.jobKey || job.title
      }).join(' · ') + '.',
    })
  }

  return renderStatusGroupPanel(
    'Runtime Process Control',
    'SYSTEM-010 active process, liveness, stop/decommission, restart, and spend-risk guardrails.',
    items
  )
}

function renderMeetingVaultAutoEnforcementPanel(meetingVaultAutoEnforcement) {
  if (!meetingVaultAutoEnforcement) return null
  var latest = meetingVaultAutoEnforcement.latestRun || {}
  var summary = meetingVaultAutoEnforcement.summary || {}
  var status = meetingVaultAutoEnforcement.status || latest.status || 'missing'
  var legacyExceptions = Array.isArray(meetingVaultAutoEnforcement.legacyExceptions)
    ? meetingVaultAutoEnforcement.legacyExceptions
    : []
  var counts = [
    'processed ' + (summary.processedCount || latest.processedCount || 0),
    'forward ' + (summary.forwardCount || latest.forwardCount || 0),
    'legacy exceptions ' + (summary.legacyExceptionCount || latest.legacyExceptionCount || legacyExceptions.length || 0),
    'missing Crewbert queued ' + (summary.missingCrewbertQueuedCount || latest.missingCrewbertQueuedCount || 0),
    'protected review ' + (summary.protectedReviewQueueCount || latest.protectedReviewQueueCount || 0),
    'public/domain high-risk ' + (summary.publicDomainHighRiskCount || latest.highRiskCount || 0),
  ].join(' · ')

  return renderStatusGroupPanel(
    'Meeting Vault Auto-Enforcement',
    'Report-only forward-flow guard for original Gemini meeting notes, no duplicate Google Docs, Crewbert vault access, and bounded legacy exceptions.',
    [
      {
        label: 'Forward-flow status',
        status: latest.canCloseMeetingVaultAcl ? 'live' : (status === 'missing' ? 'pending' : 'risk'),
        detail: (meetingVaultAutoEnforcement.plainEnglish || 'No run recorded yet.')
          + ' Latest run: ' + (latest.createdAt ? formatDate(latest.createdAt) : 'none')
          + '. Report hash: ' + (latest.reportHash || 'missing') + '.',
      },
      {
        label: 'Daily audit counts',
        status: latest.canCloseMeetingVaultAcl ? 'live' : 'pending',
        detail: counts + '. Baseline: ' + (latest.enforcementStartAt ? formatDate(latest.enforcementStartAt) : 'not set') + '.',
      },
      {
        label: 'Legacy exception queue',
        status: legacyExceptions.length ? 'pending' : 'live',
        detail: legacyExceptions.length
          ? legacyExceptions.length + ' open legacy exceptions are bounded for later owner-authority or cleanup work.'
          : 'No open legacy exceptions returned in the latest hub slice.',
      },
    ]
  )
}

function renderAgentFeedbackAutoSendPanel(agentFeedbackAutoSend) {
  if (!agentFeedbackAutoSend || !agentFeedbackAutoSend.summary) return null
  var summary = agentFeedbackAutoSend.summary || {}
  var guard = agentFeedbackAutoSend.liveGuard || {}
  var enabled = summary.productionAutoSendEnabled === true
  var lastRun = summary.lastRunAt ? formatDate(summary.lastRunAt) + ' / ' + (summary.lastRunStatus || 'unknown') : 'No run recorded'
  var nextRun = summary.nextRunAt ? formatDate(summary.nextRunAt) : 'No scheduled next run'
  var windowLine = (summary.sendWindowStart && summary.sendWindowEnd)
    ? ' Send window: ' + summary.sendWindowStart + '-' + summary.sendWindowEnd + ' ' + (summary.sendWindowTimezone || 'local') + (summary.sendWindowOpen ? ' (open).' : ' (closed now).')
    : ''
  var counts = [
    'would-send ' + (summary.wouldSendCount || 0),
    'sent ' + (summary.sentCount || 0),
    'skipped ' + (summary.skippedCount || 0),
    'blocked ' + (summary.blockedCount || 0),
    'warnings ' + (summary.warningCount || 0),
    'repairs ' + (summary.repairCount || 0),
  ].join(' · ')

  return renderStatusGroupPanel(
    'Agent Feedback Auto-Send',
    'Daily governed production scanner for 30/60/90 onboarding feedback requests. It sends only when the live guard is enabled and writes Requested only after Gmail succeeds.',
    [
      {
        label: 'Enabled state',
        status: enabled ? 'live' : 'risk',
        detail: (enabled ? 'Production auto-send enabled' : 'Fail-closed: ' + ((summary.failClosedReasons || []).join(', ') || 'guard not satisfied')) + '. Last run: ' + lastRun + '. Next run: ' + nextRun + '.' + windowLine,
      },
      {
        label: 'Production counts',
        status: agentFeedbackAutoSend.status === 'healthy' ? 'live' : 'risk',
        detail: counts + '. Georgia Day-30: ' + (summary.georgiaDay30Action || 'missing') + '.',
      },
      {
        label: 'Live-send guard',
        status: guard.decision === 'live_send_allowed' ? 'live' : 'risk',
        detail: 'Current mode: ' + (summary.liveGuardDecision || guard.decision || 'unknown') + '. Toggle, approval artifact, and local send window are checked before any Gmail send.',
      },
    ]
  )
}

function renderAgentFeedbackProductionDryRunPanel(agentFeedbackProductionAutoSendDryRun) {
  if (!agentFeedbackProductionAutoSendDryRun || !agentFeedbackProductionAutoSendDryRun.summary) return null
  var summary = agentFeedbackProductionAutoSendDryRun.summary || {}
  var counts = summary.byClassification || {}
  var countLine = [
    'would-send ' + (counts.would_send || 0),
    'warning ' + (counts.warning || 0),
    'already requested ' + (counts.already_requested || 0),
    'completed ' + (counts.completed || 0),
    'outside window ' + (counts.outside_window || 0),
    'blocked ' + (counts.blocked || 0),
    'skipped ' + (counts.skipped || 0),
  ].join(' · ')
  var preview = Array.isArray(summary.wouldBeEmailedPreview) && summary.wouldBeEmailedPreview.length
    ? summary.wouldBeEmailedPreview.slice(0, 8).map(function(candidate) {
      return candidate.agentName + ' day ' + candidate.milestoneDay
    }).join(' · ')
    : 'No sendable candidates in the preview.'

  return renderStatusGroupPanel(
    'Agent Feedback Production Dry-Run',
    'Stage 1 production report only. This shows who would receive 30/60/90 onboarding feedback before any production auto-send is enabled.',
    [
      {
        label: 'Roster scan',
        status: agentFeedbackProductionAutoSendDryRun.mode === 'production-dry-run-report-only' ? 'pending' : 'risk',
        detail: (summary.totalCandidates || 0) + ' milestone candidates from the Agent Roster. ' + countLine + '.',
      },
      {
        label: 'Would be emailed',
        status: (summary.sendableCount || 0) > 0 ? 'pending' : 'live',
        detail: (summary.sendableCount || 0) + ' candidates would be emailed if production were enabled: ' + preview + '.',
      },
      {
        label: 'Production guard',
        status: agentFeedbackProductionAutoSendDryRun.productionEnablement && agentFeedbackProductionAutoSendDryRun.productionEnablement.enabled === true ? 'live' : 'pending',
        detail: agentFeedbackProductionAutoSendDryRun.productionEnablement && agentFeedbackProductionAutoSendDryRun.productionEnablement.enabled === true
          ? 'Production auto-send is enabled; this panel remains a metadata-only roster scan.'
          : 'Production auto-send remains disabled. Steve reviews this list before any enablement.',
      },
    ]
  )
}

function renderAgentFeedbackReminderPanel(agentFeedbackReminders) {
  if (!agentFeedbackReminders || !agentFeedbackReminders.summary) return null
  var summary = agentFeedbackReminders.summary || {}
  var liveEnabled = summary.liveRemindersEnabled === true
  var counts = [
    'pending ' + (summary.pendingReminderCount || 0),
    'sent ' + (summary.sentReminderCount || 0),
    'skipped ' + (summary.skippedReminderCount || 0),
    'blocked ' + (summary.blockedReminderCount || 0),
    'maxed out ' + (summary.maxedOutReminderCount || 0),
    'repairs ' + (summary.repairReminderCount || 0),
  ].join(' · ')
  var nextDue = Array.isArray(summary.nextReminderDueDates) && summary.nextReminderDueDates.length
    ? summary.nextReminderDueDates.slice(0, 3).map(formatDate).join(' · ')
    : 'No due reminders found.'
  var sendWindow = (summary.sendWindowStart || '08:30') + '-' +
    (summary.sendWindowEnd || '10:00') + ' ' +
    (summary.sendWindowTimezone || 'America/Toronto')
  var runLine = 'Last run ' + (summary.lastRunAt ? formatDate(summary.lastRunAt) : 'not captured') +
    '. Next run ' + (summary.nextRunAt ? formatDate(summary.nextRunAt) : 'not captured') + '.'

  return renderStatusGroupPanel(
    'Agent Feedback Reminders',
    liveEnabled
      ? 'Live reminder sends for requested-but-not-completed onboarding feedback, governed by the same morning send window as initial requests.'
      : 'Reminder cadence is visible but live sends are fail-closed until the reminder guard is enabled.',
    [
      {
        label: 'Reminder counts',
        status: agentFeedbackReminders.status === 'healthy' ? 'live' : 'risk',
        detail: counts + '. Next due: ' + nextDue,
      },
      {
        label: 'Live guard',
        status: liveEnabled ? 'live' : 'risk',
        detail: 'Mode ' + (summary.enabledState || 'unknown') + '. Send window ' + sendWindow + '. ' + runLine,
      },
      {
        label: 'Cadence guard',
        status: summary.duplicateSlotProtected && summary.completedSkippedBlockedStop ? 'live' : 'risk',
        detail: 'Schedule is day 1, day 3, day 7, day 10, day 14, day 17. Cap is 6 reminders or 30 days. No reminder runs before a successful initial request, duplicate reminder slots are blocked, and completed/skipped/blocked milestones stop future reminders.',
      },
    ]
  )
}

function renderServedCodeTrustPanel(runtimeSupervisor) {
  var servedCode = runtimeSupervisor && runtimeSupervisor.servedCode
  if (!servedCode) return null

  var runningCommit = servedCode.runningShortCommit || servedCode.runningCommit || 'Not captured'
  var status = servedCode.status === 'live' ? 'live' : 'risk'
  var detail = servedCode.plainEnglish || 'Dashboard reports the code commit it started from. foundation:verify compares this to repo HEAD.'
  if (servedCode.restartCommand) {
    detail += ' If this is stale, run: ' + servedCode.restartCommand
  }

  return renderStatusGroupPanel(
    'Dashboard Code Trust',
    'Shows the exact code version the dashboard started with, so reviewer checks can catch stale served code.',
    [
      {
        label: 'Server-start commit',
        status: status,
        detail: 'Running commit: ' + runningCommit + '. Started ' + formatDate(servedCode.startedAt) + '. ' + detail,
      },
    ]
  )
}

function renderWorkerCodeTrustPanel(runtimeSupervisor) {
  var workerCode = runtimeSupervisor && runtimeSupervisor.workerCode
  if (!workerCode) return null

  var runningCommit = workerCode.runningShortCommit || workerCode.runningCommit || 'Not captured'
  var status = workerCode.status === 'live' ? 'live' : 'risk'
  var detail = workerCode.plainEnglish || 'Foundation worker reports the code commit it started from. foundation:verify compares this to repo HEAD and the supervised worker process.'
  if (workerCode.restartCommand) {
    detail += ' If this is stale, run: ' + workerCode.restartCommand
  }

  return renderStatusGroupPanel(
    'Worker Code Trust',
    'Shows the exact code version the background worker started with, so scheduled jobs cannot keep running old code quietly.',
    [
      {
        label: 'Worker-start commit',
        status: status,
        detail: 'Running commit: ' + runningCommit + '. Process id: ' + (workerCode.processId || 'Not captured') + '. Started ' + formatDate(workerCode.startedAt) + '. ' + detail,
      },
    ]
  )
}

function renderBacklogHygienePanel(backlogHygiene) {
  if (!backlogHygiene || !backlogHygiene.summary) return null
  var summary = backlogHygiene.summary || {}
  var thresholds = backlogHygiene.thresholds || {}
  var visibleFindings = Array.isArray(backlogHygiene.visibleFindings)
    ? backlogHygiene.visibleFindings
    : []
  var intro = 'Read-only check for stale work, half-closed cards, and backlog records that do not match their proof. '
    + (summary.criticalFindings || 0) + ' critical, '
    + (summary.warningFindings || 0) + ' warning, '
    + (summary.infoFindings || 0) + ' info. '
    + 'Stale executing threshold: ' + (thresholds.staleExecutingDays || 3) + ' days without active-work proof.'

  var items = visibleFindings.slice(0, 8).map(function(finding) {
    return {
      label: finding.cardId + ' - ' + String(finding.type || '').replace(/_/g, ' '),
      status: finding.severity === 'critical' ? 'risk' : 'pending',
      detail: (finding.issue || 'Backlog hygiene finding.')
        + ' Evidence: ' + (finding.evidence || 'No evidence detail.')
        + ' Next: ' + (finding.recommendedAction || 'Review the card.'),
    }
  })

  if (!items.length) {
    items.push({
      label: 'No visible backlog hygiene findings',
      status: summary.status === 'healthy' ? 'live' : 'pending',
      detail: 'The backlog hygiene probe is running. Info-level details stay in the CLI for v1.',
    })
  }

  return renderStatusGroupPanel(
    'Backlog Hygiene',
    intro,
    items
  )
}

function renderPostShipFanoutPanel(postShipFanout) {
  if (!postShipFanout || !postShipFanout.summary) return null
  var summary = postShipFanout.summary || {}
  var findings = Array.isArray(postShipFanout.findings) ? postShipFanout.findings : []
  var rules = Array.isArray(postShipFanout.rules) ? postShipFanout.rules : []
  var intro = 'Checks whether the latest trusted ship updated the truth around it: Backlog, Recent Work, verifier proof, UI surface notes, and rebuild plan/state docs. '
    + (summary.criticalFindings || 0) + ' critical finding'
    + ((summary.criticalFindings || 0) === 1 ? '' : 's')
    + ' across ' + (summary.ruleCount || rules.length || 0) + ' rules.'

  var items = findings.slice(0, 6).map(function(finding) {
    return {
      label: String(finding.type || 'fanout finding').replace(/_/g, ' '),
      status: finding.severity === 'critical' ? 'risk' : 'pending',
      detail: (finding.issue || 'Post-ship fanout finding.')
        + ' Next: ' + (finding.recommendedAction || 'Review the closeout.'),
    }
  })

  if (!items.length) {
    items.push({
      label: postShipFanout.closeoutKey || 'Latest closeout',
      status: postShipFanout.status === 'healthy' ? 'live' : 'pending',
      detail: 'Fanout is clean for commit '
        + (postShipFanout.commitSubject || postShipFanout.commitRef || 'HEAD')
        + '. Changed files checked: '
        + (postShipFanout.changedFileCount || 0)
        + '.',
    })
  }

  return renderStatusGroupPanel(
    'Post-Ship Fanout',
    intro,
    items
  )
}

function renderCardReferenceTrustPanel(cardReferenceTrust) {
  if (!cardReferenceTrust || !cardReferenceTrust.summary) return null
  var summary = cardReferenceTrust.summary || {}
  var findings = Array.isArray(cardReferenceTrust.findings) ? cardReferenceTrust.findings : []
  var status = cardReferenceTrust.status === 'critical' ? 'risk' : 'live'
  var intro = 'Checks active Foundation docs and code for backlog card IDs that are missing from the live backlog. '
    + (summary.missingCardReferenceCount || 0) + ' missing reference'
    + ((summary.missingCardReferenceCount || 0) === 1 ? '' : 's')
    + ' across ' + (summary.scannedFileCount || 0) + ' active files.'

  var items = findings.slice(0, 8).map(function(finding) {
    return {
      label: finding.cardId || 'Missing card reference',
      status: finding.severity === 'critical' ? 'risk' : 'pending',
      detail: (finding.detail || 'A card reference does not exist in the live backlog.')
        + ' Next: create the card, fix the reference, or move historical text out of active docs.',
    }
  })

  if (!items.length) {
    items.push({
      label: 'No missing active backlog card references',
      status: status,
      detail: 'Scanned active rebuild docs and Foundation code. Historical handoffs/audits are out of scope for v1.',
    })
  }

  return renderStatusGroupPanel(
    'Card Reference Trust',
    intro,
    items
  )
}

function renderSourceReferenceTrustPanel(sourceReferenceTrust) {
  if (!sourceReferenceTrust || !sourceReferenceTrust.summary) return null
  var summary = sourceReferenceTrust.summary || {}
  var findings = Array.isArray(sourceReferenceTrust.undeclaredActiveReferences)
    ? sourceReferenceTrust.undeclaredActiveReferences
    : []
  var status = sourceReferenceTrust.status === 'critical' ? 'risk' : 'live'
  var intro = 'Checks active Foundation files for source IDs that are missing from source contracts. '
    + (summary.undeclaredActiveReferenceCount || 0) + ' undeclared active reference'
    + ((summary.undeclaredActiveReferenceCount || 0) === 1 ? '' : 's')
    + '. Historical aliases classified: ' + (summary.historicalClassifiedCount || 0) + '.'

  var items = findings.slice(0, 8).map(function(finding) {
    return {
      label: finding.sourceId || 'Undeclared source',
      status: 'risk',
      detail: (finding.path || 'Active file') + ' uses a source ID that is not declared. Add a source contract or correct the reference.',
    }
  })

  if (!items.length) {
    items.push({
      label: 'No missing active source IDs',
      status: status,
      detail: 'Active source references resolve to source contracts. Historical/audit-only aliases are documented separately.',
    })
  }

  return renderStatusGroupPanel(
    'Source Contract Trust',
    intro,
    items
  )
}

function renderDocArchiveCleanupPanel(docArchiveCleanup) {
  if (!docArchiveCleanup || !docArchiveCleanup.summary) return null
  var summary = docArchiveCleanup.summary || {}
  var findings = Array.isArray(docArchiveCleanup.findings) ? docArchiveCleanup.findings : []
  var intro = 'Shows whether old handoffs, audits, and research notes were moved out of active folders without deleting them. '
    + (summary.archivedFileCount || 0) + ' files preserved in archive: '
    + (summary.handoffCount || 0) + ' handoffs, '
    + (summary.auditCount || 0) + ' audits, '
    + (summary.researchDocCount || 0) + ' research docs.'

  var items = findings.slice(0, 6).map(function(finding) {
    return {
      label: String(finding.type || 'archive finding').replace(/_/g, ' '),
      status: finding.severity === 'critical' ? 'risk' : 'pending',
      detail: (finding.issue || 'Archive cleanup finding.')
        + ' Next: ' + (finding.recommendedAction || 'Review the archive manifest.'),
    }
  })

  if (!items.length) {
    items.push({
      label: 'Archive manifest is clean',
      status: docArchiveCleanup.status === 'healthy' ? 'live' : 'pending',
      detail: 'Active evidence folders are cleaner, and archived docs remain searchable under docs/_archive.',
    })
  }

  return renderStatusGroupPanel(
    'Doc Archive Cleanup',
    intro,
    items
  )
}

function renderExceptionCurationPanel(exceptionCuration) {
  if (!exceptionCuration || !exceptionCuration.summary) return null
  var summary = exceptionCuration.summary || {}
  var findings = Array.isArray(exceptionCuration.findings) ? exceptionCuration.findings : []
  var deadlineText = exceptionCuration.deadline ? ' Deadline: ' + exceptionCuration.deadline + '.' : ''
  var intro = 'Tracks the temporary verifier exceptions so they do not become permanent loopholes. '
    + (summary.curatedCount || 0) + ' of '
    + (summary.exceptionCount || 0) + ' exceptions classified.'
    + deadlineText

  var items = findings.slice(0, 6).map(function(finding) {
    return {
      label: String(finding.type || 'exception finding').replace(/_/g, ' '),
      status: finding.severity === 'critical' ? 'risk' : 'pending',
      detail: (finding.issue || 'Exception curation finding.')
        + ' Next: ' + (finding.recommendedAction || 'Review the exception curation file.'),
    }
  })

  if (!items.length) {
    items.push({
      label: 'Exception curation is complete for v1',
      status: exceptionCuration.status === 'critical' ? 'risk' : exceptionCuration.status === 'warning' ? 'pending' : 'live',
      detail: 'Each exception is classified as real coverage, retire/restructure, or re-approve only if still needed. Days until stale: '
        + (summary.daysUntilStale === null || summary.daysUntilStale === undefined ? 'unknown' : summary.daysUntilStale)
        + '.',
    })
  }

  return renderStatusGroupPanel(
    'Exception Curation',
    intro,
    items
  )
}

function renderHitListReconcilePanel(hitListReconcile) {
  if (!hitListReconcile || !hitListReconcile.summary) return null
  var summary = hitListReconcile.summary || {}
  var findings = Array.isArray(hitListReconcile.findings) ? hitListReconcile.findings : []
  var status = hitListReconcile.status === 'critical' ? 'risk' : hitListReconcile.status === 'warning' ? 'pending' : 'live'
  var intro = 'Compares Steve’s repo-tracked hit-list snapshot against live Backlog state without auto-reading the private Google Doc. '
    + (summary.matchedCardCount || 0) + ' of '
    + (summary.hitListCardCount || 0) + ' hit-list cards match. Snapshot age: '
    + (summary.snapshotAgeDays === null || summary.snapshotAgeDays === undefined ? 'unknown' : summary.snapshotAgeDays + ' days')
    + '.'

  var items = findings.slice(0, 6).map(function(finding) {
    return {
      label: String(finding.type || 'hit-list finding').replace(/_/g, ' '),
      status: finding.severity === 'critical' ? 'risk' : 'pending',
      detail: (finding.issue || 'Hit-list reconciliation finding.')
        + ' Next: ' + (finding.recommendedAction || 'Refresh the snapshot or fix the backlog state.'),
    }
  })

  if (!items.length) {
    items.push({
      label: 'Hit-list snapshot matches live Backlog',
      status: status,
      detail: hitListReconcile.privacyBoundary || 'V1 uses a repo-tracked snapshot and does not auto-import private docs.',
    })
  }

  return renderStatusGroupPanel(
    'Hit-List Reconcile',
    intro,
    items
  )
}

function renderArchiveRetirePanel(archiveRetire) {
  if (!archiveRetire || !archiveRetire.summary) return null
  var summary = archiveRetire.summary || {}
  var findings = Array.isArray(archiveRetire.findings) ? archiveRetire.findings : []
  var intro = 'Shows the narrow Phase D delete lane. Rebuild docs are moved to plan history; only allowlisted regenerable safe-delete junk may be deleted. '
    + (summary.retiredRebuildDocCount || 0) + ' rebuild docs retired, '
    + (summary.deletedCount || 0) + ' safe-delete entries deleted, '
    + (summary.refusedCount || 0) + ' refused.'

  var items = findings.slice(0, 6).map(function(finding) {
    return {
      label: String(finding.type || 'archive retire finding').replace(/_/g, ' '),
      status: finding.severity === 'critical' ? 'risk' : finding.severity === 'warning' ? 'pending' : 'live',
      detail: (finding.issue || 'Archive retire finding.')
        + ' Next: ' + (finding.recommendedAction || 'Review the retire manifest.'),
    }
  })

  if (!items.length) {
    items.push({
      label: 'Archive retire guardrails are clean',
      status: archiveRetire.status === 'critical' ? 'risk' : 'live',
      detail: 'The script either deleted only allowlisted safe-delete junk or recorded that no safe-delete archive was present.',
    })
  }

  return renderStatusGroupPanel(
    'Archive Retire',
    intro,
    items
  )
}

function renderResearchCurationPanel(researchCuration) {
  if (!researchCuration || !researchCuration.summary) return null
  var summary = researchCuration.summary || {}
  var cards = Array.isArray(researchCuration.cards) ? researchCuration.cards : []
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Phase D Cleanup'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Research Curation'
  left.appendChild(title)
  header.appendChild(left)
  panel.appendChild(header)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (summary.preservedCardCount || 0)
    + ' research cards preserved. Auto-closed: '
    + (summary.autoClosedCount || 0)
    + '. V1 labels the lane; Steve still decides what to promote or retire.'
  panel.appendChild(intro)

  var list = document.createElement('div')
  list.className = 'backlog-list'
  cards.slice(0, 12).forEach(function(card) {
    var item = document.createElement('details')
    item.className = 'backlog-accordion-item'
    var summaryEl = document.createElement('summary')
    summaryEl.textContent = card.id + ' · ' + (card.subTag || 'research') + ' · ' + (card.curationState || 'leave parked')
    item.appendChild(summaryEl)
    var body = document.createElement('p')
    body.className = 'section-intro'
    body.textContent = card.plainEnglish || 'Preserved in Research for later review.'
    item.appendChild(body)
    list.appendChild(item)
  })

  if (!cards.length) {
    var empty = document.createElement('p')
    empty.className = 'section-intro'
    empty.textContent = 'No research cards found in the current backlog.'
    list.appendChild(empty)
  }

  panel.appendChild(list)
  return panel
}

function renderSheetsApiTrustPanel(sheetsApiTrust) {
  if (!sheetsApiTrust) return null
  var status = sheetsApiTrust.quotaRisk === 'high'
    ? 'risk'
    : sheetsApiTrust.quotaRisk === 'watch'
      ? 'pending'
      : 'live'
  var enabled = sheetsApiTrust.enabled ? 'enabled' : 'disabled'
  var ttlSeconds = Math.round(Number(sheetsApiTrust.ttlMs || 0) / 1000)
  var detail = 'Cache is ' + enabled
    + '. TTL: ' + ttlSeconds + ' seconds.'
    + ' Hits: ' + (sheetsApiTrust.hits || 0)
    + '. Misses: ' + (sheetsApiTrust.misses || 0)
    + '. Live reads in last minute: ' + (sheetsApiTrust.liveReadsLastMinute || 0)
    + ' of ' + (sheetsApiTrust.userQuotaPerMinute || 60)
    + '. Recent 429s: ' + (sheetsApiTrust.quota429Count || 0) + '.'

  var items = [
    {
      label: 'Sheets read cache',
      status: status,
      detail: detail,
    },
  ]

  ;(sheetsApiTrust.recentQuotaEvents || []).slice(-3).forEach(function(event) {
    items.push({
      label: String(event.type || 'Sheets quota event').replace(/_/g, ' '),
      status: event.type === 'google_sheets_429' ? 'risk' : 'pending',
      detail: (event.message || 'Sheets API event.') + ' At: ' + formatDate(event.at),
    })
  })

  return renderStatusGroupPanel(
    'Sheets API Trust',
    'Shows whether Foundation is reducing repeated Google Sheets reads during verifier and ship-check loops. Writes are never cached.',
    items
  )
}

function renderDoctrinePropagationPanel(doctrinePropagation) {
  if (!doctrinePropagation || !doctrinePropagation.summary) return null
  var summary = doctrinePropagation.summary || {}
  var status = doctrinePropagation.status === 'risk'
    ? 'risk'
    : doctrinePropagation.status === 'watch'
      ? 'pending'
      : 'live'
  var items = [
    {
      label: 'bcrew-foundation skill doctrine',
      status: status,
      detail: 'Generated section: '
        + (doctrinePropagation.generatedSectionPresent ? 'present' : 'missing')
        + '. Doctrines tracked: ' + (doctrinePropagation.doctrineCount || 0)
        + '. Private memory files checked by timestamp only: ' + (doctrinePropagation.privateMemoryFileCount || 0)
        + '.',
    },
  ]

  ;(doctrinePropagation.findings || []).slice(0, 5).forEach(function(finding) {
    items.push({
      label: String(finding.type || 'doctrine finding').replace(/_/g, ' '),
      status: finding.severity === 'critical' ? 'risk' : 'pending',
      detail: (finding.issue || 'Doctrine propagation finding.')
        + ' Next: ' + (finding.recommendedAction || 'Review doctrine propagation.'),
    })
  })

  return renderStatusGroupPanel(
    'Doctrine Propagation',
    'Keeps current Foundation operating rules in the active bcrew-foundation skill without copying private memory content into repo truth. Critical findings: '
      + (summary.criticalFindings || 0)
      + '. Warnings: '
      + (summary.warningFindings || 0)
      + '.',
    items
  )
}

function renderDecisionAutoEmitPanel(decisionAutoEmit) {
  if (!decisionAutoEmit || !decisionAutoEmit.summary) return null
  var summary = decisionAutoEmit.summary || {}
  var categories = summary.categories || {}
  var items = [
    {
      label: 'Synthetic decision proof',
      status: decisionAutoEmit.status === 'healthy' ? 'live' : 'risk',
      detail: 'Dry-run default is on. Apply is required before writing proposed decisions. Synthetic candidates found: '
        + (summary.candidateCount || 0)
        + '. Categories: strategy '
        + (categories.strategy || 0)
        + ', system '
        + (categories.system || 0)
        + ', execution '
        + (categories.execution || 0)
        + ', people '
        + (categories.people || 0)
        + '.',
    },
  ]

  ;(decisionAutoEmit.candidates || []).slice(0, 4).forEach(function(candidate) {
    items.push({
      label: candidate.title || 'Proposed decision candidate',
      status: 'pending',
      detail: 'Would be proposed as '
        + (candidate.category || 'system')
        + '. Source: '
        + (candidate.sourceRef || 'synthetic proof')
        + '.',
    })
  })

  return renderStatusGroupPanel(
    'Auto-Emitted Decisions',
    'Finds obvious decision language in commits or checkpoint text and creates proposed decisions only when apply mode is explicitly used.',
    items
  )
}

function renderLlmRuntimePanel(llmRuntime) {
  if (!llmRuntime) return null
  var routes = Array.isArray(llmRuntime.routes) ? llmRuntime.routes : []
  var credentials = Array.isArray(llmRuntime.credentials) ? llmRuntime.credentials : []
  if (!routes.length && !credentials.length) return null

  var summary = 'Policy-aware model access. '
    + ((llmRuntime.summary && llmRuntime.summary.availableCredentials) || 0) + '/'
    + ((llmRuntime.summary && llmRuntime.summary.credentialCount) || credentials.length) + ' credentials available, '
    + ((llmRuntime.summary && llmRuntime.summary.availableRoutes) || 0) + '/'
    + ((llmRuntime.summary && llmRuntime.summary.routeCount) || routes.length) + ' routes available.'

  var routeItems = routes.slice(0, 8).map(function(route) {
    var policy = route.policyClassification ? ' Policy: ' + route.policyClassification + '.' : ''
    var auth = route.provider + ' / ' + route.authPath + ' / ' + route.model
    var fallback = route.fallbackRouteKey ? ' Fallback: ' + route.fallbackRouteKey + '.' : ''
    return {
      label: route.routeKey,
      status: route.status === 'available' ? 'live' : route.status === 'blocked' ? 'risk' : 'planned',
      detail: auth + '.' + policy + fallback + ' ' + (route.notes || ''),
    }
  })

  return renderStatusGroupPanel(
    'LLM Runtime',
    summary,
    routeItems
  )
}
