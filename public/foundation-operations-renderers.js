/* Foundation operations renderers extracted from public/foundation.js. */
function renderDataHealth() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading runtime health.</p>'

  fetchFoundationHubFull().then(function(hub) {
    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Runtime Health'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = hub.memoryStatus.length + ' trust-layer components tracked'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Live diagnostic view for the dashboard, worker, jobs, LLM routes, extraction targets, and source-crawl queues.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('system-health', hub)
    if (purposePanel) container.appendChild(purposePanel)

    var commandPanel = renderRuntimeHealthCommandPanel(hub)
    if (commandPanel) container.appendChild(commandPanel)

    var systemHealthPanel = renderFoundationSystemHealthPanel(hub.foundationSystemHealth)
    appendRuntimeDiagnosticPanel(container, systemHealthPanel, {
      id: 'runtime-diagnostic-system-health-rollup',
      title: 'System Health Rollup',
      intro: 'Report-only red/yellow/green rollup for scheduled jobs, auditor freshness, connectors, endpoints, sources, and Current Sprint state.',
      open: hub.foundationSystemHealth && hub.foundationSystemHealth.status && hub.foundationSystemHealth.status !== 'healthy',
    })

    var kpiWarningPanel = renderKpiHealthRuntimeWarning(hub.kpiHealth)
    appendRuntimeDiagnosticPanel(container, kpiWarningPanel, {
      id: 'runtime-diagnostic-kpi-warning',
      title: 'KPI / Supabase Warning',
      intro: 'Source health warning panel for KPI-backed surfaces.',
      open: hub.kpiHealth && hub.kpiHealth.status && hub.kpiHealth.status !== 'healthy',
    })

    var servedCodePanel = renderServedCodeTrustPanel(hub.runtimeSupervisor)
    appendRuntimeDiagnosticPanel(container, servedCodePanel, {
      id: 'runtime-diagnostic-served-code',
      title: 'Dashboard Code Trust',
      intro: 'Confirms the dashboard is serving the current repo commit.',
    })

    var workerCodePanel = renderWorkerCodeTrustPanel(hub.runtimeSupervisor)
    appendRuntimeDiagnosticPanel(container, workerCodePanel, {
      id: 'runtime-diagnostic-worker-code',
      title: 'Worker Code Trust',
      intro: 'Confirms the Foundation worker pid and startup commit match LaunchAgent truth.',
    })

    var backlogHygienePanel = renderBacklogHygienePanel(hub.backlogHygiene)
    appendRuntimeDiagnosticPanel(container, backlogHygienePanel, {
      id: 'runtime-diagnostic-backlog-hygiene',
      title: 'Backlog Hygiene',
      intro: 'Automatic backlog hygiene findings and stale-card checks.',
      open: hub.backlogHygiene && (hub.backlogHygiene.status === 'critical' || hub.backlogHygiene.criticalFindings > 0),
    })

    var cardReferenceTrustPanel = renderCardReferenceTrustPanel(hub.cardReferenceTrust)
    appendRuntimeDiagnosticPanel(container, cardReferenceTrustPanel, {
      id: 'runtime-diagnostic-card-reference-trust',
      title: 'Card Reference Trust',
      intro: 'Checks active docs for missing backlog card references.',
    })

    var sourceReferenceTrustPanel = renderSourceReferenceTrustPanel(hub.sourceReferenceTrust)
    appendRuntimeDiagnosticPanel(container, sourceReferenceTrustPanel, {
      id: 'runtime-diagnostic-source-reference-trust',
      title: 'Source Reference Trust',
      intro: 'Checks active docs for undeclared source IDs and source-reference drift.',
    })

    var postShipFanoutPanel = renderPostShipFanoutPanel(hub.postShipFanout)
    appendRuntimeDiagnosticPanel(container, postShipFanoutPanel, {
      id: 'runtime-diagnostic-post-ship-fanout',
      title: 'Post-Ship Fanout',
      intro: 'Confirms recent ships updated their claimed surfaces and proof locations.',
      open: hub.postShipFanout && hub.postShipFanout.status && !['healthy', 'passed', 'ok'].includes(String(hub.postShipFanout.status).toLowerCase()),
    })

    var docArchiveCleanupPanel = renderDocArchiveCleanupPanel(hub.docArchiveCleanup)
    appendRuntimeDiagnosticPanel(container, docArchiveCleanupPanel, {
      id: 'runtime-diagnostic-doc-archive-cleanup',
      title: 'Doc Archive Cleanup',
      intro: 'Tracks doc archive and cleanup guardrails.',
    })

    var exceptionCurationPanel = renderExceptionCurationPanel(hub.exceptionCuration)
    appendRuntimeDiagnosticPanel(container, exceptionCurationPanel, {
      id: 'runtime-diagnostic-exception-curation',
      title: 'Verifier Exception Curation',
      intro: 'Keeps verifier exceptions explicit, approved, and not stale.',
    })

    var hitListReconcilePanel = renderHitListReconcilePanel(hub.hitListReconcile)
    appendRuntimeDiagnosticPanel(container, hitListReconcilePanel, {
      id: 'runtime-diagnostic-hit-list-reconcile',
      title: 'Hit List Reconcile',
      intro: 'Tracks cleanup-hit-list state against active Foundation proof.',
    })

    var archiveRetirePanel = renderArchiveRetirePanel(hub.archiveRetire)
    appendRuntimeDiagnosticPanel(container, archiveRetirePanel, {
      id: 'runtime-diagnostic-archive-retire',
      title: 'Archive Retire',
      intro: 'Shows archive-retire safe-delete and preservation guardrails.',
    })

    var sheetsApiTrustPanel = renderSheetsApiTrustPanel(hub.sheetsApiTrust)
    appendRuntimeDiagnosticPanel(container, sheetsApiTrustPanel, {
      id: 'runtime-diagnostic-sheets-api-trust',
      title: 'Sheets API Trust',
      intro: 'Shows whether repeated Google Sheets reads are cached and quota-safe.',
      open: hub.sheetsApiTrust && hub.sheetsApiTrust.quotaRisk === 'high',
    })

    var doctrinePropagationPanel = renderDoctrinePropagationPanel(hub.doctrinePropagation)
    appendRuntimeDiagnosticPanel(container, doctrinePropagationPanel, {
      id: 'runtime-diagnostic-doctrine-propagation',
      title: 'Doctrine Propagation',
      intro: 'Keeps Foundation operating rules synchronized into active skill doctrine.',
    })

    var surfaceSweepPanel = renderSurfaceFreshnessSweepPanel(hub.surfaceFreshnessSweep)
    appendRuntimeDiagnosticPanel(container, surfaceSweepPanel, {
      id: 'runtime-diagnostic-surface-freshness',
      title: 'Surface Freshness Sweep',
      intro: 'Checks Foundation surfaces for stale or missing runtime proof.',
      open: hub.surfaceFreshnessSweep && hub.surfaceFreshnessSweep.status === 'risk',
    })

    var agentFeedbackAutoSendPanel = renderAgentFeedbackAutoSendPanel(hub.agentFeedbackAutoSend)
    appendRuntimeDiagnosticPanel(container, agentFeedbackAutoSendPanel, {
      id: 'runtime-diagnostic-agent-feedback-auto-send',
      title: 'Agent Feedback Auto-Send',
      intro: 'Shows production-send guard state for onboarding feedback.',
    })

    var agentFeedbackProductionDryRunPanel = renderAgentFeedbackProductionDryRunPanel(hub.agentFeedbackProductionAutoSendDryRun)
    appendRuntimeDiagnosticPanel(container, agentFeedbackProductionDryRunPanel, {
      id: 'runtime-diagnostic-agent-feedback-dry-run',
      title: 'Agent Feedback Production Dry-Run',
      intro: 'Shows who would be emailed before production send is enabled.',
    })

    var agentFeedbackReminderPanel = renderAgentFeedbackReminderPanel(hub.agentFeedbackReminders)
    appendRuntimeDiagnosticPanel(container, agentFeedbackReminderPanel, {
      id: 'runtime-diagnostic-agent-feedback-reminders',
      title: 'Agent Feedback Reminders',
      intro: 'Shows reminder cadence and response-notification health.',
    })

    var runtimeProcessControlPanel = renderRuntimeProcessControlPanel(hub.runtimeProcessControl)
    appendRuntimeDiagnosticPanel(container, runtimeProcessControlPanel, {
      id: 'runtime-diagnostic-process-control',
      title: 'Runtime Process Control',
      intro: 'SYSTEM-010 process, liveness, stop/decommission, restart, and spend-risk guardrails.',
      open: hub.runtimeProcessControl && hub.runtimeProcessControl.status === 'risk',
    })

    var meetingVaultAutoEnforcementPanel = renderMeetingVaultAutoEnforcementPanel(hub.meetingVaultAutoEnforcement)
    appendRuntimeDiagnosticPanel(container, meetingVaultAutoEnforcementPanel, {
      id: 'runtime-diagnostic-meeting-vault-auto-enforcement',
      title: 'Meeting Vault Auto-Enforcement',
      intro: 'Report-only forward-flow guard for meeting-note Drive safety.',
    })

    var jobsPanel = renderFoundationJobsPanel(hub.foundationJobs)
    appendRuntimeDiagnosticPanel(container, jobsPanel, {
      id: 'runtime-diagnostic-foundation-jobs',
      title: 'Foundation Jobs',
      intro: 'Registered routines, schedule status, worker reliability, and job controls.',
      open: hub.foundationJobs && hub.foundationJobs.workerReliability && hub.foundationJobs.workerReliability.status === 'risk',
    })

    var intelligencePanel = renderIntelligencePipelinePanel(hub.sharedCommunicationsCoverage, hub.sharedCommunicationSynthesis)
    appendRuntimeDiagnosticPanel(container, intelligencePanel, {
      id: 'runtime-diagnostic-intelligence-pipeline',
      title: 'Intelligence Pipeline',
      intro: 'Archive, extraction, synthesis, and candidate coverage health.',
    })

    var llmPanel = renderLlmRuntimePanel(hub.llmRuntime)
    appendRuntimeDiagnosticPanel(container, llmPanel, {
      id: 'runtime-diagnostic-llm-runtime',
      title: 'LLM Runtime',
      intro: 'Policy-aware model route and credential status.',
    })

    var extractionPanel = renderExtractionControlPanel(hub.extractionControl)
    appendRuntimeDiagnosticPanel(container, extractionPanel, {
      id: 'runtime-diagnostic-extraction-control',
      title: 'Extraction Control',
      intro: 'Source-crawl targets, item queues, leases, and extraction schedule state.',
    })

    var driveCorpusPanel = renderDriveCorpusInventoryPanel(hub.driveCorpusInventory)
    appendRuntimeDiagnosticPanel(container, driveCorpusPanel, {
      id: 'runtime-diagnostic-drive-corpus',
      title: 'Drive Corpus Inventory',
      intro: 'Drive corpus inventory and governed content extraction status.',
    })

    getSystemHealthGroups(hub.memoryStatus || []).forEach(function(group, index) {
      var panel = renderStatusGroupPanel(
        group.title,
        group.intro,
        group.items.map(function(item) {
          return {
            label: item.label,
            status: item.status,
            detail: item.detail,
          }
        })
      )
      appendRuntimeDiagnosticPanel(container, panel, {
        id: 'runtime-diagnostic-memory-status-' + index,
        title: group.title,
        intro: group.intro || 'Trust-layer component status.',
      })
    })

  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Runtime Health could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderSystemActivity() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading system activity.</p>'

  Promise.all([fetchFoundationHub(), fetchFoundationChangeLog()]).then(function(results) {
    var hub = results[0]
    var changeLog = results[1]
    var changeSummary = changeLog.summary || {}
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'System Activity'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = (changeSummary.totalEntries || 0) + ' source-backed changes · ' + (changeSummary.representedChangeTypes || 0) + ' change types'
    heroInner.appendChild(heroMeta)

    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Comprehensive changelog for Foundation changes by surface, type, highlight, and evidence. Recent Work remains the shipped-build review surface.'
    heroInner.appendChild(heroNote)

    hero.appendChild(heroInner)
    container.appendChild(hero)

    var purposePanel = renderFoundationOperationsPurposePanel('system-activity', hub)
    if (purposePanel) container.appendChild(purposePanel)

    container.appendChild(renderChangeLogSummary(changeLog))

    var highlightsPanel = renderChangeLogHighlights(changeLog)
    if (highlightsPanel) container.appendChild(highlightsPanel)

    var surfacePanel = renderChangeLogSurfaceGroups(changeLog)
    if (surfacePanel) container.appendChild(surfacePanel)

    var typePanel = renderChangeLogTypeGroups(changeLog)
    if (typePanel) container.appendChild(typePanel)

    var rawPanel = renderChangeLogRawEvidence(changeLog)
    if (rawPanel) container.appendChild(rawPanel)

    var changesPanel = renderRecentChangesPanel(hub.recentChanges || [], {
      eyebrow: 'Internal Feed',
      title: 'Latest DB trust events',
      intro: 'Backward-compatible view of the existing change_events feed. The comprehensive changelog above adds build closeouts and changed-file evidence without replacing this feed.',
    })

    if (changesPanel) {
      container.appendChild(changesPanel)
      return
    }

    var empty = document.createElement('p')
    empty.textContent = 'No recent trust-layer events are recorded yet.'
    container.appendChild(empty)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'System Activity could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderDailySummaryMetric(label, value, detail) {
  var card = document.createElement('div')
  card.className = 'build-log-summary-metric daily-summary-metric'
  var strong = document.createElement('strong')
  strong.textContent = value
  card.appendChild(strong)
  var span = document.createElement('span')
  span.textContent = label
  card.appendChild(span)
  if (detail) {
    var copy = document.createElement('p')
    copy.textContent = detail
    card.appendChild(copy)
  }
  return card
}

function renderDailySummaryEvidenceRefs(refs) {
  var values = (refs || []).filter(Boolean)
  if (!values.length) return null
  var details = document.createElement('details')
  details.className = 'daily-summary-evidence'
  details.setAttribute('data-daily-summary-evidence', 'refs')
  var summary = document.createElement('summary')
  summary.textContent = 'Evidence refs'
  details.appendChild(summary)
  var list = document.createElement('ul')
  list.className = 'change-log-evidence-list'
  values.slice(0, 16).forEach(function(ref) {
    var item = document.createElement('li')
    item.setAttribute('data-daily-summary-evidence-ref', 'true')
    item.textContent = ref
    list.appendChild(item)
  })
  details.appendChild(list)
  return details
}

function renderDailySummaryItem(item) {
  var row = document.createElement('article')
  row.className = 'daily-summary-item'
  var title = document.createElement('strong')
  title.textContent = item.closeoutKey || item.cardId || item.nextCard || item.title || item.source || item.changeTypeLabel || 'Source-backed item'
  row.appendChild(title)
  var summary = document.createElement('p')
  summary.textContent = item.reviewNext || item.summary || item.nextAction || item.lesson || item.remaining || item.proofStatus || item.subject || ''
  row.appendChild(summary)

  var cards = (item.owningCards || item.contextCards || item.cardId ? [item.cardId].filter(Boolean) : []).filter(Boolean)
  if ((item.owningCards || []).length) cards = item.owningCards
  if (cards.length) {
    var links = renderChangeLogCardLinks(cards, 'Owning cards', 'build-log-backlog-link')
    if (links) row.appendChild(links)
  }
  if ((item.contextCards || []).length) {
    var context = renderChangeLogCardLinks(item.contextCards, 'Context cards', 'build-log-backlog-link build-log-context-link')
    if (context) row.appendChild(context)
  }
  var evidence = renderDailySummaryEvidenceRefs(item.evidenceRefs)
  if (evidence) row.appendChild(evidence)
  return row
}

function renderDailySummarySection(section) {
  var panel = document.createElement('section')
  panel.className = 'panel daily-summary-section'
  panel.setAttribute('data-daily-summary-section', section.key)
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Daily Summary'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = section.title
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = section.summary
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var items = section.items || []
  if (items.length) {
    var list = document.createElement('div')
    list.className = 'daily-summary-item-list'
    items.slice(0, 12).forEach(function(item) {
      list.appendChild(renderDailySummaryItem(item))
    })
    panel.appendChild(list)
  }
  var evidence = renderDailySummaryEvidenceRefs(section.evidenceRefs)
  if (evidence) panel.appendChild(evidence)
  return panel
}

function renderDailySummaryDaySelector(summary) {
  var panel = document.createElement('section')
  panel.className = 'panel daily-summary-day-selector'
  panel.setAttribute('data-daily-summary-section', 'recent-day-selector')
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Recent Days'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Choose a source-backed day'
  left.appendChild(title)
  header.appendChild(left)
  panel.appendChild(header)

  var list = document.createElement('div')
  list.className = 'daily-summary-day-list'
  ;(summary.recentDays || []).forEach(function(day) {
    var link = document.createElement('a')
    link.className = 'daily-summary-day-link' + (day.date === summary.query.selectedDate ? ' daily-summary-day-link-active' : '')
    link.href = '/foundation#daily-summary:' + encodeURIComponent(day.date)
    link.textContent = day.date + ' · ' + day.shipped + ' shipped · ' + day.changes + ' changes'
    link.setAttribute('data-daily-summary-day', day.date)
    list.appendChild(link)
  })
  panel.appendChild(list)
  return panel
}

function renderDailySummary() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading daily summary.</p>'

  fetchFoundationDailySummary(getDailySummaryDate()).then(function(summary) {
    var day = summary.days && summary.days[0] ? summary.days[0] : null
    var data = summary.summary || {}
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero daily-summary-hero'
    hero.setAttribute('data-daily-summary-section', 'selected-date')
    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'
    var title = document.createElement('h1')
    title.textContent = 'Daily Summary'
    heroInner.appendChild(title)
    var meta = document.createElement('p')
    meta.className = 'hero-copy'
    meta.textContent = 'Selected date: ' + (summary.query && summary.query.selectedDate ? summary.query.selectedDate : 'today')
    heroInner.appendChild(meta)
    var note = document.createElement('p')
    note.className = 'hero-copy'
    note.textContent = 'Source-backed daily readout: where we started, what changed, what shipped, what remains, what we learned, and what is next.'
    heroInner.appendChild(note)
    hero.appendChild(heroInner)
    container.appendChild(hero)

    var overview = document.createElement('section')
    overview.className = 'build-log-executive-summary daily-summary-overview'
    overview.setAttribute('data-daily-summary-section', 'overview')
    var copy = document.createElement('div')
    copy.className = 'build-log-executive-copy'
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Executive Readout'
    copy.appendChild(eyebrow)
    var overviewTitle = document.createElement('h3')
    overviewTitle.textContent = day && day.hasEvidence ? 'Evidence found for this day' : 'No source-backed evidence found for this day'
    copy.appendChild(overviewTitle)
    var intro = document.createElement('p')
    intro.textContent = 'This surface does not create narrative on its own. Every section below points back to build-log, changelog, backlog, plan/state, or proof evidence.'
    copy.appendChild(intro)
    overview.appendChild(copy)
    var metrics = document.createElement('div')
    metrics.className = 'build-log-summary-grid daily-summary-grid'
    metrics.appendChild(renderDailySummaryMetric('Shipped today', String(data.shippedTodayCount || 0), 'Verified closeout-backed builds for the selected date.'))
    metrics.appendChild(renderDailySummaryMetric('Still open', String(data.stillOpenCount || 0), 'Live Foundation backlog items that remain open for the current day.'))
    metrics.appendChild(renderDailySummaryMetric('Needs review', String(data.needsReviewCount || 0), 'Closeout review-next items.'))
    metrics.appendChild(renderDailySummaryMetric('Next build', String(data.nextBuildCount || 0), 'Source-backed next card signal.'))
    overview.appendChild(metrics)
    container.appendChild(overview)

    container.appendChild(renderDailySummaryDaySelector(summary))

    if (!day) {
      var empty = document.createElement('p')
      empty.textContent = 'Daily summary could not find a selected day payload.'
      container.appendChild(empty)
      return
    }

    ;['whereWeStarted', 'whatChanged', 'whatShipped', 'whatRemains', 'whatWeLearned', 'whatIsNext', 'proof'].forEach(function(key) {
      if (day.sections && day.sections[key]) container.appendChild(renderDailySummarySection(day.sections[key]))
    })
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Daily Summary could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}

function renderBuildTextList(items, className) {
  var values = (items || []).filter(Boolean)
  if (!values.length) return null
  var list = document.createElement('ul')
  list.className = className || 'build-log-fact-list'
  values.forEach(function(value) {
    var item = document.createElement('li')
    item.textContent = value
    list.appendChild(item)
  })
  return list
}

function sanitizeBuildAnchor(value) {
  return String(value || 'build')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'build'
}

function getBuildAnchorId(build) {
  return 'build-closeout-' + sanitizeBuildAnchor(build.closeoutKey || build.shortSha || build.sha || build.subject)
}

function getBuildReviewNext(build) {
  return build.reviewNext || 'Review this build if it affects an active surface.'
}

function getBuildFirstWhere(build) {
  var where = build.whereItLives || build.fileGroups || []
  return where.length ? where[0] : 'Repo'
}

function buildProofSummary(build) {
  var commandCount = (build.proofCommands || []).length
  if (commandCount) return commandCount + ' proof command' + (commandCount === 1 ? '' : 's') + ' recorded'
  return build.proofStatus || 'No explicit proof command attached.'
}

function renderBuildPill(label, className) {
  if (!label) return null
  var pill = document.createElement('span')
  pill.className = className || 'foundation-system-pill'
  pill.textContent = label
  return pill
}

function renderBuildBacklogPills(items, options) {
  var values = (items || []).filter(Boolean)
  if (!values.length) return null
  var wrap = document.createElement('div')
  wrap.className = 'build-log-backlog-links' + (options && options.kind === 'context' ? ' build-log-context-links' : '')
  values.forEach(function(item) {
    var label = [
      item.id,
      item.lane ? getBacklogLaneLabel(item.lane) : null,
      item.priority || null,
    ].filter(Boolean).join(' · ')
    if (options && options.link === false) {
      var span = document.createElement('span')
      span.className = 'build-log-backlog-link' + (options.kind === 'context' ? ' build-log-context-link' : '')
      span.textContent = label
      wrap.appendChild(span)
      return
    }
    var link = document.createElement('a')
    link.className = 'build-log-backlog-link' + (options && options.kind === 'context' ? ' build-log-context-link' : '')
    link.href = '/foundation#backlog:' + encodeURIComponent(item.id)
    link.textContent = label
    wrap.appendChild(link)
  })
  return wrap
}

function renderBuildBacklogLinks(build, options) {
  var kind = options && options.kind === 'context' ? 'context' : 'owned'
  var related = kind === 'context' ? (build.mentionedBacklog || []) : (build.relatedBacklog || [])
  var ids = kind === 'context' ? (build.mentionedBacklogIds || []) : (build.backlogIds || [])
  var fallbackItems = ids.filter(Boolean).map(function(id) { return { id: id } })
  var items = related.length ? related : fallbackItems
  if (!items.length) return null
  return renderBuildBacklogPills(items, options)
}

function renderBuildSummaryMetric(label, value, detail) {
  var card = document.createElement('div')
  card.className = 'build-log-summary-metric'
  var strong = document.createElement('strong')
  strong.textContent = value
  card.appendChild(strong)
  var labelNode = document.createElement('span')
  labelNode.textContent = label
  card.appendChild(labelNode)
  if (detail) {
    var detailNode = document.createElement('p')
    detailNode.textContent = detail
    card.appendChild(detailNode)
  }
  return card
}

function renderBuildExecutiveSummary(buildLog, builds) {
  var latestCloseout = (builds || []).find(function(build) { return build.operatorCloseout }) || builds[0] || null
  var section = document.createElement('section')
  section.className = 'build-log-executive-summary'

  var copy = document.createElement('div')
  copy.className = 'build-log-executive-copy'
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Executive Review'
  copy.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = latestCloseout ? latestCloseout.subject || 'Latest shipped work' : 'No recent builds loaded'
  copy.appendChild(title)
  var intro = document.createElement('p')
  intro.textContent = latestCloseout
    ? 'Review next: ' + getBuildReviewNext(latestCloseout)
    : 'Recent Work will show shipped builds when closeouts are available.'
  copy.appendChild(intro)
  section.appendChild(copy)

  var metrics = document.createElement('div')
  metrics.className = 'build-log-summary-grid'
  var summary = buildLog.summary || {}
  metrics.appendChild(renderBuildSummaryMetric(
    'Closeouts',
    String(summary.closeoutBuilds || 0),
    'Major builds with explicit proof and review notes.'
  ))
  metrics.appendChild(renderBuildSummaryMetric(
    'Proof linked',
    String(summary.proofLinkedBuilds || 0),
    'Builds with recorded proof commands.'
  ))
  metrics.appendChild(renderBuildSummaryMetric(
    'Review notes',
    String(summary.reviewNextBuilds || 0),
    'Builds that say what to inspect next.'
  ))
  metrics.appendChild(renderBuildSummaryMetric(
    'Ownership',
    'Exact',
    'Owning cards and context cards stay separate.'
  ))
  section.appendChild(metrics)

  return section
}

function renderBuildReviewQueue(builds) {
  var reviewBuilds = (builds || []).filter(function(build) {
    return build.operatorCloseout && getBuildReviewNext(build)
  }).slice(0, 5)
  if (!reviewBuilds.length) return null

  var panel = document.createElement('section')
  panel.className = 'panel build-log-review-panel'
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Review Next'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'What Steve should inspect first'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Short queue from the latest closeouts. Open a row to inspect proof, where it lives, and known limits.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var list = document.createElement('div')
  list.className = 'build-log-review-list'
  reviewBuilds.forEach(function(build) {
    var link = document.createElement('a')
    link.className = 'build-log-review-link'
    link.href = '/foundation#build-log:' + encodeURIComponent(getBuildAnchorId(build))
    var titleNode = document.createElement('strong')
    titleNode.textContent = build.closeoutKey || build.subject || 'Build closeout'
    link.appendChild(titleNode)
    var body = document.createElement('span')
    body.textContent = getBuildReviewNext(build)
    link.appendChild(body)
    var meta = document.createElement('small')
    meta.textContent = (build.shortSha || 'commit') + ' · ' + (build.backlogIds || []).join(', ')
    link.appendChild(meta)
    list.appendChild(link)
  })
  panel.appendChild(list)
  return panel
}

function renderCurrentSprintCard(item) {
  var card = document.createElement('details')
  card.className = 'current-sprint-card'
  card.setAttribute('data-current-sprint-stage', item.stage || '')
  if (item.stage === 'scoping' || item.stage === 'building_now') card.open = true

  var summary = document.createElement('summary')
  summary.className = 'current-sprint-card-summary'
  var copy = document.createElement('div')
  copy.className = 'current-sprint-card-main'
  var title = document.createElement('strong')
  title.textContent = (item.cardId || 'missing-card') + ' · ' + (item.title || 'Missing backlog card')
  copy.appendChild(title)
  var meta = document.createElement('p')
  meta.textContent = [
    Number.isFinite(Number(item.order)) ? 'Order ' + item.order : null,
    item.stageLabel || item.stage || 'stage',
    item.backlogLane ? getBacklogLaneLabel(item.backlogLane) : null,
    item.backlogPriority || null,
  ].filter(Boolean).join(' · ')
  copy.appendChild(meta)
  summary.appendChild(copy)
  var pill = renderBuildPill(item.existingWorkCheckStatus === 'complete' ? 'Doctrine checked' : 'Doctrine missing', item.existingWorkCheckStatus === 'complete' ? 'foundation-system-pill current-sprint-ready-pill' : 'foundation-system-pill current-sprint-risk-pill')
  if (pill) summary.appendChild(pill)
  card.appendChild(summary)

  var facts = document.createElement('div')
  facts.className = 'current-sprint-card-body'
  ;[
    renderBuildFact('Definition of done', item.definitionOfDone),
    renderBuildFact('Readiness blocker cleared', item.readinessBlockerCleared),
    renderBuildFact('Returned reason', item.stage === 'returned' ? item.returnedReason : null),
    renderBuildFact('Next action', item.stage === 'returned' ? (item.returnedReason || item.nextAction || item.backlogNextAction) : (item.nextAction || item.backlogNextAction)),
    renderBuildFact('Plan', item.planRef),
    renderBuildFact('Proof commands', item.proofCommands || [], { mono: true }),
    renderBuildFact('Not next', item.notNextBoundaries || []),
  ].forEach(function(row) {
    if (row) facts.appendChild(row)
  })

  var backlogLink = document.createElement('a')
  backlogLink.className = 'build-log-backlog-link'
  backlogLink.href = '/foundation#backlog:' + encodeURIComponent(item.cardId || '')
  backlogLink.textContent = 'Open backlog card'
  facts.appendChild(renderBuildFact('Backlog truth', backlogLink))
  card.appendChild(facts)

  return card
}

function renderCurrentSprintPanel(currentSprint) {
  var panel = document.createElement('section')
  panel.className = 'panel current-sprint-panel'
  var cadence = (currentSprint && currentSprint.cadence) || {}

  var header = document.createElement('div')
  header.className = 'panel-header current-sprint-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Current Sprint'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Sprint command view'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = (cadence && cadence.executiveSummary) || 'Execution-control overlay on live backlog. Prior done and returned cards live in Backlog and Recent Work.'
  left.appendChild(intro)
  header.appendChild(left)
  header.appendChild(renderBuildPill(currentSprint && currentSprint.status === 'healthy' ? 'Healthy' : 'Needs attention', currentSprint && currentSprint.status === 'healthy' ? 'foundation-system-pill build-log-status-pill build-log-status-shipped' : 'foundation-system-pill current-sprint-risk-pill'))
  panel.appendChild(header)

  var summary = currentSprint && currentSprint.summary ? currentSprint.summary : {}
  var metrics = document.createElement('div')
  metrics.className = 'current-sprint-command-grid current-sprint-metrics'
  metrics.appendChild(renderBuildSummaryMetric(
    'Sprint goal',
    (currentSprint && currentSprint.goal) || 'missing',
    'Current Sprint remains an overlay on live backlog truth.'
  ))
  metrics.appendChild(renderBuildSummaryMetric(
    'Current status',
    (cadence.currentStatusDetail || summary.currentStatus || 'unknown'),
    'Stage counts and findings come from the central sprint registry.'
  ))
  metrics.appendChild(renderBuildSummaryMetric(
    'Next card',
    (cadence.nextCard && cadence.nextCard.cardId) || summary.nextCardId || 'missing',
    (cadence.nextCard && cadence.nextCard.title) || 'No next card resolved from live backlog.'
  ))
  metrics.appendChild(renderBuildSummaryMetric(
    'Active blocker',
    (currentSprint && currentSprint.activeBlocker && currentSprint.activeBlocker.cardId) || 'missing',
    (currentSprint && currentSprint.activeBlocker && currentSprint.activeBlocker.title) || 'No blocker resolved from live backlog.'
  ))
  panel.appendChild(metrics)

  var commandStrip = document.createElement('div')
  commandStrip.className = 'current-sprint-command-strip'
  var stripItems = [
    ['Scoping', summary.stageCounts && summary.stageCounts.scoping],
    ['Sprint Ready', summary.stageCounts && summary.stageCounts.sprint_ready],
    ['Building Now', summary.stageCounts && summary.stageCounts.building_now],
  ]
  if (Number(summary.stageCounts && summary.stageCounts.returned) > 0) {
    stripItems.push(['Returned', summary.stageCounts.returned])
  }
  if (Number(summary.stageCounts && summary.stageCounts.done_this_sprint) > 0) {
    stripItems.push(['Done This Sprint', summary.stageCounts.done_this_sprint])
  }
  stripItems.forEach(function(pair) {
    var item = document.createElement('span')
    item.textContent = pair[0] + ': ' + String(pair[1] || 0)
    commandStrip.appendChild(item)
  })
  panel.appendChild(commandStrip)

  if ((cadence.exitCriteria || []).length) {
    var exit = document.createElement('div')
    exit.className = 'current-sprint-exit'
    var exitTitle = document.createElement('strong')
    exitTitle.textContent = 'Exit criteria'
    exit.appendChild(exitTitle)
    exit.appendChild(renderBuildTextList((cadence.exitCriteria || []).slice(0, 8), 'build-log-fact-list'))
    panel.appendChild(exit)
  }

  var findings = (currentSprint && currentSprint.findings) || []
  if (findings.length) {
    var findingsPanel = document.createElement('div')
    findingsPanel.className = 'current-sprint-findings'
    findings.slice(0, 5).forEach(function(finding) {
      var row = document.createElement('p')
      row.textContent = (finding.check || 'check') + ': ' + (finding.detail || 'needs attention')
      findingsPanel.appendChild(row)
    })
    panel.appendChild(findingsPanel)
  }

  var currentSprintExpectedStages = ['scoping', 'sprint_ready', 'building_now']
  var alwaysVisibleStageKeys = { scoping: true, sprint_ready: true, building_now: true }
  var stages = currentSprint && currentSprint.stages && currentSprint.stages.length
    ? currentSprint.stages
    : currentSprintExpectedStages.map(function(stageKey) {
        return { key: stageKey, label: stageKey.replace(/_/g, ' '), items: [] }
      })
  stages = stages.filter(function(stage) {
    return alwaysVisibleStageKeys[stage.key] || ((stage.items || []).length > 0)
  })
  var stageWrap = document.createElement('div')
  stageWrap.className = 'current-sprint-board'
  stages.forEach(function(stage) {
    var stageSection = document.createElement('div')
    stageSection.className = 'current-sprint-stage-row current-sprint-stage-' + String(stage.key || '').replace(/[^a-z0-9_-]/gi, '-')
    var stageTitle = document.createElement('h4')
    stageTitle.textContent = (stage.label || stage.key || 'Stage') + ' · ' + ((stage.items || []).length)
    stageSection.appendChild(stageTitle)
    var stageItems = document.createElement('div')
    stageItems.className = 'current-sprint-stage-items'
    if ((stage.items || []).length) {
      ;(stage.items || []).forEach(function(item) {
        stageItems.appendChild(renderCurrentSprintCard(item))
      })
    } else {
      var empty = document.createElement('p')
      empty.className = 'section-intro'
      empty.textContent = 'No cards in this stage.'
      stageItems.appendChild(empty)
    }
    stageSection.appendChild(stageItems)
    stageWrap.appendChild(stageSection)
  })
  panel.appendChild(stageWrap)

  return panel
}

function renderBuildFact(label, value, options) {
  if (!value || (Array.isArray(value) && !value.length)) return null
  var row = document.createElement('div')
  row.className = 'build-log-fact'
  var strong = document.createElement('strong')
  strong.textContent = label
  row.appendChild(strong)
  if (Array.isArray(value)) {
    var list = renderBuildTextList(value, options && options.mono ? 'build-log-fact-list build-log-fact-list-mono' : 'build-log-fact-list')
    if (list) row.appendChild(list)
  } else if (value instanceof Node) {
    row.appendChild(value)
  } else {
    var copy = document.createElement('span')
    copy.textContent = value
    row.appendChild(copy)
  }
  return row
}

function renderBuildCard(build) {
  var card = document.createElement('details')
  card.className = 'build-log-card build-log-executive-card'
  card.id = getBuildAnchorId(build)

  var summary = document.createElement('summary')
  summary.className = 'build-log-card-summary'
  var copy = document.createElement('div')
  copy.className = 'build-log-card-summary-main'
  var title = document.createElement('strong')
  title.textContent = build.closeoutKey || build.subject || 'Untitled build'
  copy.appendChild(title)
  var meta = document.createElement('p')
  meta.className = 'build-log-meta'
  meta.textContent = [
    build.shortSha || 'commit',
    formatDate(build.committedAt),
    build.subject || null,
  ].filter(Boolean).join(' · ')
  copy.appendChild(meta)
  var review = document.createElement('p')
  review.className = 'build-log-card-review-next'
  review.textContent = getBuildReviewNext(build)
  copy.appendChild(review)

  var areaWrap = document.createElement('div')
  areaWrap.className = 'foundation-system-summary-tags'
  ;([build.operatorStatus, build.acceptanceState, build.systemArea]).filter(Boolean).forEach(function(area, index) {
    areaWrap.appendChild(renderBuildPill(
      area,
      index === 0
        ? 'foundation-system-pill build-log-status-pill build-log-status-' + String(build.operatorStatus || 'unknown').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
        : 'foundation-system-pill'
    ))
  })
  summary.appendChild(copy)
  summary.appendChild(areaWrap)
  card.appendChild(summary)

  var quick = document.createElement('div')
  quick.className = 'build-log-quick-strip'
  quick.appendChild(renderBuildSummaryMetric('Owned cards', String((build.backlogIds || []).length || '0'), (build.backlogIds || []).join(', ') || 'No owning card'))
  quick.appendChild(renderBuildSummaryMetric('Where it lives', getBuildFirstWhere(build), null))
  quick.appendChild(renderBuildSummaryMetric('Proof', buildProofSummary(build), build.proofStatus || null))
  quick.appendChild(renderBuildSummaryMetric('Known limits', String((build.knownLimits || []).length), 'Limits are listed inside this closeout.'))
  card.appendChild(quick)

  var facts = document.createElement('div')
  facts.className = 'build-log-facts build-log-card-body'
  ;[
    renderBuildFact('What changed', build.whatChanged || build.subject || 'Repo update'),
    renderBuildFact('Why it matters', build.whyItMatters),
    renderBuildFact('What it does', build.whatItDoes),
    renderBuildFact('Owned cards', renderBuildBacklogLinks(build, { kind: 'owned' })),
    renderBuildFact('Context cards', renderBuildBacklogLinks(build, { kind: 'context' })),
    renderBuildFact('Proof status', build.proofStatus),
    renderBuildFact('Proof commands', build.proofCommands || [], { mono: true }),
    renderBuildFact('Where it lives', build.whereItLives || build.fileGroups || [], { mono: true }),
    renderBuildFact('Review next', build.reviewNext),
    renderBuildFact('Known limits', build.knownLimits || []),
  ].forEach(function(row) {
    if (row) facts.appendChild(row)
  })
  card.appendChild(facts)

  var groups = document.createElement('p')
  groups.className = 'build-log-files'
  groups.textContent = ((build.fileGroups || []).join(', ') || 'Repo') + ' · ' + (build.fileCount || 0) + ' files'
  card.appendChild(groups)

  if ((build.primaryFiles || []).length) {
    var files = document.createElement('details')
    files.className = 'build-log-details'
    var summary = document.createElement('summary')
    summary.textContent = 'Files changed'
    files.appendChild(summary)
    var list = document.createElement('ul')
    ;(build.primaryFiles || []).forEach(function(file) {
      var item = document.createElement('li')
      item.textContent = file
      list.appendChild(item)
    })
    files.appendChild(list)
    card.appendChild(files)
  }

  return card
}

function groupBuildsByDayAndArea(builds) {
  var dayMap = new Map()
  ;(builds || []).forEach(function(build) {
    var day = String(build.committedAt || '').slice(0, 10) || 'Unknown date'
    var area = build.systemArea || build.primaryArea || (build.areas && build.areas[0]) || 'Repo'
    if (!dayMap.has(day)) dayMap.set(day, new Map())
    var areaMap = dayMap.get(day)
    if (!areaMap.has(area)) areaMap.set(area, [])
    areaMap.get(area).push(build)
  })
  return Array.from(dayMap.entries()).map(function(dayEntry) {
    return {
      day: dayEntry[0],
      systemGroups: Array.from(dayEntry[1].entries()).map(function(areaEntry) {
        return {
          systemArea: areaEntry[0],
          builds: areaEntry[1],
        }
      }),
    }
  })
}

function groupBuildsByCommit(builds) {
  var commitMap = new Map()
  ;(builds || []).forEach(function(build) {
    var key = build.sha || build.shortSha || build.subject || ('build-' + commitMap.size)
    if (!commitMap.has(key)) {
      commitMap.set(key, {
        sha: build.sha || '',
        shortSha: build.shortSha || '',
        subject: build.subject || 'Repo change',
        committedAt: build.committedAt || '',
        builds: [],
      })
    }
    commitMap.get(key).builds.push(build)
  })
  return Array.from(commitMap.values())
}

function renderBuildCommitGroup(commitGroup) {
  var details = document.createElement('details')
  details.className = 'build-log-commit-group'

  var summary = document.createElement('summary')
  summary.className = 'build-log-commit-summary'
  var shortSha = commitGroup.shortSha || String(commitGroup.sha || '').slice(0, 7) || 'commit'
  var ownedIds = []
  ;(commitGroup.builds || []).forEach(function(build) {
    ;(build.backlogIds || []).forEach(function(id) {
      if (ownedIds.indexOf(id) === -1) ownedIds.push(id)
    })
  })
  summary.textContent = shortSha + ' · Multiple closeouts · Grouped same-commit closeouts · '
    + commitGroup.builds.length + ' closeouts · '
    + ownedIds.length + ' owning card' + (ownedIds.length === 1 ? '' : 's')
  details.appendChild(summary)

  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'One commit can carry multiple closeouts when a coordinated wave ships together. Each closeout below stays collapsed, individually reviewable, and tied only to its own owning backlog cards.'
  details.appendChild(intro)

  commitGroup.builds.forEach(function(build) {
    details.appendChild(renderBuildCard(build))
  })

  return details
}

function renderBuildGroups(buildLog, builds) {
  var groups = buildLog.groups && buildLog.groups.length
    ? buildLog.groups
    : groupBuildsByDayAndArea(builds)
  var wrap = document.createElement('div')
  wrap.className = 'build-log-day-list'

  groups.forEach(function(dayGroup) {
    var daySection = document.createElement('section')
    daySection.className = 'build-log-day-group'

    var dayTitle = document.createElement('h4')
    dayTitle.textContent = dayGroup.day === 'unknown-date' ? 'Unknown Date' : formatAsOfDate(dayGroup.day)
    daySection.appendChild(dayTitle)

    ;(dayGroup.systemGroups || []).forEach(function(systemGroup) {
      var areaSection = document.createElement('div')
      areaSection.className = 'build-log-area-group'

      var areaTitle = document.createElement('div')
      areaTitle.className = 'build-log-area-title'
      areaTitle.textContent = systemGroup.systemArea || 'Repo'
      areaSection.appendChild(areaTitle)

      var list = document.createElement('div')
      list.className = 'build-log-list'
      groupBuildsByCommit(systemGroup.builds || []).forEach(function(commitGroup) {
        if (commitGroup.builds.length > 1) {
          list.appendChild(renderBuildCommitGroup(commitGroup))
          return
        }
        list.appendChild(renderBuildCard(commitGroup.builds[0]))
      })
      areaSection.appendChild(list)
      daySection.appendChild(areaSection)
    })

    wrap.appendChild(daySection)
  })

  return wrap
}

function renderBuildLog() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading recent work.</p>'

  Promise.all([fetchFoundationBuildLog(), fetchFoundationCurrentSprint()]).then(function(results) {
    var buildLog = results[0]
    var currentSprintPayload = results[1]
    var builds = buildLog.builds || []
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero'
    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'
    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Recent Work'
    heroInner.appendChild(heroTitle)
    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    heroMeta.textContent = builds.length + ' recent commits · ' + ((buildLog.summary && buildLog.summary.closeoutBuilds) || 0) + ' v2 closeouts'
    heroInner.appendChild(heroMeta)
    var heroNote = document.createElement('p')
    heroNote.className = 'hero-copy'
    heroNote.textContent = 'Plain-English changelog for what changed, why it matters, proof, and where to review next. Closeout cards are collapsed by default and explicit about owning cards versus context cards.'
    heroInner.appendChild(heroNote)
    hero.appendChild(heroInner)
    container.appendChild(hero)

    container.appendChild(renderCurrentSprintPanel(currentSprintPayload.currentSprint))

    container.appendChild(renderBuildExecutiveSummary(buildLog, builds))

    var purposePanel = renderOverviewStatusPanel([
      {
        label: 'Purpose',
        status: 'connected',
        detail: 'Show Steve what changed while builders were moving quickly, without reading every commit or handoff.',
      },
      {
        label: 'Data backing',
        status: 'connected',
        detail: 'Git commit history on main plus repo-truth closeout records for major Foundation builds.',
      },
      {
        label: 'Backlog and proof coverage',
        status: ((buildLog.summary && buildLog.summary.closeoutBuilds) || 0) ? 'connected' : 'pending',
        detail: ((buildLog.summary && buildLog.summary.backlogLinkedBuilds) || 0) + ' commits link to backlog cards; ' + ((buildLog.summary && buildLog.summary.proofLinkedBuilds) || 0) + ' carry proof commands.',
      },
      {
        label: 'Boundary',
        status: 'pending',
        detail: 'This is the build review surface. Closeout cards are collapsed by default. System Activity remains the DB trust-event feed; Runtime Health remains the job/worker view.',
      },
    ], {
      eyebrow: 'Build Visibility',
      title: 'What changed and where to review',
      intro: 'Use this after a heavy build day before deciding what to test, review, or explain.',
    })
    if (purposePanel) container.appendChild(purposePanel)

    var reviewQueue = renderBuildReviewQueue(builds)
    if (reviewQueue) container.appendChild(reviewQueue)

    var panel = document.createElement('section')
    panel.className = 'panel'
    var header = document.createElement('div')
    header.className = 'panel-header'
    var left = document.createElement('div')
    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Repo Build Log'
    left.appendChild(eyebrow)
    var title = document.createElement('h3')
    title.textContent = 'Grouped by day and system'
    left.appendChild(title)
    var intro = document.createElement('p')
    intro.className = 'section-intro'
    intro.textContent = 'Major builds carry explicit closeout records. Same-commit groups stay together, while each closeout keeps exact owning cards, context cards, proof, and review notes.'
    left.appendChild(intro)
    header.appendChild(left)
    panel.appendChild(header)

    panel.appendChild(renderBuildGroups(buildLog, builds))
    container.appendChild(panel)

    var changesPanel = renderRecentChangesPanel((buildLog.recentChanges || []).slice(0, 5), {
      eyebrow: 'Related Trust Events',
      title: 'Latest DB changes',
      intro: 'Recent build commits explain code/doc changes; these records show the latest DB trust-layer events.',
    })
    if (changesPanel) container.appendChild(changesPanel)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Recent Work could not load. Details: ' + error.message
    container.appendChild(msg)
  })
}
