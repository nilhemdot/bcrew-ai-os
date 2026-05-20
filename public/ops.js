function formatDate(isoString) {
  if (!isoString) return 'Not available'
  var date = new Date(isoString)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date) + ' ET'
}

function getSection() {
  var hash = window.location.hash.replace('#', '')
  return hash || 'overview'
}

function getAdminHeaders() {
  try {
    var token = window.localStorage && window.localStorage.getItem('BCREW_ADMIN_TOKEN')
    return token ? { 'X-Admin-Token': token } : {}
  } catch (error) {
    return {}
  }
}

function fetchJson(url) {
  return fetch(url, { cache: 'no-store', headers: getAdminHeaders() }).then(function(response) {
    if (!response.ok) throw new Error(url + ' returned ' + response.status)
    return response.json()
  })
}

function fetchFoundationHub() {
  return fetchJson('/api/ops-hub')
}

function fetchOwnersReviewQueue() {
  return fetchJson('/api/owners/review-queue')
}

var OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
var OWNERS_ADMIN_GID = '533201019'
var OWNERS_CONDITIONAL_GID = '131346715'
var opsHelperReady = false
var opsHelperQueueStats = null

function createActionLink(label, href, className) {
  var link = document.createElement('a')
  link.className = className || 'secondary-button'
  link.href = href
  link.textContent = label
  if (/^https?:\/\//.test(href)) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  return link
}

function renderStatusCard(item) {
  var card = document.createElement('article')
  card.className = 'status-card status-' + item.status

  var top = document.createElement('div')
  top.className = 'status-top'

  var label = document.createElement('span')
  label.className = 'status-label'
  label.textContent = item.label
  top.appendChild(label)

  var pill = document.createElement('span')
  pill.className = 'status-pill'
  pill.textContent = item.status
  top.appendChild(pill)

  card.appendChild(top)

  var detail = document.createElement('p')
  detail.textContent = item.detail
  card.appendChild(detail)

  return card
}

function renderStatusDot(statusKey, label) {
  var wrap = document.createElement('span')
  wrap.className = 'current-state-dot current-state-dot-' + statusKey
  wrap.title = label
  wrap.setAttribute('aria-label', label)
  return wrap
}

function renderLabeledCopy(label, value) {
  var row = document.createElement('div')
  row.className = 'decision-meta'

  var strong = document.createElement('strong')
  strong.textContent = label + ': '
  row.appendChild(strong)

  row.appendChild(document.createTextNode(value || 'Not recorded'))
  return row
}

function renderInlineList(label, values) {
  if (!Array.isArray(values) || !values.length) return null
  return renderLabeledCopy(label, values.join(' · '))
}

function getHubServedJobs(hub, hubKey) {
  var jobs = hub.foundationJobs && Array.isArray(hub.foundationJobs.jobs) ? hub.foundationJobs.jobs : []
  return jobs.filter(function(job) {
    return Array.isArray(job.servesHubs) && job.servesHubs.indexOf(hubKey) !== -1
  })
}

function getOpsReviewQueueStats(queuePayload) {
  var queue = queuePayload && queuePayload.reviewQueue ? queuePayload.reviewQueue : {}
  var sections = queue.sections || {}
  function sectionPayload(key) {
    var section = sections[key] || {}
    var items = Array.isArray(section.items) ? section.items : []
    return {
      openItems: Number.isFinite(Number(section.openItems)) ? Number(section.openItems) : items.length,
      queuedReview: Number.isFinite(Number(section.queuedReview)) ? Number(section.queuedReview) : items.filter(function(item) { return item.queuedForReview }).length,
      needsFixing: Number.isFinite(Number(section.needsFixing)) ? Number(section.needsFixing) : items.filter(function(item) { return item.needsFixing }).length,
      freshness: section.freshness || null,
      items: items,
    }
  }
  return {
    status: queue.status || 'unknown',
    openItems: queue.stats && Number.isFinite(Number(queue.stats.openItems)) ? Number(queue.stats.openItems) : 0,
    queuedReview: queue.stats && Number.isFinite(Number(queue.stats.queuedReview)) ? Number(queue.stats.queuedReview) : 0,
    needsFixing: queue.stats && Number.isFinite(Number(queue.stats.needsFixing)) ? Number(queue.stats.needsFixing) : 0,
    freshness: queue.freshness || null,
    ownersSheet: queue.ownersSheet || { sheetId: OWNERS_SHEET_ID },
    sections: {
      admin: sectionPayload('admin'),
      conditional: sectionPayload('conditional'),
      fubDrift: sectionPayload('fubDrift'),
      ownersGovernance: sectionPayload('ownersGovernance'),
      agentRoster: sectionPayload('agentRoster'),
    },
  }
}

function getJobRunLine(job) {
  var latest = job.latestRun || null
  var last = latest
    ? 'Last ' + latest.status + ' at ' + formatDate(latest.finishedAt || latest.startedAt || latest.createdAt)
    : 'No run recorded yet'
  var next = job.nextRunAt ? 'Next run ' + formatDate(job.nextRunAt) : 'No scheduled next run'
  return last + ' · ' + next
}

function getOpsQueueLine(queueStats) {
  return queueStats.openItems + ' open total · ' +
    queueStats.sections.admin.openItems + ' admin · ' +
    queueStats.sections.conditional.openItems + ' conditional · ' +
    queueStats.sections.agentRoster.openItems + ' agent onboarding · ' +
    queueStats.sections.fubDrift.openItems + ' FUB drift · ' +
    queueStats.sections.ownersGovernance.openItems + ' Owners lists'
}

function renderOpsSystemPill(job, queueStats) {
  var details = document.createElement('details')
  details.className = 'source-item'

  var summary = document.createElement('summary')
  summary.className = 'source-item-summary'

  var left = document.createElement('div')
  left.className = 'source-item-summary-left'

  var title = document.createElement('div')
  title.className = 'source-item-summary-title'
  title.textContent = job.title || job.key
  left.appendChild(title)

  var meta = document.createElement('div')
  meta.className = 'source-item-summary-meta'
  meta.textContent = [job.runtimeMode || 'runtime unknown', job.cadence || '', job.scheduleStatus || ''].filter(Boolean).join(' · ')
  left.appendChild(meta)

  var copy = document.createElement('div')
  copy.className = 'source-item-summary-copy'
  copy.textContent = job.systemSummary || job.description || 'No summary recorded.'
  left.appendChild(copy)
  summary.appendChild(left)

  var right = document.createElement('div')
  right.className = 'source-item-summary-right'
  var dotStatus = job.status === 'live' ? 'connected' : (job.status || 'pending')
  right.appendChild(renderStatusDot(dotStatus, job.status || 'pending'))
  summary.appendChild(right)

  details.appendChild(summary)

  var body = document.createElement('div')
  body.className = 'source-item-body'

  body.appendChild(renderLabeledCopy('Run state', getJobRunLine(job)))
  body.appendChild(renderLabeledCopy('Command', [job.command].concat(job.args || []).filter(Boolean).join(' ')))
  if (job.sourceIds && job.sourceIds.length) body.appendChild(renderLabeledCopy('Sources', job.sourceIds.join(' · ')))

  var inputs = renderInlineList('Inputs', job.systemInputs || [])
  if (inputs) body.appendChild(inputs)
  var outputs = renderInlineList('Outputs', job.systemOutputs || [])
  if (outputs) body.appendChild(outputs)
  if (job.nextAction) body.appendChild(renderLabeledCopy('Boundary', job.nextAction))

  body.appendChild(renderLabeledCopy('Current queue', getOpsQueueLine(queueStats)))

  if (job.key === 'admin-deal-review-readonly') {
    body.appendChild(renderLabeledCopy(
      'Extra detail',
      'Ops fixes source rows, marks Review This Deal, and this lane rewrites AI status/action/findings without auto-fixing source fields.'
    ))
  }

  if (job.key === 'admin-deal-backlog-review') {
    body.appendChild(renderLabeledCopy(
      'Extra detail',
      job.systemSummary || job.description || 'Runs newest to older from the source-contract cutoff and checks post-policy follow-through in ClickUp Deal Data Entry.'
    ))
  }

  if (job.key === 'conditional-deal-review-readonly') {
    body.appendChild(renderLabeledCopy(
      'Extra detail',
      'Buyer/seller conditional tags stay live; mutual-release tags are excluded. Mark column N as Review This Conditional to re-check a fixed conditional row.'
    ))
  }

  var actions = document.createElement('div')
  actions.className = 'foundation-module-actions'
  actions.appendChild(createActionLink('Open Ops Inbox', '/ops#inbox', 'secondary-button'))
  body.appendChild(actions)

  details.appendChild(body)
  return details
}

function renderOpsSystemSummaryCard(job) {
  var labels = {
    'admin-deal-review-readonly': 'Admin re-checks',
    'admin-deal-backlog-review': 'Admin backlog scan',
    'conditional-deal-review-readonly': 'Conditional forecast sync',
    'agent-roster-review': 'Agent onboarding check',
    'agent-feedback-auto-send-readiness': 'Feedback production auto-send',
    'agent-feedback-reminder-readiness': 'Feedback live reminders',
  }
  var summaries = {
    'admin-deal-review-readonly': 'Re-checks Admin deals after someone marks them ready for review.',
    'admin-deal-backlog-review': 'Checks 5 older eligible Admin deals per day so the backlog clears without flooding Ops.',
    'conditional-deal-review-readonly': 'Keeps the conditional forecast sheet rebuilt from the ClickUp deal board.',
    'agent-roster-review': 'Checks the Agent Roster and tracks 30/60/90 onboarding feedback.',
    'agent-feedback-auto-send-readiness': 'Runs governed 30/60/90 onboarding feedback sends and fails closed unless the live guard is approved.',
    'agent-feedback-reminder-readiness': 'Runs governed onboarding feedback reminders after Requested, and fails closed outside the approved morning send window.',
  }
  return renderStatusCard({
    label: labels[job.key] || job.title || job.key,
    status: job.status === 'live' ? 'live' : (job.status || 'pending'),
    detail: summaries[job.key] || job.description || 'Running in the background for Ops.',
  })
}

function renderPanel(eyebrowText, titleText, introText) {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'

  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = eyebrowText
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
  return panel
}

function flattenOpsQueueItems(queueStats) {
  var items = []
  Object.keys(queueStats.sections || {}).forEach(function(sectionKey) {
    var section = queueStats.sections[sectionKey]
    ;(section.items || []).forEach(function(item) {
      items.push({
        sectionKey: sectionKey,
        item: item,
      })
    })
  })
  return items
}

function summarizeOpsItem(entry) {
  var item = entry.item || {}
  var laneLabels = {
    admin: 'Admin deal review',
    conditional: 'Conditional forecast',
    fubDrift: 'FUB source rules',
    ownersGovernance: 'Owners list drift',
    agentRoster: 'Agent onboarding',
  }
  var lines = []
  lines.push((item.title || item.id || 'This item') + ' is in ' + (laneLabels[entry.sectionKey] || entry.sectionKey) + '.')
  if (item.subtitle) lines.push(item.subtitle + '.')
  if (item.reviewStatus || item.reviewAction) {
    lines.push('Current status: ' + [item.reviewStatus, item.reviewAction].filter(Boolean).join(' / ') + '.')
  }
  var findings = String(item.findingsPreview || '').trim()
  if (findings) {
    var blocks = parseOpsFindings(findings)
    var bullets = []
    blocks.forEach(function(block) {
      ;(block.bullets || []).forEach(function(bullet) {
        bullets.push(bullet)
      })
    })
    if (bullets.length) {
      lines.push('What to fix: ' + bullets.slice(0, 4).join(' | ') + (bullets.length > 4 ? ' | plus more on the card.' : ''))
    } else {
      lines.push('Finding: ' + findings)
    }
  }
  if (entry.sectionKey === 'admin') {
    lines.push('After the source data is fixed, mark the row Review This Deal so AIOS re-checks it.')
  }
  if (entry.sectionKey === 'conditional') {
    lines.push('After the forecast data is fixed, mark column N as Review This Conditional so AIOS re-checks it.')
  }
  return lines.join('\n')
}

function getOpsItemTitle(item) {
  return item.title || item.id || 'Review item'
}

function getOpsLaneBullets(item, lane) {
  var bullets = []
  parseOpsFindings(item.findingsPreview || '').forEach(function(block) {
    ;(block.bullets || []).forEach(function(bullet) {
      if (getFindingLane(bullet, block.label).indexOf(lane) !== -1) bullets.push(bullet)
    })
  })
  return bullets
}

function findOpsLaneEntries(queueStats, lane) {
  return flattenOpsQueueItems(queueStats).filter(function(entry) {
    var item = entry.item || {}
    return getOpsIssueLanes(item).indexOf(lane) !== -1 || getOpsLaneBullets(item, lane).length > 0
  })
}

function formatOpsLaneEntry(entry, queueStats, lane, includeLink) {
  var item = entry.item || {}
  var bullets = getOpsLaneBullets(item, lane)
  var lines = []
  lines.push(getOpsItemTitle(item) + (item.subtitle ? ' - ' + item.subtitle : ''))
  if (bullets.length) lines.push('Cleanup: ' + bullets.slice(0, 2).join(' | '))
  if (includeLink) {
    var href = getQueueItemHref(queueStats, item) || item.feedbackUrl || ''
    if (href) lines.push('Open source row: ' + href)
  }
  return lines.join('\n')
}

function buildOpsLaneCleanupReply(queueStats, lane, label, emptyText, includeLink, oneOnly) {
  var entries = findOpsLaneEntries(queueStats, lane)
  if (!entries.length) return emptyText
  var shown = oneOnly ? entries.slice(0, 1) : entries.slice(0, 5)
  var lines = [
    oneOnly
      ? 'Use this ' + label + ' cleanup card:'
      : label + ' cleanup cards open right now:',
    '',
  ]
  shown.forEach(function(entry) {
    lines.push(formatOpsLaneEntry(entry, queueStats, lane, includeLink))
    lines.push('')
  })
  if (!oneOnly && entries.length > shown.length) {
    lines.push((entries.length - shown.length) + ' more ' + label + ' item' + (entries.length - shown.length === 1 ? '' : 's') + ' are open.')
  }
  return lines.join('\n').trim()
}

function buildFieldListReply(title, fields, footer) {
  return [
    title,
    '',
  ].concat(fields.map(function(field) {
    return '- ' + field
  })).concat(footer ? ['', footer] : []).join('\n')
}

function buildOpsFieldReferenceReply(question) {
  var lower = String(question || '').toLowerCase()
  var asksField = lower.indexOf('field') !== -1 || lower.indexOf('fields') !== -1 || lower.indexOf('column') !== -1 || lower.indexOf('columns') !== -1 || lower.indexOf('fill out') !== -1 || lower.indexOf('fill in') !== -1
  if (!asksField) return ''

  if (lower.indexOf('nps') !== -1) {
    return buildFieldListReply('For Client NPS cleanup, check these ClickUp fields:', [
      'NPS Status',
      'NPS Score',
      'NPS Comments',
      'FUB Call / Review Evidence Link',
    ], 'NPS Status should be Requested, Completed, or Not Eligible. If Completed, NPS Score should be filled in.')
  }

  if (lower.indexOf('google') !== -1 || lower.indexOf('review status') !== -1 || lower.indexOf('client review') !== -1) {
    return buildFieldListReply('For Google Review cleanup, check these ClickUp fields:', [
      'Review Status',
      'Google Review Requested',
      'Google Review Captured',
      'Google Review Target Count',
      'Google Review Captured Count',
      'Google Review Link',
      'Google Review Link(s) / Evidence',
      'FUB Call / Review Evidence Link',
    ], 'Review Status should be Requested, Captured, or Not Eligible. If Captured, add count/evidence.')
  }

  if (lower.indexOf('internal') !== -1 || lower.indexOf('onboarding') !== -1 || lower.indexOf('deal review') !== -1) {
    return buildFieldListReply('For Internal Review cleanup, check these ClickUp fields:', [
      'Internal Onboarding Status',
      'Internal Onboarding Skipped Reason',
      'Internal Onboarding Survey Requested',
      'Internal Onboarding Survey Completed',
      'Internal Onboarding Survey Score',
      'Internal Onboarding Survey Comments',
      'Internal Deal Review Status',
      'Internal Deal Review Skipped Reason',
      'Internal Deal Management Survey Requested',
      'Internal Deal Management Survey Completed',
      'Internal Deal Management Survey Score',
      'Internal Deal Management Survey Comments',
    ], 'Use Completed when done. Use Skipped only when it truly does not apply, and fill in the skipped reason.')
  }

  if (lower.indexOf('conditional') !== -1) {
    return buildFieldListReply('For Conditional cleanup, check these fields:', [
      'Agent',
      'Side',
      'Closing Date',
      'Net To Team $',
      'Trade Number',
      'FUB Link',
      'THIS ROW ONLY: CONDITIONAL REVIEW ACTION',
      'AI Conditional Findings / Suggestions',
    ], 'After fixing the row, set THIS ROW ONLY: CONDITIONAL REVIEW ACTION to Review This Conditional.')
  }

  if (lower.indexOf('fub') !== -1 || lower.indexOf('crm') !== -1) {
    return buildFieldListReply('For FUB / CRM cleanup, check these fields or source areas:', [
      'Owners Dashboard: Client Follow UP Boss ID',
      'FUB profile: source / lead source',
      'FUB profile: stage',
      'FUB profile: tags or review/NPS call evidence',
      'ClickUp: FUB Call / Review Evidence Link',
    ], 'If the issue is a missing FUB link, fill Client Follow UP Boss ID in the Owners row.')
  }

  if (lower.indexOf('split') !== -1) {
    return buildFieldListReply('For split-deal cleanup, every credited row needs these core fields:', [
      'Deal #',
      'Deal Status',
      'Client Signed Date',
      'Date Firm (Executed)',
      'Expected Closing',
      'Client Name',
      'Deal Address',
      'Buy / Sell / Referral',
      'Lead Source (Bonus System For Having This 100% Complete)',
      'Extra Lead Source Data',
      'Ground Zero',
      'Extra Orgin Lead Source Data',
      'Company or Agent',
      'Realtor',
      'Total',
      'Volume Credit',
      'Commission Credit',
      'Deal Credit',
      'Agent Portion of Split or Transaction Fee',
      'Cap YTD Split Running Total',
      'Agent Email',
      'ISA Set Deal',
    ], 'Gross To Team should stay on the anchor row only.')
  }

  if (lower.indexOf('deal') !== -1 || lower.indexOf('owners') !== -1 || lower.indexOf('source') !== -1) {
    return buildFieldListReply('For Owners deal-data cleanup, check the fields named on the card. Common fields are:', [
      'Deal #',
      'Deal Status',
      'Commission/Fees Into Accounting Software?',
      'Co-Broke and Agent Expense Status',
      'Client Signed Date',
      'Date Firm (Executed)',
      'Expected Closing',
      'Expected Cash Deposit',
      'Days Between Executed and Closing',
      'Client Name',
      'Deal Address',
      'Buy / Sell / Referral',
      'Lead Source (Bonus System For Having This 100% Complete)',
      'Extra Lead Source Data',
      'Ground Zero',
      'Extra Orgin Lead Source Data',
      'Company or Agent',
      'Realtor',
      'Total',
      'Gross To Team',
      'Client Follow UP Boss ID',
    ], 'After fixing the source fields, set THIS ROW ONLY: REVIEW ACTION to Review This Deal.')
  }

  return buildFieldListReply('Common AIOS cleanup fields:', [
    'Owners Dashboard: THIS ROW ONLY: REVIEW ACTION',
    'ClickUp: Deal #',
    'ClickUp: NPS Status',
    'ClickUp: Review Status',
    'ClickUp: Internal Onboarding Status',
    'ClickUp: Internal Deal Review Status',
    'ClickUp: FUB Call / Review Evidence Link',
    'Owners Dashboard: Client Follow UP Boss ID',
  ], 'Ask about NPS, Google review, internal review, conditional, FUB, split deal, or deal data for a narrower field list.')
}

function findOpsQueueMatches(queueStats, question) {
  var normalized = String(question || '').toLowerCase()
  var tokens = normalized.match(/t#?\d+|[a-z0-9][a-z0-9'-]{2,}/g) || []
  return flattenOpsQueueItems(queueStats).filter(function(entry) {
    var item = entry.item || {}
    var text = [
      item.title,
      item.id,
      item.subtitle,
      item.owner,
      item.reviewStatus,
      item.reviewAction,
      item.findingsPreview,
      formatQueueItemMeta(item),
    ].filter(Boolean).join(' ').toLowerCase()
    return tokens.some(function(token) {
      return text.indexOf(token.replace(/^t(\d)/, 't#$1')) !== -1 || text.indexOf(token) !== -1
    })
  }).slice(0, 3)
}

function buildOpsHelperReply(question, queueStats) {
  var text = String(question || '').trim()
  var lower = text.toLowerCase()
  var matches = findOpsQueueMatches(queueStats, text)
  var fieldReference = buildOpsFieldReferenceReply(text)
  var asksForLink = lower.indexOf('link') !== -1 || lower.indexOf('open') !== -1
  var asksForOne = asksForLink || lower.indexOf('one') !== -1 || lower.indexOf('single') !== -1
  var asksWhich = lower.indexOf('which') !== -1 || lower.indexOf('what card') !== -1 || lower.indexOf('what cards') !== -1 || lower.indexOf('needs') !== -1 || lower.indexOf('cleanup') !== -1 || lower.indexOf('clean up') !== -1

  if (fieldReference) return fieldReference

  if (lower.indexOf('skip') !== -1 || lower.indexOf('not eligible') !== -1 || lower.indexOf('blocked') !== -1) {
    return [
      'Use different statuses depending on the workflow:',
      '',
      'Internal Onboarding review: set Completed when done. If it truly should not happen, set Skipped and fill Internal Onboarding Skipped Reason.',
      '',
      'Internal Deal review: set Completed when done. If it truly should not happen, set Skipped and fill Internal Deal Review Skipped Reason.',
      '',
      'Client NPS: use Requested, Completed with NPS Score, or Not Eligible. Do not use Skipped for NPS.',
      '',
      'Google Review: use Requested, Captured with captured count/evidence, or Not Eligible. Do not use Skipped for Google review.',
      '',
      'Blocked means something is still preventing the workflow, so AIOS keeps it visible.',
    ].join('\n')
  }

  if (lower.indexOf('nps') !== -1) {
    if (asksWhich || asksForLink) {
      return buildOpsLaneCleanupReply(
        queueStats,
        'clientNps',
        'Client NPS',
        'No Client NPS cleanup cards are open right now.',
        asksForLink,
        asksForOne
      )
    }
    return [
      'Client NPS clears when NPS Status is Requested, Completed, or Not Eligible.',
      '',
      'If Completed, fill NPS Score. Add NPS Comments when there is useful feedback.',
      '',
      'If NPS or Google review outreach started, add the FUB Call / Review Evidence Link so AIOS can see the outreach proof.',
    ].join('\n')
  }

  if (lower.indexOf('review this deal') !== -1 || lower.indexOf('re-review') !== -1 || lower.indexOf('rereview') !== -1) {
    return [
      'Use Review This Deal after the source data has been fixed.',
      '',
      'AIOS checks marked rows first, rewrites AI status/action/findings, and clears or updates the card based on the source data.',
      '',
      'It does not auto-fix Owners, ClickUp, or FUB fields yet.',
    ].join('\n')
  }

  if (lower.indexOf('internal') !== -1 || lower.indexOf('onboarding') !== -1) {
    if (asksWhich || asksForLink) {
      return buildOpsLaneCleanupReply(
        queueStats,
        'internalReview',
        'Internal review',
        'No Internal review cleanup cards are open right now.',
        asksForLink,
        asksForOne
      )
    }
    return [
      'Internal reviews are team-feedback checks, separate from client NPS and Google reviews.',
      '',
      'Internal Onboarding Status clears when Completed, or Skipped with Internal Onboarding Skipped Reason.',
      '',
      'Internal Deal Review Status clears when Completed, or Skipped with Internal Deal Review Skipped Reason.',
    ].join('\n')
  }

  if (lower.indexOf('google') !== -1 || lower.indexOf('review status') !== -1 || lower.indexOf('client review') !== -1) {
    if (asksWhich || asksForLink) {
      return buildOpsLaneCleanupReply(
        queueStats,
        'googleReview',
        'Google review',
        'No Google Review cleanup cards are open right now.',
        asksForLink,
        asksForOne
      )
    }
    return [
      'Google Review clears when Review Status is Requested, Captured, or Not Eligible.',
      '',
      'If Captured, fill Google Review Captured Count or Google Review Link(s) / Evidence.',
      '',
      'Couples can leave more than one review, so target/captured counts matter.',
    ].join('\n')
  }

  if (lower.indexOf('conditional') !== -1) {
    return [
      'Conditional forecast comes from ClickUp Deal Data Entry.',
      '',
      'Buyer/seller conditional tags determine the row. Mutual-release/dead deals are excluded.',
      '',
      'Fix missing forecast fields in ClickUp/source data, then mark column N as Review This Conditional for a re-check.',
    ].join('\n')
  }

  if (matches.length && /t#?\d+|row|deal|card|why|clear|fix|flag|issue|this/i.test(text)) {
    return matches.map(summarizeOpsItem).join('\n\n')
  }

  if ((lower.indexOf('clear') !== -1 || lower.indexOf('fix') !== -1) && lower.indexOf('deal') !== -1) {
    return [
      'To clear an Admin deal card:',
      '',
      '1. Open the source row from the card.',
      '2. Fix the Owners, FUB, or ClickUp fields listed in the findings.',
      '3. If an internal review, NPS, or Google review is not applicable, use the correct status/reason instead of leaving it blank.',
      '4. Mark the Admin row Review This Deal so AIOS re-checks it.',
      '',
      'If the card still appears after re-check, the source data still has an open issue.',
    ].join('\n')
  }

  if (lower.indexOf('count') !== -1 || lower.indexOf('open') !== -1 || lower.indexOf('queue') !== -1) {
    return [
      'Current Ops queue:',
      '- ' + queueStats.sections.admin.openItems + ' Admin deal items',
      '- ' + queueStats.sections.conditional.openItems + ' Conditional forecast items',
      '- ' + queueStats.sections.agentRoster.openItems + ' Agent onboarding items',
      '- ' + queueStats.sections.fubDrift.openItems + ' FUB source-rule items',
      '- ' + queueStats.sections.ownersGovernance.openItems + ' Owners list items',
      '',
      queueStats.openItems + ' open Ops items total.',
    ].join('\n')
  }

  return [
    'I can help with Ops cards, deal re-review, ClickUp statuses, NPS, Google reviews, conditional forecast, and agent onboarding.',
    '',
    'Try asking:',
    '- How do I clear this deal card?',
    '- What does NPS Status need?',
    '- When do I use Skipped?',
    '- Why is T#26096 flagged?',
    '- How do I re-review a fixed deal?',
  ].join('\n')
}

function buildOpsHelperPanel() {
  var panel = document.getElementById('ops-helper-panel')
  if (!panel) return
  panel.innerHTML = ''

  var header = document.createElement('div')
  header.className = 'ops-helper-header'

  var headerInfo = document.createElement('div')
  headerInfo.className = 'ops-helper-header-info'

  var title = document.createElement('h4')
  title.textContent = 'AIOS Help'
  headerInfo.appendChild(title)

  var subtitle = document.createElement('p')
  subtitle.textContent = 'Ops card guide'
  headerInfo.appendChild(subtitle)

  header.appendChild(headerInfo)

  var close = document.createElement('button')
  close.type = 'button'
  close.className = 'ops-helper-close'
  close.setAttribute('aria-label', 'Close Ops help')
  close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  close.addEventListener('click', closeOpsHelper)
  header.appendChild(close)
  panel.appendChild(header)

  var body = document.createElement('div')
  body.className = 'ops-helper-body'

  var messages = document.createElement('div')
  messages.className = 'ops-helper-messages'
  body.appendChild(messages)
  panel.appendChild(body)

  function addMessage(role, text) {
    var bubble = document.createElement('div')
    bubble.className = 'ops-helper-message ops-helper-message-' + role
    String(text || '').split('\n').forEach(function(line, index) {
      if (index) bubble.appendChild(document.createElement('br'))
      var parts = line.split(/(https?:\/\/[^\s]+)/g)
      parts.forEach(function(part) {
        if (/^https?:\/\//.test(part)) {
          var link = document.createElement('a')
          link.href = part
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          link.textContent = part
          bubble.appendChild(link)
        } else {
          bubble.appendChild(document.createTextNode(part))
        }
      })
    })
    messages.appendChild(bubble)
    messages.scrollTop = messages.scrollHeight
  }

  addMessage('bot', 'Ask me how to clear a card, what a status means, or why a deal is flagged. I only explain; I do not change source data.')

  var quick = document.createElement('div')
  quick.className = 'ops-helper-quick'
  ;[
    'How do I clear a deal card?',
    'When do I use Skipped?',
    'Which cards need NPS?',
    'What clears NPS?',
    'What clears Google review?',
  ].forEach(function(label) {
    var button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', function() {
      ask(label)
    })
    quick.appendChild(button)
  })
  body.appendChild(quick)

  var form = document.createElement('form')
  form.className = 'ops-helper-form'
  var input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Ask AIOS about an Ops card or field...'
  input.setAttribute('aria-label', 'Ask AIOS about Ops')
  form.appendChild(input)
  var submit = document.createElement('button')
  submit.type = 'submit'
  submit.textContent = 'Ask'
  form.appendChild(submit)
  panel.appendChild(form)

  function ask(value) {
    var question = String(value || input.value || '').trim()
    if (!question) return
    addMessage('user', question)
    input.value = ''
    window.setTimeout(function() {
      addMessage('bot', buildOpsHelperReply(question, opsHelperQueueStats || getOpsReviewQueueStats({})))
    }, 80)
  }

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    ask()
  })

  opsHelperReady = true
}

function openOpsHelper() {
  var panel = document.getElementById('ops-helper-panel')
  var toggle = document.getElementById('ops-helper-toggle')
  if (!panel) return
  if (!opsHelperReady) buildOpsHelperPanel()
  panel.classList.remove('ops-helper-hidden')
  if (toggle) toggle.style.display = 'none'
  var input = panel.querySelector('input')
  if (input) input.focus()
}

function closeOpsHelper() {
  var panel = document.getElementById('ops-helper-panel')
  var toggle = document.getElementById('ops-helper-toggle')
  if (!panel) return
  panel.classList.add('ops-helper-hidden')
  if (toggle) toggle.style.display = ''
}

function ensureOpsHelper(queueStats) {
  opsHelperQueueStats = queueStats
  if (!opsHelperReady) buildOpsHelperPanel()
  var toggle = document.getElementById('ops-helper-toggle')
  if (toggle && !toggle.dataset.opsHelperBound) {
    toggle.dataset.opsHelperBound = 'true'
    toggle.addEventListener('click', openOpsHelper)
  }
}

function formatQueueItemMeta(item) {
  var parts = []
  if (item.owner) parts.push(item.owner)
  if (item.rosterStatus) parts.push(item.rosterStatus)
  if (item.dueDate) parts.push('due ' + item.dueDate)
  if (Array.isArray(item.rowNumbers) && item.rowNumbers.length > 1) {
    parts.push('rows ' + item.rowNumbers.join(', '))
  } else if (item.rowNumber) {
    parts.push('row ' + item.rowNumber)
  }
  if (item.executedDate) parts.push('executed ' + item.executedDate)
  if (item.firmDate) parts.push('firm ' + item.firmDate)
  if (item.conditionalDeadline) parts.push('condition due ' + item.conditionalDeadline)
  if (item.closingDate) parts.push('closing ' + item.closingDate)
  if (item.depositStatus) parts.push('deposit ' + item.depositStatus)
  if (item.conditionalStatus) parts.push('status ' + item.conditionalStatus)
  return parts.join(' · ') || 'Ops review item'
}

function getQueueItemHref(queueStats, item) {
  var sheetId = queueStats.ownersSheet && queueStats.ownersSheet.sheetId ? queueStats.ownersSheet.sheetId : OWNERS_SHEET_ID
  if (item.clickUpUrl) return item.clickUpUrl
  if (item.queue === 'admin' && item.rowNumber) {
    return 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit#gid=' + OWNERS_ADMIN_GID + '&range=A' + item.rowNumber
  }
  if (item.queue === 'conditional' && item.rowNumber) {
    return 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit#gid=' + OWNERS_CONDITIONAL_GID + '&range=A' + item.rowNumber
  }
  return ''
}

function getOpsIssueLanes(item) {
  var lanes = Array.isArray(item.issueLanes) ? item.issueLanes.filter(Boolean) : []
  if (lanes.length) return lanes

  if (item.queue === 'conditional') return ['conditional']
  if (item.queue === 'agentRoster') return ['agentOnboarding']
  if (item.queue === 'fub-drift') return ['fubRules']
  if (item.queue === 'owners-governance') return ['ownersLists']

  var text = String(item.findingsPreview || '').toLowerCase()
  var inferred = []
  if (text.indexOf('owners (') !== -1 || text.indexOf('gross to team') !== -1 || text.indexOf('split deal') !== -1) inferred.push('dealData')
  if (text.indexOf('fub') !== -1 || text.indexOf('follow up boss') !== -1 || text.indexOf('crm') !== -1) inferred.push('crmFub')
  if (text.indexOf('clickup task') !== -1 || text.indexOf('trade number') !== -1 || text.indexOf('review evidence') !== -1) inferred.push('dealWorkflow')
  if (text.indexOf('internal onboarding') !== -1 || text.indexOf('internal deal') !== -1) inferred.push('internalReview')
  if (text.indexOf('nps') !== -1) inferred.push('clientNps')
  if (text.indexOf('google review') !== -1) inferred.push('googleReview')
  return inferred.length ? inferred : ['dealData']
}

function getFindingLane(text, sectionLabel) {
  var lower = String(text || '').toLowerCase()
  var section = String(sectionLabel || '').toLowerCase()
  var lanes = []

  if (
    section.indexOf('owners') !== -1 ||
    lower.indexOf('gross to team') !== -1 ||
    lower.indexOf('split deal') !== -1 ||
    lower.indexOf('required b:t') !== -1 ||
    lower.indexOf('core ag+') !== -1 ||
    lower.indexOf('company or agent') !== -1 ||
    lower.indexOf('lead source') !== -1 ||
    lower.indexOf('source row') !== -1
  ) lanes.push('dealData')

  if (
    section.indexOf('fub') !== -1 ||
    lower.indexOf('follow up boss') !== -1 ||
    lower.indexOf('linked fub') !== -1 ||
    lower.indexOf('crm') !== -1 ||
    lower.indexOf('past client') !== -1 ||
    lower.indexOf('firm deal') !== -1 ||
    lower.indexOf('fub stage') !== -1 ||
    lower.indexOf('fub source') !== -1
  ) lanes.push('crmFub')

  if (
    lower.indexOf('clickup task') !== -1 ||
    lower.indexOf('deal # / trade number') !== -1 ||
    lower.indexOf('multiple clickup') !== -1 ||
    lower.indexOf('aios admin deal row link') !== -1 ||
    lower.indexOf('review evidence link') !== -1 ||
    lower.indexOf('fub call / review evidence') !== -1 ||
    lower.indexOf('no clickup deal data entry task') !== -1
  ) lanes.push('dealWorkflow')

  if (lower.indexOf('internal onboarding') !== -1 || lower.indexOf('internal deal') !== -1) lanes.push('internalReview')
  if (lower.indexOf('nps') !== -1) lanes.push('clientNps')
  if (lower.indexOf('google review') !== -1) lanes.push('googleReview')

  return Array.from(new Set(lanes))
}

function parseFindingHeader(part) {
  var parenMatch = part.match(/^(.+?)\s+\((\d+)\/(\d+)\s+passed\)$/i)
  if (parenMatch) {
    return {
      label: parenMatch[1],
      passed: Number(parenMatch[2]),
      total: Number(parenMatch[3]),
    }
  }

  var dashMatch = part.match(/^(.+?)\s+[—-]\s+(\d+)\/(\d+)\s+passed(?:\s+·\s+\d+\s+failed)?$/i)
  if (dashMatch) {
    return {
      label: dashMatch[1],
      passed: Number(dashMatch[2]),
      total: Number(dashMatch[3]),
    }
  }

  return null
}

function parseOpsFindings(text) {
  var parts = String(text || '').split(/\s+\|\s+/).map(function(part) {
    return part.trim()
  }).filter(Boolean)
  var blocks = []
  var current = null

  function startBlock(label, score) {
    current = {
      label: label || 'Finding',
      passed: score && Number.isFinite(score.passed) ? score.passed : null,
      total: score && Number.isFinite(score.total) ? score.total : null,
      bullets: [],
      lanes: [],
    }
    blocks.push(current)
    return current
  }

  parts.forEach(function(part) {
    var isBullet = /^[-•]\s+/.test(part)
    if (isBullet) {
      if (!current) startBlock('Finding')
      current.bullets.push(part.replace(/^[-•]\s+/, ''))
      return
    }

    var score = parseFindingHeader(part)
    if (score) {
      startBlock(score.label, score)
      return
    }

    if (parts.length === 1) {
      startBlock('Finding').bullets.push(part)
      return
    }

    startBlock(part)
  })

  return blocks.map(function(block) {
    var lanes = []
    block.bullets.forEach(function(bullet) {
      lanes = lanes.concat(getFindingLane(bullet, block.label))
    })
    block.lanes = Array.from(new Set(lanes))
    return block
  })
}

function renderOpsFindings(text) {
  var wrap = document.createElement('div')
  wrap.className = 'ops-issue-findings'

  if (!text) {
    var empty = document.createElement('p')
    empty.textContent = 'No findings text is recorded yet.'
    wrap.appendChild(empty)
    return wrap
  }

  var blocks = parseOpsFindings(text)
  var scoredBlocks = blocks.filter(function(block) {
    return block.passed !== null && block.total !== null
  })

  if (scoredBlocks.length) {
    var summary = document.createElement('div')
    summary.className = 'ops-finding-summary'
    scoredBlocks.forEach(function(block) {
      var chip = document.createElement('span')
      chip.className = 'ops-finding-chip ' + (block.passed === block.total ? 'ops-finding-chip-pass' : 'ops-finding-chip-risk')
      if (Array.isArray(block.lanes) && block.lanes.length) chip.dataset.opsLanes = block.lanes.join(' ')
      chip.textContent = block.label + ' ' + block.passed + '/' + block.total
      summary.appendChild(chip)
    })
    wrap.appendChild(summary)
  }

  blocks.forEach(function(block) {
    if (!block.bullets.length) return

    var section = document.createElement('div')
    section.className = 'ops-finding-block'
    if (Array.isArray(block.lanes) && block.lanes.length) section.dataset.opsLanes = block.lanes.join(' ')

    var heading = document.createElement('div')
    heading.className = 'ops-finding-heading'
    heading.textContent = block.label
    section.appendChild(heading)

    var list = document.createElement('ul')
    block.bullets.forEach(function(bullet) {
      var li = document.createElement('li')
      var lanes = getFindingLane(bullet, block.label)
      if (lanes.length) li.dataset.opsLanes = lanes.join(' ')
      li.textContent = bullet
      list.appendChild(li)
    })
    section.appendChild(list)
    wrap.appendChild(section)
  })

  if (!wrap.children.length) {
    var fallback = document.createElement('p')
    fallback.textContent = text
    wrap.appendChild(fallback)
  }

  return wrap
}

function renderOpsIssueCard(queueStats, item) {
  var card = document.createElement('article')
  card.className = 'ops-issue-card'
  card.dataset.opsLanes = getOpsIssueLanes(item).join(' ')

  var head = document.createElement('div')
  head.className = 'ops-issue-head'

  var titleWrap = document.createElement('div')
  titleWrap.className = 'ops-issue-title-wrap'

  var title = document.createElement('h4')
  title.textContent = item.title || item.id || 'Review item'
  titleWrap.appendChild(title)

  var subtitle = document.createElement('p')
  subtitle.textContent = [item.subtitle, formatQueueItemMeta(item)].filter(Boolean).join(' · ')
  titleWrap.appendChild(subtitle)

  head.appendChild(titleWrap)

  var pill = document.createElement('span')
  pill.className = 'ops-issue-pill ' + (item.needsFixing ? 'ops-issue-pill-risk' : 'ops-issue-pill-pending')
  pill.textContent = item.reviewAction || item.reviewStatus || 'Review'
  head.appendChild(pill)

  card.appendChild(head)

  var status = document.createElement('div')
  status.className = 'ops-issue-status-line'
  status.textContent = [item.reviewStatus, item.reviewAction].filter(Boolean).join(' · ')
  card.appendChild(status)

  card.appendChild(renderOpsFindings(item.findingsPreview))

  var href = getQueueItemHref(queueStats, item)
  if (href || item.feedbackUrl) {
    var actions = document.createElement('div')
    actions.className = 'foundation-module-actions ops-issue-actions'
    if (href) actions.appendChild(createActionLink('Open source row', href, 'secondary-button'))
    if (item.feedbackUrl) actions.appendChild(createActionLink('Open feedback form', item.feedbackUrl, 'secondary-button'))
    card.appendChild(actions)
  }

  return card
}

function renderOpsIssueSection(queueStats, key, config, maxItems) {
  var section = queueStats.sections[key]
  var items = section && Array.isArray(section.items) ? section.items : []
  var wrap = document.createElement('div')
  wrap.className = 'ops-issue-section'
  wrap.dataset.opsSection = key

  var header = document.createElement('div')
  header.className = 'ops-issue-section-header'

  var title = document.createElement('h4')
  title.textContent = config.title
  header.appendChild(title)

  var meta = document.createElement('p')
  meta.textContent = items.length + ' open · ' + (section ? section.needsFixing : 0) + ' need fixing'
  header.appendChild(meta)
  wrap.appendChild(header)

  if (!items.length) {
    var empty = document.createElement('p')
    empty.className = 'section-intro'
    empty.textContent = config.emptyText
    wrap.appendChild(empty)
    return wrap
  }

  var grid = document.createElement('div')
  grid.className = 'ops-issue-grid'
  items.slice(0, maxItems || items.length).forEach(function(item) {
    grid.appendChild(renderOpsIssueCard(queueStats, item))
  })
  wrap.appendChild(grid)

  if (maxItems && items.length > maxItems) {
    var more = document.createElement('p')
    more.className = 'section-intro'
    more.textContent = (items.length - maxItems) + ' more item' + (items.length - maxItems === 1 ? '' : 's') + ' visible in the Inbox tab.'
    wrap.appendChild(more)
  }

  return wrap
}

function renderOpsInboxFilters() {
  var filters = [
    { key: 'all', label: 'All' },
    { key: 'dealData', label: 'Deal data' },
    { key: 'conditional', label: 'Conditional' },
    { key: 'dealWorkflow', label: 'Deal workflow' },
    { key: 'internalReview', label: 'Internal review' },
    { key: 'clientNps', label: 'Client NPS' },
    { key: 'googleReview', label: 'Google review' },
    { key: 'agentOnboarding', label: 'Agent onboarding' },
    { key: 'crmFub', label: 'CRM / FUB' },
    { key: 'fubRules', label: 'FUB source rules' },
    { key: 'ownersLists', label: 'Owners lists' },
  ]
  var wrap = document.createElement('div')
  wrap.className = 'ops-filter-bar'
  filters.forEach(function(filter, index) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'ops-filter-button' + (index === 0 ? ' ops-filter-button-active' : '')
    button.dataset.opsFilter = filter.key
    button.textContent = filter.label
    button.addEventListener('click', function() {
      var selected = button.dataset.opsFilter
      wrap.querySelectorAll('.ops-filter-button').forEach(function(item) {
        item.classList.toggle('ops-filter-button-active', item === button)
      })
      var panel = wrap.closest('.panel')
      if (!panel) return
      panel.querySelectorAll('.ops-issue-section').forEach(function(section) {
        var visibleCards = 0
        section.querySelectorAll('.ops-issue-card').forEach(function(card) {
          var visible = cardMatchesFilter(card, selected)
          card.hidden = !visible
          if (visible) {
            visibleCards += 1
            filterCardFindings(card, selected)
          }
        })
        section.hidden = selected !== 'all' && visibleCards === 0
      })
    })
    wrap.appendChild(button)
  })
  window.setTimeout(function() {
    var active = wrap.querySelector('.ops-filter-button-active')
    if (!active) return
    var panel = wrap.closest('.panel')
    if (!panel) return
    panel.querySelectorAll('.ops-issue-card').forEach(function(card) {
      filterCardFindings(card, active.dataset.opsFilter || 'all')
    })
  }, 0)
  return wrap
}

function getNodeLanes(node) {
  return String(node && node.dataset ? node.dataset.opsLanes || '' : '').split(/\s+/).filter(Boolean)
}

function nodeMatchesFilter(node, selected) {
  if (selected === 'all') return true
  var lanes = getNodeLanes(node)
  return lanes.indexOf(selected) !== -1
}

function cardMatchesFilter(card, selected) {
  if (selected === 'all') return true
  if (nodeMatchesFilter(card, selected)) return true
  return Array.from(card.querySelectorAll('[data-ops-lanes]')).some(function(node) {
    return nodeMatchesFilter(node, selected)
  })
}

function filterCardFindings(card, selected) {
  card.querySelectorAll('.ops-finding-chip').forEach(function(chip) {
    chip.hidden = !nodeMatchesFilter(chip, selected)
  })

  card.querySelectorAll('.ops-finding-summary').forEach(function(summary) {
    var visibleChips = Array.from(summary.querySelectorAll('.ops-finding-chip')).some(function(chip) {
      return !chip.hidden
    })
    summary.hidden = selected !== 'all' && !visibleChips
  })

  card.querySelectorAll('.ops-finding-block').forEach(function(block) {
    var visibleItems = 0
    block.querySelectorAll('li').forEach(function(item) {
      var visible = nodeMatchesFilter(item, selected)
      item.hidden = !visible
      if (visible) visibleItems += 1
    })
    block.hidden = selected !== 'all' && visibleItems === 0
  })
}

function renderOpsInboxPanel(queueStats, options) {
  var showItems = options && options.showItems
  var panel = renderPanel(
    'Ops Inbox',
    'Work Queue',
    'Start here. These are the deals, conditional records, FUB items, and agent follow-ups that need Ops attention.'
  )

  var grid = document.createElement('div')
  grid.className = 'status-grid'
  grid.appendChild(renderStatusCard({
    label: 'Admin deal review',
    status: queueStats.sections.admin.openItems ? 'pending' : 'live',
    detail: queueStats.sections.admin.openItems + ' Admin deals need cleanup before they can pass review.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Conditional forecast',
    status: queueStats.sections.conditional.openItems ? 'pending' : 'live',
    detail: queueStats.sections.conditional.openItems + ' conditional/listing records are missing forecast details.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'FUB drift',
    status: queueStats.sections.fubDrift.openItems ? 'risk' : 'live',
    detail: queueStats.sections.fubDrift.openItems + ' Follow Up Boss source/rule issues are open.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Owners list drift',
    status: queueStats.sections.ownersGovernance.openItems ? 'risk' : 'live',
    detail: queueStats.sections.ownersGovernance.openItems + ' Owners dropdown/list issues are open.',
  }))
  grid.appendChild(renderStatusCard({
    label: 'Agent onboarding',
    status: queueStats.sections.agentRoster.openItems ? 'pending' : 'live',
    detail: queueStats.sections.agentRoster.openItems + ' agent roster or onboarding follow-ups are open.',
  }))
  panel.appendChild(grid)

  if (showItems) {
    panel.appendChild(renderOpsInboxFilters())
    panel.appendChild(renderOpsIssueSection(queueStats, 'admin', {
      title: 'Admin deal reviews',
      emptyText: 'No Admin deal review findings are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'conditional', {
      title: 'Conditional / listing rows',
      emptyText: 'No conditional forecast data gaps are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'fubDrift', {
      title: 'FUB taxonomy and parity drift',
      emptyText: 'No FUB drift items are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'ownersGovernance', {
      title: 'Owners dropdown drift',
      emptyText: 'No Owners dropdown drift items are open.',
    }))
    panel.appendChild(renderOpsIssueSection(queueStats, 'agentRoster', {
      title: 'Agent onboarding / roster accountability',
      emptyText: 'No agent onboarding or roster accountability items are open.',
    }))
  } else {
    var actions = document.createElement('div')
    actions.className = 'foundation-module-actions'
    actions.appendChild(createActionLink('Open Ops Inbox', '/ops#inbox', 'secondary-button'))
    actions.appendChild(createActionLink('Open Running Systems', '/ops#systems', 'secondary-button'))
    panel.appendChild(actions)
  }

  return panel
}

function renderOpsSystemsPanel(jobs, queueStats, options) {
  var compact = options && options.compact
  var panel = renderPanel(
    'Running Systems',
    compact ? 'Background Checks' : 'Systems Serving Ops',
    compact
      ? 'These checks run in the background and keep the Ops inbox current.'
      : 'Open a system to see what it reads, what it checks, what it outputs, and where its work lands.'
  )

  if (!jobs.length) {
    var empty = document.createElement('p')
    empty.textContent = 'No Foundation jobs are tagged as serving Ops yet.'
    panel.appendChild(empty)
    return panel
  }

  if (compact) {
    var grid = document.createElement('div')
    grid.className = 'status-grid'
    jobs.forEach(function(job) {
      grid.appendChild(renderOpsSystemSummaryCard(job))
    })
    panel.appendChild(grid)
    var actions = document.createElement('div')
    actions.className = 'foundation-module-actions'
    actions.appendChild(createActionLink('Open Running Systems', '/ops#systems', 'secondary-button'))
    panel.appendChild(actions)
  } else {
    jobs.forEach(function(job) {
      panel.appendChild(renderOpsSystemPill(job, queueStats))
    })
  }

  return panel
}

function renderHero(jobs, queueStats) {
  var hero = document.createElement('section')
  hero.className = 'hero'
  var heroInner = document.createElement('div')
  heroInner.className = 'hero-inner'

  var title = document.createElement('h1')
  title.textContent = 'Ops Hub'
  heroInner.appendChild(title)

  var meta = document.createElement('p')
  meta.className = 'hero-copy'
  meta.textContent = jobs.length + ' checks running · ' + queueStats.openItems + ' open Ops items'
  heroInner.appendChild(meta)

  var note = document.createElement('p')
  note.className = 'hero-copy'
  note.textContent = 'This is where Ops sees what needs cleanup. Foundation runs the checks in the background and keeps the audit trail.'
  heroInner.appendChild(note)

  hero.appendChild(heroInner)
  return hero
}

function updateNav(section) {
  var labels = {
    overview: 'Overview',
    inbox: 'Inbox',
    systems: 'Running Systems',
  }

  var navItems = document.querySelectorAll('.found-nav-item')
  navItems.forEach(function(item) {
    item.classList.toggle('found-nav-active', item.getAttribute('data-section') === section)
  })

  var breadcrumb = document.getElementById('found-breadcrumb-page')
  if (breadcrumb) breadcrumb.textContent = labels[section] || 'Overview'
}

function renderSection(section, hub, queuePayload) {
  var container = document.getElementById('ops-content')
  var queueStats = getOpsReviewQueueStats(queuePayload)
  var jobs = getHubServedJobs(hub, 'ops')
  container.innerHTML = ''
  ensureOpsHelper(queueStats)

  if (section === 'overview') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsInboxPanel(queueStats, { showItems: false }))
    container.appendChild(renderOpsSystemsPanel(jobs, queueStats, { compact: true }))
    return
  }

  if (section === 'inbox') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsInboxPanel(queueStats, { showItems: true }))
    return
  }

  if (section === 'systems') {
    container.appendChild(renderHero(jobs, queueStats))
    container.appendChild(renderOpsSystemsPanel(jobs, queueStats, { compact: false }))
    return
  }

  renderSection('overview', hub, queuePayload)
}

function route() {
  var section = getSection()
  if (section !== 'overview' && section !== 'inbox' && section !== 'systems') section = 'overview'
  updateNav(section)

  var nav = document.getElementById('found-nav')
  if (nav) nav.classList.remove('found-nav-open')

  var main = document.querySelector('.found-main')
  if (main) main.scrollTop = 0

  Promise.all([fetchFoundationHub(), fetchOwnersReviewQueue()]).then(function(results) {
    renderSection(section, results[0], results[1])
  }).catch(function(error) {
    var container = document.getElementById('ops-content')
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'Failed to load Ops Hub: ' + error.message
    container.appendChild(msg)
  })
}

document.addEventListener('DOMContentLoaded', function() {
  route()

  var toggle = document.getElementById('found-mobile-toggle')
  var nav = document.getElementById('found-nav')
  if (toggle && nav) {
    toggle.addEventListener('click', function() {
      nav.classList.toggle('found-nav-open')
    })
  }
})

window.addEventListener('hashchange', route)
