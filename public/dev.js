const API_ROUTE = '/api/foundation/dev-team-hub'
const LINK_PACKET_PREVIEW_ROUTE = '/api/foundation/dev-team-hub/link-source-packet-preview'
const LINK_PACKET_DECISION_ROUTE = '/api/foundation/dev-team-hub/link-source-packet-decision'
const EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE = '/api/foundation/dev-team-hub/source-packet-hands-queue'
const YOUTUBE_CREATOR_TARGET_FALLBACK_LIMIT = 10

const plannedSources = [
  {
    id: 'skool-paid',
    name: 'Skool / Paid Courses',
    label: 'Paid / auth',
    badge: 'Pending',
    status: 'Pending registry',
    summary: 'Paid communities and courses are blocked until source packets and auth boundaries are approved.',
    tags: ['auth', 'paid', 'approval'],
    sourceRoute: 'Pending source packet + auth guard',
    targets: [
      ['Mark Kashef', 'Paid Skool', 'Needs exact source packet and guarded auth rules before crawling.', 'Approval required'],
      ['ICOR / Tom', 'Paid training', 'Known high-value source, but not active in the Dev slice yet.', 'Approval required'],
    ],
  },
  {
    id: 'github-repos',
    name: 'GitHub / Repos',
    label: 'Code repos',
    badge: 'Needs source',
    status: 'Needs source',
    summary: 'Code repos are planned source systems for implementation patterns and reusable tools.',
    tags: ['repo', 'planned'],
    sourceRoute: 'Pending repo target registry',
    targets: [
      ['ClaudeClaw OS', 'Private repo', 'Needs durable source packet and boundaries before mining.', 'Pending approval'],
      ['OpenClaw / adapters', 'Runtime patterns', 'Needs normalized repo target registry.', 'Needs source'],
    ],
  },
  {
    id: 'internal-signals',
    name: 'Gmail / Missive / Slack',
    label: 'Internal signals',
    badge: 'Foundation',
    status: 'Foundation live; Dev route pending',
    summary: 'Foundation syncs comms. Dev-specific routing is still pending.',
    tags: ['internal', 'shared pool'],
    sourceRoute: 'Foundation comms spine · Dev route pending',
    targets: [
      ['Gmail', 'Email source', 'Current sync and candidate extraction run as Foundation jobs.', 'Foundation live'],
      ['Missive', 'Comms source', 'Current sync and candidate extraction run as Foundation jobs.', 'Foundation live'],
      ['Slack', 'Thread source', 'Current sync and candidate extraction runs through the shared comms spine.', 'Foundation live'],
    ],
  },
  {
    id: 'meetings-transcripts-source',
    name: 'Meetings / Transcripts',
    label: 'Meeting notes',
    badge: 'Foundation',
    status: 'Foundation live; Dev route pending',
    summary: 'Foundation syncs notes and transcripts. Dev-specific routing is still pending.',
    tags: ['meetings', 'transcripts', 'shared pool'],
    sourceRoute: 'Foundation meeting sync · Dev route pending',
    targets: [
      ['Meeting notes', 'Meeting source', 'Current meeting notes sync runs as a Foundation job.', 'Foundation live'],
      ['Meeting transcripts', 'Transcript source', 'Transcript candidate extraction runs through the shared comms spine.', 'Foundation live'],
    ],
  },
]

const state = {
  snapshot: null,
  sources: [],
  selectedSourceId: null,
}

const els = {
  grid: document.getElementById('source-grid'),
  panel: document.getElementById('target-panel'),
  extractorGrid: document.getElementById('extractor-grid'),
  godModeParity: document.getElementById('god-mode-parity'),
  evidenceGrid: document.getElementById('evidence-grid'),
  approvalReview: document.getElementById('approval-review'),
  sourceLeaderboard: document.getElementById('source-leaderboard'),
  directorPanel: document.getElementById('director-panel'),
  directorHeadStats: document.getElementById('director-head-stats'),
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value, fallback = '') {
  const output = String(value ?? '').trim()
  return output || fallback
}

function escapeHtml(value = '') {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function compactNumber(value = 0) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  if (number >= 1000) return `${Math.round(number / 100) / 10}K`
  return String(number)
}

function money(value = 0) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '$0.00'
  if (number >= 1000) return `$${Math.round(number).toLocaleString('en-US')}`
  return `$${number.toFixed(2)}`
}

function shortDate(value = '') {
  if (!value) return 'Needs source'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Needs source'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function pillClass(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('active') || normalized.includes('ready') || normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('verified')) return 'active'
  if (normalized.includes('pending') || normalized.includes('approval') || normalized.includes('needs') || normalized.includes('not exposed')) return 'pending'
  return ''
}

function dotClass(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('live') || normalized.includes('active') || normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('healthy')) return 'live'
  if (normalized.includes('pending') || normalized.includes('approval') || normalized.includes('needs') || normalized.includes('risk') || normalized.includes('failed') || normalized.includes('stale') || normalized.includes('blocked')) return 'pending'
  if (normalized.includes('verified') || normalized.includes('proof') || normalized.includes('source-backed') || normalized.includes('locked')) return 'verified'
  return ''
}

function statusBadge(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('needs source')) return 'Needs source'
  if (normalized.includes('pending') || normalized.includes('approval')) return 'Pending'
  if (normalized.includes('locked') || normalized.includes('verified') || normalized.includes('source-backed') || normalized.includes('proof') || normalized.includes('signed')) return 'Verified'
  if (normalized.includes('healthy') || normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('live') || normalized.includes('active')) return 'Live'
  if (normalized.includes('foundation')) return 'Foundation'
  return text(value, 'Needs source')
}

function statusLabel(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('needs source')) return 'Needs source'
  if (normalized.includes('needs steve') || normalized.includes('approval required')) return 'Needs approval'
  if (normalized.includes('pending approval')) return 'Pending'
  if (normalized.includes('pending')) return 'Pending'
  if (normalized.includes('foundation pool') || normalized.includes('foundation live') || normalized.includes('foundation')) return 'Foundation'
  if (normalized.includes('source-backed')) return 'Verified'
  if (normalized.includes('verified') || normalized.includes('proof')) return 'Verified'
  if (normalized.includes('succeeded') || normalized.includes('generated') || normalized.includes('healthy') || normalized.includes('live') || normalized.includes('active')) return 'Live'
  if (normalized.includes('clear')) return 'Clear'
  return text(value, 'Needs source')
}

function sourceContract(snapshot = {}, sourceId = '') {
  return list(snapshot.sourceContracts).find(source => source.sourceId === sourceId) || null
}

function uniqueBy(items = [], keyFn = item => item) {
  const seen = new Set()
  const output = []
  for (const item of list(items)) {
    const key = text(keyFn(item))
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

function creatorNameFromId(value = '') {
  return text(value)
    .split('-')
    .filter(Boolean)
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ')
}

function sourceGrades(snapshot = {}) {
  return list(snapshot.sourceValueGrader?.sourceGrades)
}

function sourceCoverageRows(snapshot = {}) {
  return list(snapshot.sourceCoverage?.rows)
}

function topDevSources(snapshot = {}) {
  return list(snapshot.sourceValueGrader?.topDevBuildSources).length
    ? list(snapshot.sourceValueGrader?.topDevBuildSources)
    : sourceGrades(snapshot)
}

function catchupRows(snapshot = {}) {
  return list(snapshot.youtubeCreatorGodModeCatchup?.creators)
}

function dailyCreators(snapshot = {}) {
  return list(snapshot.dailyWatch?.creators)
}

function creatorDisplayName(snapshot = {}, creatorId = '') {
  const creator = dailyCreators(snapshot).find(item => item.creatorId === creatorId)
  const grade = sourceGrades(snapshot).find(item => item.creatorId === creatorId)
  return text(creator?.displayName || grade?.creator || creatorNameFromId(creatorId), 'Unknown creator')
}

function laneScore(source = {}, laneId = 'aios_dev_build') {
  return list(source.laneScores).find(lane => lane.laneId === laneId) || null
}

function gradeTone(grade = '') {
  const normalized = text(grade).toUpperCase()
  if (normalized === 'S' || normalized === 'A') return 'live'
  if (normalized === 'B') return 'verified'
  if (normalized === 'C' || normalized === 'D') return 'pending'
  return ''
}

function familyTone(status = '') {
  const normalized = text(status).toLowerCase()
  if (normalized === 'active') return 'live'
  if (normalized === 'partial') return 'verified'
  if (normalized === 'blocked') return 'pending'
  return ''
}

function familyStatusCopy(status = '') {
  const normalized = text(status).toLowerCase()
  if (normalized === 'active') return 'Feeding Dev now'
  if (normalized === 'partial') return 'Partly connected'
  if (normalized === 'blocked') return 'Needs approval'
  if (normalized === 'planned') return 'Planned'
  return text(status, 'Needs source')
}

function researchRowsForCreator(snapshot = {}, creatorId = '') {
  return list(snapshot.dailyWatch?.researchPool).filter(item => item.creatorId === creatorId)
}

function latestResearchRow(rows = []) {
  return [...list(rows)]
    .sort((left, right) => text(right.lastSeenAt || right.firstSeenAt).localeCompare(text(left.lastSeenAt || left.firstSeenAt)))
    [0] || null
}

function creatorTargetFromGrade(snapshot = {}, source = {}) {
  const rows = researchRowsForCreator(snapshot, source.creatorId)
  const latest = latestResearchRow(rows)
  const devLane = laneScore(source)
  const grade = text(source.devBuildGrade || devLane?.grade || source.overallGrade, 'Needs grade')
  const score = devLane?.score == null ? '' : ` · ${compactNumber(devLane.score)} score`
  const bestRank = source.bestDirectorRank ? ` · best Director rank ${source.bestDirectorRank}` : ''
  const watched = compactNumber(source.watchedVideos || rows.length || 0)
  const ideas = compactNumber(source.buildCandidates || 0)
  const latestCopy = latest?.title ? ` Latest: ${latest.title}` : ''
  return [
    text(source.creator || creatorDisplayName(snapshot, source.creatorId), 'Unknown creator'),
    `${grade} Dev build${score}`,
    `${watched} watched/represented videos · ${ideas} ideas${bestRank}.${latestCopy}`,
    'Live',
  ]
}

function creatorTargetFromDaily(snapshot = {}, creator = {}) {
  const rows = researchRowsForCreator(snapshot, creator.creatorId)
  const latest = latestResearchRow(rows)
  const latestRun = latest?.lastSeenAt || snapshot.dailyWatch?.latestJobRun?.completedAt || snapshot.dailyWatch?.latestJobRun?.startedAt
  return [
    text(creator.displayName || creatorNameFromId(creator.creatorId), 'Unknown creator'),
    'Daily watch source',
    `${compactNumber(rows.length)} videos in pool · last seen ${shortDate(latestRun)}`,
    rows.length ? 'Live' : 'Needs source',
  ]
}

function creatorTargetFromCatchup(row = {}) {
  const grade = text(row.devBuildGrade, 'ungraded')
  const watched = compactNumber(row.videoAudioVisualWatchedCount || 0)
  const baseline = compactNumber(row.baselineTargetVideos || 10)
  const tracked = compactNumber(row.trackedMetadataCount || 0)
  const longCourse = Number(row.longCoursePendingCount || 0)
  const gap = Number(row.baselineGap || 0)
  const status = gap > 0 ? 'Needs watch' : 'Baseline met'
  const longCourseCopy = longCourse ? ` · ${compactNumber(longCourse)} long-course pending` : ''
  const sopCopy = row.youtubeSopStatus === 'source_sop_complete'
    ? 'SOP complete'
    : 'SOP incomplete'
  const resourceCopy = statusCopy(row.freeResourceCaptureStatus || row.approvedResourceFollowStatus || '')
  const gateCopy = statusCopy(row.paidGateEvaluationStatus || '')
  return [
    text(row.creator || creatorNameFromId(row.creatorId), 'Unknown creator'),
    `${grade} Dev build · ${status} · ${sopCopy}`,
    `${watched}/${baseline} watched · ${tracked} tracked${longCourseCopy}. Resources: ${resourceCopy}; gates: ${gateCopy}. ${statusCopy(row.nextWatchAction || '')}`,
    row.representationStatus === 'represented' ? 'Live' : 'Needs source',
  ]
}

function buildYoutubeCreatorTargets(snapshot = {}) {
  const catchup = catchupRows(snapshot)
    .filter(row => row.creatorId || row.creator)
    .sort((left, right) =>
      Number(right.baselineGap || 0) - Number(left.baselineGap || 0) ||
      Number(right.deepBaselineGap || 0) - Number(left.deepBaselineGap || 0) ||
      text(left.creator).localeCompare(text(right.creator))
    )
    .map(creatorTargetFromCatchup)
  if (catchup.length) return catchup

  const graded = topDevSources(snapshot)
    .filter(source => source.creatorId || source.creator)
    .slice(0, YOUTUBE_CREATOR_TARGET_FALLBACK_LIMIT)
    .map(source => creatorTargetFromGrade(snapshot, source))
  if (graded.length) return graded

  return dailyCreators(snapshot)
    .slice(0, YOUTUBE_CREATOR_TARGET_FALLBACK_LIMIT)
    .map(creator => creatorTargetFromDaily(snapshot, creator))
}

function buildLiveSources(snapshot = {}) {
  const daily = snapshot.dailyWatch || {}
  const catchup = snapshot.youtubeCreatorGodModeCatchup || {}
  const youtubeContract = sourceContract(snapshot, 'SRC-YOUTUBE-INTEL-001')
  const youtubeTargets = buildYoutubeCreatorTargets(snapshot)
  const gradedCount = sourceGrades(snapshot).length
  const creatorCount = Number(daily.summary?.creatorCount || dailyCreators(snapshot).length || 0)
  const baselineComplete = Number(catchup.summary?.baselineCompleteCount || 0)
  const baselineIncomplete = Number(catchup.summary?.baselineIncompleteCount || 0)
  const catchupStatus = catchup.buildPromotionReadiness?.status
    ? statusCopy(catchup.buildPromotionReadiness.status)
    : `${compactNumber(gradedCount)} sources graded`

  const live = [
    {
      id: 'youtube',
      name: 'YouTube Creators',
      label: 'Public creators',
      badge: statusBadge(daily.status),
      status: text(youtubeContract?.status, 'Needs source'),
      summary: `${compactNumber(creatorCount)} public creator channels feed Foundation. ${compactNumber(baselineComplete)} baseline met; ${compactNumber(baselineIncomplete)} still need watch.`,
      tags: ['public', 'daily', gradedCount ? 'graded' : 'needs grade', baselineIncomplete ? 'baseline gap' : 'baseline met'],
      targets: youtubeTargets,
      targetNoun: 'public creator',
      statusLine: `Running · ${catchupStatus}`,
      sourceRoute: daily.sourceRoute || '/api/foundation/build-intel/youtube-creator-daily-watch',
    },
  ]

  return [...live, ...plannedSources]
}

function buildEvidenceCards(snapshot = {}) {
  const counts = snapshot.counts || {}
  const gradedSources = sourceGrades(snapshot)
  const gradedVideos = gradedSources.reduce((sum, source) => sum + Number(source.watchedVideos || 0), 0)
  const gradedCandidates = gradedSources.reduce((sum, source) => sum + Number(source.buildCandidates || 0), 0)
  return [
    {
      value: counts.researchPool,
      label: 'Video pool',
      tone: 'live',
      summary: 'Videos the system knows about. Some are only saved as video info; approved ones get deeper review.',
      meta: 'Daily YouTube watch',
    },
    {
      value: gradedVideos || counts.apiFullWatchVideos || counts.eyesBuildCandidates,
      label: 'Full watches',
      tone: 'verified',
      summary: `${compactNumber(gradedVideos || counts.apiFullWatchVideos || 0)} creator videos represented in full video, audio, and screen review.`,
      meta: snapshot.markApiFullWatch?.model || 'Gemini video route',
    },
    {
      value: gradedCandidates || counts.apiFullWatchBuildCandidates || counts.eyesBuildCandidates,
      label: 'Build candidates',
      tone: 'verified',
      summary: `${compactNumber(gradedCandidates || counts.apiFullWatchBuildCandidates || counts.eyesBuildCandidates || 0)} proposal-only build ideas from approved review.`,
      meta: 'Needs Steve before backlog',
    },
    {
      value: list(snapshot.approvalReviewQueue).length || counts.apiFullWatchApprovalLinks || counts.approvalRequiredLinks,
      label: 'Links to review',
      tone: (list(snapshot.approvalReviewQueue).length || counts.apiFullWatchApprovalLinks || counts.approvalRequiredLinks) ? 'pending' : 'live',
      summary: `${compactNumber(list(snapshot.approvalReviewQueue).length || counts.apiFullWatchApprovalLinks || counts.approvalRequiredLinks || 0)} useful links are held until Steve approves or rejects the source follow-up.`,
      meta: 'Visible below',
    },
    {
      value: counts.apiFullWatchTimestampedVisualEvidence || counts.eyesTimestampedVisualEvidence,
      label: 'Visual evidence',
      tone: 'live',
      summary: 'Timestamped notes from approved video, audio, and screen review.',
      meta: 'Video/audio/visual review',
    },
  ]
}

function approvalReviewTitle(item = {}) {
  const host = text(item.host, 'external link')
  const video = text(item.sourceVideoId)
  return video ? `${host} · ${video}` : host
}

function handsQueueStatusCopy(row = {}) {
  if (row.status === 'ready_to_run') return 'Ready for Hands'
  if (row.status === 'already_run') return 'Hands evidence saved'
  if (row.status === 'exact_public_read_ready') return 'Needs approved selector'
  if (row.status === 'auth_session_required') return 'Needs source-specific auth'
  if (row.status === 'paid_or_private_blocked') return 'Paid/private blocked'
  if (row.status === 'purchase_or_form_blocked') return 'Form/purchase blocked'
  if (row.status === 'not_ready_for_hands') return 'Not approved'
  return text(row.status, 'Blocked')
}

function renderHandsQueue(snapshot = {}) {
  const queue = snapshot.sourcePacketHandsQueue || {}
  const rows = list(queue.rows).slice(0, 5)
  const counts = queue.counts || {}
  if (!rows.length) {
    return `
      <article class="approval-empty">
        <span>Hands runner status</span>
        <p>No approved source-packet rows are waiting for bounded browser Hands. Queue route: ${escapeHtml(EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE)}.</p>
      </article>
    `
  }
  return `
    <div class="approval-head">
      <div>
        <span>Hands runner status</span>
        <p>Approved packets only run through bounded Hands after an approved selector/action, next URL pattern, stop condition, and evidence target are present.</p>
      </div>
      <strong>${escapeHtml(compactNumber(counts.ready || 0))}/${escapeHtml(compactNumber(counts.total || rows.length))}</strong>
    </div>
    <div class="approval-list">
      ${rows.map(row => `
        <article class="approval-row">
          <div>
            <span>${escapeHtml(handsQueueStatusCopy(row))}</span>
            <h3>${escapeHtml(row.host || row.exactUrl || 'Source packet')}</h3>
            <p>${escapeHtml(row.handsStatus?.plainEnglish || 'Bounded browser Hands queue row.')}</p>
            <a href="${escapeHtml(row.exactUrl)}" target="_blank" rel="noreferrer">${escapeHtml(row.exactUrl)}</a>
          </div>
          <aside>
            <small>${escapeHtml(row.ready ? 'Separate run route is available for this exact approved action.' : 'No run starts from approval or from this status view.')}</small>
            <em>${escapeHtml(row.hasHandsPolicy ? 'Has approved selector/action' : 'Needs approved selector/action')}</em>
          </aside>
        </article>
      `).join('')}
    </div>
  `
}

function renderApprovalReview(snapshot = {}) {
  if (!els.approvalReview) return
  const queue = list(snapshot.approvalReviewQueue)
  if (!queue.length) {
    els.approvalReview.innerHTML = `
      <article class="approval-empty">
        <span>No link approvals waiting</span>
        <p>The extractor did not return useful external links that need Steve review right now.</p>
      </article>
      ${renderHandsQueue(snapshot)}
    `
    return
  }
  els.approvalReview.innerHTML = `
    <div class="approval-head">
      <div>
        <span>Links held for review</span>
        <p>These are links found in watched videos. The system will not crawl them deeper until the exact source follow-up is approved.</p>
      </div>
      <strong>${escapeHtml(compactNumber(queue.length))}</strong>
    </div>
    <div class="approval-list">
      ${queue.map((item, index) => `
        <article class="approval-row">
          <div>
            <span>${escapeHtml(item.type || 'review')}</span>
            <h3>${escapeHtml(approvalReviewTitle(item))}</h3>
            <p>${escapeHtml(item.reason || 'Needs approval before the system reads this link.')}</p>
            ${item.sourcePacketPreview?.plainEnglish ? `<p class="approval-packet-copy">${escapeHtml(item.sourcePacketPreview.plainEnglish)}</p>` : ''}
            ${item.sourcePacketPreview?.runtimePlan?.plainEnglish ? `<p class="approval-runtime-copy">${escapeHtml(item.sourcePacketPreview.runtimePlan.plainEnglish)}</p>` : ''}
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a>
          </div>
          <aside>
            <small>${escapeHtml(item.decisionNeeded || 'Approve exact source follow-up or reject.')}</small>
            <button class="approval-ai-btn" type="button" data-approval-action="toggle" data-approval-index="${escapeHtml(String(index))}">Decide with AI</button>
          </aside>
          <div class="approval-ai-panel" data-approval-panel="${escapeHtml(String(index))}" hidden>
            <label>
              <span>Tell the AI what this link is for</span>
              <textarea rows="3" placeholder="Example: free community, follow public/free areas. Or: sales page, review how they sell AI products."></textarea>
            </label>
            <div class="approval-ai-actions">
              <button type="button" data-approval-action="preview" data-approval-index="${escapeHtml(String(index))}">Preview packet</button>
              <button type="button" data-approval-action="record" data-approval-decision="approve_packet" data-approval-index="${escapeHtml(String(index))}">Approve packet</button>
              <button type="button" data-approval-action="record" data-approval-decision="hold_packet" data-approval-index="${escapeHtml(String(index))}">Hold</button>
              <button type="button" data-approval-action="record" data-approval-decision="reject_link" data-approval-index="${escapeHtml(String(index))}">Reject</button>
              <em>Recording does not start the worker. Approved public packets show separate runner status.</em>
            </div>
            <div class="approval-ai-result" data-approval-result="${escapeHtml(String(index))}"></div>
          </div>
        </article>
      `).join('')}
    </div>
    ${renderHandsQueue(snapshot)}
  `
  bindApprovalReviewControls(queue)
}

function packetPreviewParams(item = {}, operatorNote = '') {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({
    url: item.url,
    host: item.host,
    sourceVideoId: item.sourceVideoId,
    sourceUrl: item.sourceUrl,
    reportArtifactId: item.reportArtifactId,
    reason: item.reason,
    operatorNote,
  })) {
    if (text(value)) params.set(key, text(value))
  }
  return params
}

function renderPacketPreviewResult(result = {}) {
  const packet = result.packet || {}
  const runtime = packet.runtimePlan || {}
  return `
    <article class="approval-packet-preview">
      <span>${escapeHtml(packet.proposedDecision || 'packet preview')}</span>
      <h4>${escapeHtml(packet.plainEnglish || result.plainEnglish || 'Packet preview ready.')}</h4>
      ${runtime.plainEnglish ? `<p class="approval-runtime-copy">${escapeHtml(runtime.plainEnglish)}</p>` : ''}
      <ul>
        ${list(packet.allowedActions).slice(0, 4).map(action => `<li>${escapeHtml(action)}</li>`).join('')}
      </ul>
      ${list(runtime.requiredBeforeRun).length ? `
        <p>Before anything runs:</p>
        <ul>
          ${list(runtime.requiredBeforeRun).slice(0, 4).map(action => `<li>${escapeHtml(action)}</li>`).join('')}
        </ul>
      ` : ''}
      <p>${escapeHtml(result.plainEnglish || 'Preview only. No crawl, login, purchase, form, worker, or backlog write starts from this preview.')}</p>
    </article>
  `
}

function renderPacketDecisionResult(result = {}) {
  const record = result.record || {}
  const item = result.sourceCrawlItem || {}
  const worker = result.workerStatus || {}
  const blocked = result.status === 'blocked' || result.validation?.ok === false
  const workerCopy = worker.plainEnglish ||
    (worker.ready
      ? 'Ready for the separate exact-page worker.'
      : 'No worker is ready from this decision.')
  return `
    <article class="approval-packet-preview ${blocked ? 'blocked' : 'recorded'}">
      <span>${escapeHtml(blocked ? 'Needs adjustment' : 'Decision recorded')}</span>
      <h4>${escapeHtml(result.plainEnglish || record.plainEnglish || 'Decision saved.')}</h4>
      <p>${escapeHtml(blocked ? 'Nothing ran. Adjust the note or hold the link.' : 'Saved in the Foundation decision ledger. Approval did not start the worker.')}</p>
      <p>${escapeHtml(workerCopy)}</p>
      ${item.itemKey ? `<p>${escapeHtml(item.itemKey)}</p>` : ''}
    </article>
  `
}

function bindApprovalReviewControls(queue = []) {
  if (!els.approvalReview) return
  els.approvalReview.querySelectorAll('[data-approval-action="toggle"]').forEach(button => {
    button.addEventListener('click', () => {
      const index = button.getAttribute('data-approval-index')
      const panel = els.approvalReview.querySelector(`[data-approval-panel="${CSS.escape(index)}"]`)
      if (!panel) return
      panel.hidden = !panel.hidden
    })
  })
  els.approvalReview.querySelectorAll('[data-approval-action="preview"]').forEach(button => {
    button.addEventListener('click', async () => {
      const index = Number(button.getAttribute('data-approval-index'))
      const item = queue[index]
      const panel = els.approvalReview.querySelector(`[data-approval-panel="${CSS.escape(String(index))}"]`)
      const result = els.approvalReview.querySelector(`[data-approval-result="${CSS.escape(String(index))}"]`)
      const operatorNote = panel?.querySelector('textarea')?.value || ''
      if (!item || !result) return
      button.disabled = true
      result.innerHTML = '<p class="approval-ai-loading">Building packet preview...</p>'
      try {
        const response = await fetch(`${LINK_PACKET_PREVIEW_ROUTE}?${packetPreviewParams(item, operatorNote).toString()}`, { credentials: 'same-origin' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        result.innerHTML = renderPacketPreviewResult(payload)
      } catch (error) {
        result.innerHTML = `<p class="approval-ai-error">${escapeHtml(error instanceof Error ? error.message : 'Packet preview failed.')}</p>`
      } finally {
        button.disabled = false
      }
    })
  })
  els.approvalReview.querySelectorAll('[data-approval-action="record"]').forEach(button => {
    button.addEventListener('click', async () => {
      const index = Number(button.getAttribute('data-approval-index'))
      const item = queue[index]
      const panel = els.approvalReview.querySelector(`[data-approval-panel="${CSS.escape(String(index))}"]`)
      const result = els.approvalReview.querySelector(`[data-approval-result="${CSS.escape(String(index))}"]`)
      const operatorNote = panel?.querySelector('textarea')?.value || ''
      const operatorAction = button.getAttribute('data-approval-decision') || 'hold_packet'
      if (!item || !result) return
      button.disabled = true
      result.innerHTML = '<p class="approval-ai-loading">Recording decision...</p>'
      try {
        const response = await fetch(LINK_PACKET_DECISION_ROUTE, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: item.url,
            host: item.host,
            sourceVideoId: item.sourceVideoId,
            sourceUrl: item.sourceUrl,
            reportArtifactId: item.reportArtifactId,
            reason: item.reason,
            operatorNote,
            operatorAction,
          }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          result.innerHTML = renderPacketDecisionResult({
            ...payload,
            status: 'blocked',
            plainEnglish: payload.plainEnglish || `HTTP ${response.status}`,
          })
          return
        }
        result.innerHTML = renderPacketDecisionResult(payload)
      } catch (error) {
        result.innerHTML = `<p class="approval-ai-error">${escapeHtml(error instanceof Error ? error.message : 'Decision record failed.')}</p>`
      } finally {
        button.disabled = false
      }
    })
  })
}

function buildSourceFamilyRows(snapshot = {}) {
  return sourceCoverageRows(snapshot)
    .filter(row => row.familyId !== 'youtube-public-build-intel')
    .slice(0, 8)
}

function renderEconomics(snapshot = {}) {
  const economics = snapshot.extractionEconomics || {}
  if (!Number(economics.estimatedSpendUsd || 0)) {
    return `
      <div class="leader-economics empty">
        <span>API cost tracking needs usage data</span>
        <p>The LLM call ledger did not return Gemini video-review usage yet.</p>
      </div>
    `
  }
  return `
    <div class="leader-economics">
      <article>
        <strong>${escapeHtml(money(economics.estimatedSpendUsd))}</strong>
        <span>estimated API spend</span>
      </article>
      <article>
        <strong>${escapeHtml(money(economics.costPerIdeaUsd))}</strong>
        <span>cost per idea</span>
      </article>
      <article>
        <strong>${escapeHtml(money(economics.costPerVideoUsd))}</strong>
        <span>cost per video</span>
      </article>
      <p>${escapeHtml(compactNumber(economics.callCount))} Gemini video-review calls · ${escapeHtml(compactNumber(economics.videoCount))} videos · ${escapeHtml(compactNumber(economics.ideaCount))} build ideas. Estimate uses stored token usage, not Google invoice totals.</p>
    </div>
  `
}

function renderSourceLeaderboard(snapshot = {}) {
  if (!els.sourceLeaderboard) return
  const rankedCreators = topDevSources(snapshot)
    .filter(source => source.creator || source.creatorId)
    .slice(0, 8)
  const familyRows = buildSourceFamilyRows(snapshot)

  els.sourceLeaderboard.innerHTML = `
    ${renderEconomics(snapshot)}
    <div class="leader-columns">
      <section class="leader-block">
        <div class="leader-block-head">
          <span>Ranked creators</span>
          <small>${escapeHtml(compactNumber(rankedCreators.length))} showing</small>
        </div>
        <div class="leader-list">
          ${rankedCreators.map((source, index) => {
            const devLane = laneScore(source)
            const grade = text(source.devBuildGrade || devLane?.grade || source.overallGrade, 'Needs grade').toUpperCase()
            const score = devLane?.score == null ? '' : ` · ${compactNumber(devLane.score)} score`
            const rankCopy = source.bestDirectorRank ? `Best idea rank #${compactNumber(source.bestDirectorRank)}` : 'No Director rank yet'
            return `
              <article class="leader-card ${escapeHtml(gradeTone(grade))}">
                <div class="leader-grade">${escapeHtml(grade)}</div>
                <div class="leader-copy">
                  <span>#${escapeHtml(compactNumber(index + 1))} · Dev build${escapeHtml(score)}</span>
                  <h3>${escapeHtml(source.creator || creatorDisplayName(snapshot, source.creatorId))}</h3>
                  <p>${escapeHtml(`${compactNumber(source.buildCandidates)} ideas · ${compactNumber(source.watchedVideos)} watched/represented videos · ${rankCopy}`)}</p>
                </div>
              </article>
            `
          }).join('') || '<article class="loading-card">No creator grades returned yet.</article>'}
        </div>
      </section>
      <section class="leader-block">
        <div class="leader-block-head">
          <span>Source families</span>
          <small>Connected vs waiting</small>
        </div>
        <div class="family-list">
          ${familyRows.map(row => `
            <article class="family-row ${escapeHtml(familyTone(row.status))}">
              <div>
                <h3>${escapeHtml(row.label)}</h3>
                <p>${escapeHtml(row.feedsDev ? row.feedPath : row.nextAction || row.blocker || row.notes || 'Not feeding Dev yet.')}</p>
              </div>
              <strong>${escapeHtml(familyStatusCopy(row.status))}</strong>
            </article>
          `).join('') || '<article class="loading-card">No source-family coverage returned yet.</article>'}
        </div>
      </section>
    </div>
  `
}

function extractorSummary(item = {}) {
  if (item.summary) return text(item.summary)
  const byLane = {
    'youtube-video-intelligence-pipeline': 'Reads public video/page context, transcripts, audio, and approved visual evidence. Browser hands and approved resource follow-up are next. Comments are excluded.',
    'meetings-transcripts': 'Reads meeting notes and transcripts into Foundation. Dev-specific routing is pending.',
    'email-missive-comms': 'Reads governed email/comms candidates into Foundation. Dev-specific routing is pending.',
    'slack-comms': 'Reads governed Slack threads into Foundation. Dev-specific routing is pending.',
    'synthesis-router': 'Brain layer: dedupes extracted facts and routes them into build candidates.',
  }
  return byLane[item.laneId] || text(item.summary || item.detail, 'Foundation extraction lane.')
}

function extractorTitle(item = {}) {
  const byLane = {
    'youtube-video-intelligence-pipeline': 'YouTube video extractor',
    'meetings-transcripts': 'Meetings extractor',
    'email-missive-comms': 'Gmail / Missive extractor',
    'slack-comms': 'Slack extractor',
    'synthesis-router': 'Synthesis router',
  }
  return byLane[item.laneId] || text(item.title || item.name, 'Extraction system')
}

function extractorIcon(item = {}) {
  const byLane = {
    'youtube-video-intelligence-pipeline': 'video_library',
    'meetings-transcripts': 'forum',
    'email-missive-comms': 'mail',
    'slack-comms': 'tag',
    'synthesis-router': 'account_tree',
  }
  return byLane[item.laneId] || 'hub'
}

const GOD_MODE_CAPABILITY_LABELS = {
  eyes: 'Eyes',
  ears: 'Ears',
  hands: 'Hands',
  reading: 'Read',
  brain: 'Brain',
  evidence: 'Evidence',
  boundaries: 'Boundaries',
  output: 'Output',
}

function statusCopy(value = '') {
  return text(value, 'unknown').replace(/_/g, ' ')
}

function parityTone(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized === 'working' || normalized.includes('proven') || normalized.includes('ready')) return 'verified'
  if (normalized.includes('blocked') || normalized.includes('required')) return 'blocked'
  if (normalized.includes('planned') || normalized.includes('partial') || normalized.includes('queue')) return 'pending'
  if (normalized.includes('excluded') || normalized.includes('not_applicable')) return 'neutral'
  return 'pending'
}

function renderCapabilityChips(family = {}) {
  const capabilities = family.capabilities || {}
  return Object.entries(GOD_MODE_CAPABILITY_LABELS)
    .map(([key, label]) => ({ key, label, value: text(capabilities[key]) }))
    .filter(item => item.value && item.value !== 'not_applicable')
    .map(item => `
      <span class="cap-chip ${escapeHtml(parityTone(item.value))}">
        <b>${escapeHtml(item.label)}</b>
        ${escapeHtml(statusCopy(item.value))}
      </span>
    `).join('')
}

function renderGodModeParity(snapshot = {}) {
  if (!els.godModeParity) return
  const parity = snapshot.godModeExtractorParity || {}
  const maturity = snapshot.sourceFamilyGodModeMaturity || {}
  const families = list(parity.families)
  const maturityByFamilyId = new Map(list(maturity.families).map(family => [family.familyId, family]))
  const summary = maturity.summary || parity.summary || {}
  const evaluation = maturity.evaluation || parity.evaluation || {}
  const status = evaluation.ok === true ? 'No false God Mode claims' : 'Parity finding'
  const familyRows = families.map(family => {
    const maturityRow = maturityByFamilyId.get(family.familyId) || {}
    const blockers = list(family.blockers).slice(0, 2)
    const freshnessStatus = statusCopy(maturityRow.freshnessStatus || 'not tracked')
    const latestSuccess = maturityRow.latestSuccessfulRunAt ? shortDate(maturityRow.latestSuccessfulRunAt) : 'No live success'
    const nextAction = maturityRow.nextBestAction || family.nextCard || 'Needs source-family review.'
    return `
      <article class="parity-card ${escapeHtml(parityTone(family.currentLevel))}">
        <div class="parity-card-head">
          <span>${escapeHtml(statusCopy(family.currentLevel))}</span>
          <strong>${escapeHtml(family.familyId || '')}</strong>
        </div>
        <h3>${escapeHtml(family.label || family.familyId || 'Source family')}</h3>
        <p>${escapeHtml(family.accessBoundary || family.modelRoute || '')}</p>
        <div class="parity-meta">
          <span><b>Freshness</b>${escapeHtml(freshnessStatus)}</span>
          <span><b>Latest success</b>${escapeHtml(latestSuccess)}</span>
        </div>
        <div class="cap-list parity-cap-list">${renderCapabilityChips(family)}</div>
        <div class="parity-next">
          <span>Next</span>
          <b>${escapeHtml(family.nextCard || 'No active card')}</b>
          <p>${escapeHtml(nextAction)}</p>
        </div>
        ${blockers.length ? `<ul>${blockers.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      </article>
    `
  }).join('')

  els.godModeParity.innerHTML = `
    <div class="parity-head">
      <div>
        <span>GOD MODE PARITY</span>
        <h3>${escapeHtml(status)}</h3>
      </div>
      <div class="parity-summary" aria-label="God Mode parity summary">
        <span><b>${escapeHtml(compactNumber(summary.familyCount || families.length))}</b> families</span>
        <span><b>${escapeHtml(compactNumber(summary.godModeReadyCount || summary.claimsGodModeCount || 0))}</b> God ready</span>
        <span><b>${escapeHtml(compactNumber(summary.blockedCount || summary.blockedFamilyCount || 0))}</b> blocked</span>
        <span><b>${escapeHtml(compactNumber(summary.handsGapCount || summary.handsNotProvenCount || 0))}</b> hands gaps</span>
      </div>
    </div>
    <div class="parity-grid">
      ${familyRows || '<article class="loading-card">No parity rows returned from Foundation.</article>'}
    </div>
  `
}

function sourceIcon(source = {}) {
  const bySource = {
    youtube: 'play_circle',
    'skool-paid': 'school',
    'github-repos': 'code',
    'internal-signals': 'mail',
    'meetings-transcripts-source': 'forum',
  }
  return bySource[source.id] || 'database'
}

function sourceStatusLine(source = {}) {
  if (source.statusLine) return source.statusLine
  const status = statusLabel(source.badge || source.label)
  const count = list(source.targets).length
  const noun = text(source.targetNoun, 'target')
  const targetCopy = count === 1 ? `1 ${noun}` : `${compactNumber(count)} ${noun}s`
  if (status === 'Live') return `Running · ${targetCopy}`
  if (status === 'Foundation') return `Connected · ${targetCopy}`
  if (status === 'Pending') return 'Needs login rules'
  if (status === 'Needs source') return 'Planned'
  return `${status} · ${targetCopy}`
}

function sourceTone(source = {}) {
  const status = statusLabel(source.badge || source.label)
  if (status === 'Live' || status === 'Foundation') return 'live'
  if (status === 'Pending' || status === 'Needs approval') return 'pending'
  if (status === 'Verified' || status === 'Source-backed') return 'verified'
  return ''
}

function shortCandidateTitle(candidate = {}) {
  const raw = text(candidate.title || candidate.recommendedNextStep, 'Build candidate')
  const normalized = raw.toLowerCase()
  if (normalized.includes('package reusable aios skills')) return 'Reusable AIOS skills'
  if (normalized.includes('developer workflow signals')) return 'Developer workflow signals'
  if (normalized.includes('self-healing state registry')) return 'Self-healing handoff controller'
  if (normalized.includes('browserbase') || normalized.includes('browse/hermes')) return 'Browser skills hands layer'
  if (normalized.includes('canvas-to-terminal')) return 'Canvas-terminal sync'
  if (normalized.includes('silver-platter')) return 'Silver-platter CLI skill'
  const withoutPrefix = raw.replace(/^Mark Kashef:\s*/i, '').replace(/^Use\s+/i, '')
  const beforeColon = withoutPrefix.split(':')[0]
  const beforeComma = beforeColon.split(',')[0]
  const words = beforeComma.trim().split(/\s+/).filter(Boolean)
  return words.length > 7 ? words.slice(0, 6).join(' ') : beforeComma.trim()
}

function shortCandidateBody(candidate = {}) {
  const raw = text(candidate.why || candidate.recommendedNextStep, 'Build idea from approved research.')
  const normalized = `${raw} ${candidate.title || ''} ${candidate.recommendedNextStep || ''}`.toLowerCase()
  if (normalized.includes('package reusable aios skills')) {
    return 'Turn reusable Claude/Codex workflows into governed AIOS skills with proof and promotion gates.'
  }
  if (normalized.includes('developer workflow signals')) {
    return 'Use recurring workflow, memory, design, and context themes as AIOS training candidates.'
  }
  if (normalized.includes('self-healing state registry')) {
    return 'Standardize a local state checkpoint so agent handoffs can recover after crashes or context loss.'
  }
  if (normalized.includes('browserbase') || normalized.includes('browse/hermes')) {
    return 'Evaluate browser skills as the HANDS layer, but only after source-packet approvals.'
  }
  if (normalized.includes('canvas-to-terminal')) {
    return 'Connect visual design state and terminal execution so builders can move cleanly between them.'
  }
  if (normalized.includes('silver-platter')) {
    return 'Create operator-friendly commands that trigger multi-source extraction and formatted reports.'
  }
  const sentence = raw.split(/[.!?]/).find(part => part.trim().length > 20) || raw
  const words = sentence.trim().split(/\s+/).filter(Boolean)
  return words.length > 22 ? words.slice(0, 22).join(' ') : sentence.trim()
}

function creatorIdFromReportId(value = '') {
  const latest20Match = text(value).match(/batch:youtube-latest-20:api-full-watch-v1:([^:]+):/i)
  if (latest20Match?.[1]) return latest20Match[1]
  if (/mark-kashef/i.test(value)) return 'mark-kashef'
  return ''
}

function candidateCreatorName(candidate = {}) {
  const snapshot = state.snapshot || {}
  const directCreatorId = text(candidate.creatorId || creatorIdFromReportId(candidate.sourceReportArtifactId))
  if (directCreatorId) return creatorDisplayName(snapshot, directCreatorId)

  const byVideo = sourceGrades(snapshot).find(source =>
    list(source.topCandidates).some(item => text(item.sourceVideoId) && text(item.sourceVideoId) === text(candidate.sourceVideoId))
  )
  if (byVideo?.creator) return byVideo.creator

  const byResearchVideo = list(snapshot.dailyWatch?.researchPool)
    .find(item => text(item.videoId) && text(item.videoId) === text(candidate.sourceVideoId))
  if (byResearchVideo?.creator) return byResearchVideo.creator

  const reportTitle = text(candidate.sourceReportTitle)
  if (/mark kashef/i.test(reportTitle)) return 'Mark Kashef'
  return ''
}

function candidateSourceCopy(candidate = {}) {
  const creator = candidateCreatorName(candidate)
  if (creator) return `From ${creator} video`
  const reportTitle = text(candidate.sourceReportTitle)
  if (reportTitle && !/latest-20|batch|god mode api full-watch/i.test(reportTitle)) return `From ${reportTitle}`
  if (candidate.sourceVideoId) return 'From watched video'
  return 'From approved research'
}

function renderExtractors(snapshot = {}) {
  const extractors = list(snapshot.activeExtractionLanes)

  els.extractorGrid.innerHTML = extractors.map(item => `
    <article class="extractor-card ${dotClass(item.status)}">
      <div class="card-icon"><span class="material-symbols-outlined">${escapeHtml(extractorIcon(item))}</span></div>
      <span class="label">${escapeHtml(item.label || item.status)}</span>
      <h3>${escapeHtml(extractorTitle(item))}</h3>
      <p>${escapeHtml(extractorSummary(item))}</p>
      <div class="extractor-meta">
        <span>${escapeHtml(item.latestRunLabel || 'Last run')}</span>
        <strong>${escapeHtml(shortDate(item.latestRunAt))}</strong>
      </div>
    </article>
  `).join('') || '<article class="loading-card">No extraction lanes returned from Foundation.</article>'
}

function renderEvidence(snapshot = {}) {
  if (!els.evidenceGrid) return
  const evidence = buildEvidenceCards(snapshot)
  els.evidenceGrid.innerHTML = evidence.map(item => `
    <article class="evidence-card ${escapeHtml(item.tone)}">
      <div class="evidence-num">${escapeHtml(compactNumber(item.value))}</div>
      <div class="evidence-label">${escapeHtml(item.label)}</div>
      <p>${escapeHtml(item.summary)}</p>
      <div class="evidence-meta">${escapeHtml(item.meta)}</div>
    </article>
  `).join('')
}

function renderSources() {
  const sources = state.sources
  els.grid.innerHTML = sources.map((source, index) => `
    <button class="source-card source-mini${source.id === state.selectedSourceId || (!state.selectedSourceId && index === 0) ? ' active' : ''}" type="button" data-source="${escapeHtml(source.id)}">
      <div class="source-mini-icon ${sourceTone(source)}">
        <span class="material-symbols-outlined">${escapeHtml(sourceIcon(source))}</span>
      </div>
      <div class="source-mini-copy">
        <h3>${escapeHtml(source.name)}</h3>
        <span class="source-mini-status ${sourceTone(source)}">${escapeHtml(sourceStatusLine(source))}</span>
      </div>
    </button>
  `).join('')
}

function renderTargets(sourceId) {
  const source = state.sources.find(item => item.id === sourceId) || state.sources[0]
  if (!source) {
    els.panel.innerHTML = '<div class="target-empty"><span>No source data</span><p>The Dev Data Pool API did not return source cards.</p></div>'
    return
  }
  state.selectedSourceId = source.id
  const targetCount = list(source.targets).length
  const sourceStatus = statusLabel(source.badge || source.label)
  const sourceNeedsAttention = !['Live', 'Foundation', 'Verified', 'Source-backed', 'Clear'].includes(sourceStatus)
  els.panel.innerHTML = `
    <div class="target-head">
      <div>
        <span class="eyebrow">Selected source · ${escapeHtml(compactNumber(targetCount))} ${targetCount === 1 ? 'target' : 'targets'}</span>
        <small class="route">${escapeHtml(source.sourceRoute || 'Route pending')}</small>
      </div>
      ${sourceNeedsAttention ? `<span class="source-status ${pillClass(source.badge || source.label)}">${escapeHtml(sourceStatus)}</span>` : ''}
    </div>
    <div class="target-list">
      ${list(source.targets).map(target => {
        const targetStatus = statusLabel(target[3])
        const targetNeedsAttention = !['Live', 'Foundation', 'Verified', 'Source-backed', 'Clear'].includes(targetStatus)
        return `
        <div class="target-row">
          <div class="target-row-head">
            <div>
              <strong>${escapeHtml(target[0])}</strong>
              <small>${escapeHtml(target[1])}</small>
            </div>
            ${targetNeedsAttention ? `<span class="pill ${pillClass(target[3])}">${escapeHtml(targetStatus)}</span>` : ''}
          </div>
          <p>${escapeHtml(target[2])}</p>
        </div>
      `}).join('') || '<div class="target-empty"><span>No targets</span><p>This source exists, but target details are not wired yet.</p></div>'}
    </div>
  `
}

function renderDirector(snapshot = {}) {
  const director = snapshot.director || {}
  const recommended = list(director.recommendedBuildNow)
  const strongNext = list(director.strongNext)
  const rankedCount = list(director.rankedCandidates).length
  const candidates = uniqueBy([...recommended, ...strongNext], candidate => candidate.title).slice(0, 6)
  const recommendedTitles = new Set(recommended.map(candidate => text(candidate.title)))
  if (els.directorHeadStats) {
    els.directorHeadStats.innerHTML = `
      <span><b>${escapeHtml(compactNumber(recommended.length))}</b> ready</span>
      <span><b>${escapeHtml(compactNumber(strongNext.length))}</b> next</span>
      <span><b>${escapeHtml(compactNumber(rankedCount))}</b> total</span>
    `
  }
  if (!candidates.length) {
    els.directorPanel.innerHTML = `
      <article class="director-empty">
        <span>Needs source</span>
        <h3>Director report not available</h3>
        <p>The Dev Intelligence Director should read Foundation reports and return proposal-only build candidates here.</p>
      </article>
    `
    return
  }
  const previewTitles = candidates.slice(0, 3).map(candidate => shortCandidateTitle(candidate)).join(' · ')
  els.directorPanel.innerHTML = `
    <details class="director-accordion">
      <summary>
        <span class="director-kicker">Director recommendations</span>
        <small>${escapeHtml(compactNumber(recommended.length))} ready ideas · ${escapeHtml(previewTitles)}</small>
      </summary>
      <div class="director-list">
        ${candidates.map(candidate => {
          const lane = recommendedTitles.has(text(candidate.title)) ? 'BUILD-NOW' : 'STRONG-NEXT'
          const laneCopy = lane === 'BUILD-NOW' ? 'Ready to build' : 'Next up'
          return `
          <article class="candidate-card ${lane === 'STRONG-NEXT' ? 'next' : ''}">
            <div class="candidate-rankline">#${escapeHtml(candidate.rank)} · ${escapeHtml(laneCopy)} · score ${escapeHtml(compactNumber(candidate.missionScore))}</div>
            <h3 title="${escapeHtml(candidate.title)}">${escapeHtml(shortCandidateTitle(candidate))}</h3>
            <p>${escapeHtml(shortCandidateBody(candidate))}</p>
            <div class="candidate-meta">
              <small title="${escapeHtml(candidate.sourceReportArtifactId || 'Needs source')}">${escapeHtml(candidateSourceCopy(candidate))}</small>
            </div>
          </article>
        `}).join('')}
      </div>
      ${rankedCount > candidates.length ? `<div class="director-more">Showing top ${escapeHtml(compactNumber(candidates.length))} of ${escapeHtml(compactNumber(rankedCount))} ideas.</div>` : ''}
    </details>
  `
}

function renderSnapshot(snapshot = {}) {
  state.snapshot = snapshot
  state.sources = buildLiveSources(snapshot)
  state.selectedSourceId = state.selectedSourceId || state.sources[0]?.id || null
  renderExtractors(snapshot)
  renderGodModeParity(snapshot)
  renderEvidence(snapshot)
  renderApprovalReview(snapshot)
  renderSourceLeaderboard(snapshot)
  renderSources()
  renderTargets(state.selectedSourceId)
  renderDirector(snapshot)
}

function renderError(error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const html = `<article class="loading-card error">Dev Data Pool failed to load: ${escapeHtml(message)}</article>`
  els.extractorGrid.innerHTML = html
  if (els.godModeParity) els.godModeParity.innerHTML = html
  if (els.approvalReview) els.approvalReview.innerHTML = html
  if (els.sourceLeaderboard) els.sourceLeaderboard.innerHTML = html
  els.grid.innerHTML = html
  els.panel.innerHTML = html
  els.directorPanel.innerHTML = html
}

async function loadDevDataPool() {
  try {
    const response = await fetch(API_ROUTE, { credentials: 'same-origin', cache: 'no-store' })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const snapshot = await response.json()
    renderSnapshot(snapshot)
  } catch (error) {
    renderError(error)
  }
}

function updateTime() {
  const current = document.getElementById('launcher-clock') || document.getElementById('current-time')
  if (!current) return
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})
  current.innerHTML = `${parts.day} ${parts.month.toLowerCase()} ${parts.year} <b>· ${parts.hour}:${parts.minute} ${parts.dayPeriod} EDT</b>`
}

function initialsFromUser(user = {}) {
  const raw = text(user.name || user.displayName || user.email || 'Steve Zahnd')
  const emailName = raw.includes('@') ? raw.split('@')[0] : raw
  const parts = emailName.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'SZ'
}

function displayNameFromUser(user = {}) {
  const raw = text(user.name || user.displayName || user.fullName || user.email || 'Steve Zahnd')
  if (!raw.includes('@')) return raw.toUpperCase()
  return raw.split('@')[0].replace(/[._-]+/g, ' ').toUpperCase()
}

function roleFromUser(user = {}) {
  const role = text(user.role).toLowerCase()
  if (role === 'owner') return 'EXEC LEADERSHIP · T1'
  if (role === 'sales') return 'SALES · ACCESS'
  if (role === 'ops') return 'OPS · ACCESS'
  return text(user.roleLabel || user.title || 'ACCESS').toUpperCase()
}

function setAccountMenuOpen(open) {
  const button = document.getElementById('launcher-user-button')
  const menu = document.getElementById('launcher-account-menu')
  if (!button || !menu) return
  button.setAttribute('aria-expanded', open ? 'true' : 'false')
  menu.hidden = !open
}

function toggleAccountMenu() {
  const button = document.getElementById('launcher-user-button')
  if (!button) return
  setAccountMenuOpen(button.getAttribute('aria-expanded') !== 'true')
}

function handleAccountMenuDocumentClick(event) {
  const wrap = document.getElementById('launcher-user')
  if (!wrap || wrap.contains(event.target)) return
  setAccountMenuOpen(false)
}

function handleAccountMenuKeydown(event) {
  if (event.key === 'Escape') setAccountMenuOpen(false)
}

async function logoutDevUser() {
  const button = document.getElementById('launcher-logout')
  if (button) {
    button.disabled = true
    button.textContent = 'Logging out...'
  }

  try {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' })
    window.location.assign('/login?next=/dev')
  } catch (error) {
    if (button) {
      button.disabled = false
      button.textContent = 'Log out'
    }
  }
}

async function loadDevSessionChrome() {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' })
    if (!response.ok) throw new Error('Session fetch failed.')
    const session = await response.json()
    const user = session?.user || {}
    const avatar = document.getElementById('launcher-avatar')
    const name = document.getElementById('launcher-user-name')
    const role = document.getElementById('launcher-user-role')
    if (avatar) avatar.textContent = initialsFromUser(user)
    if (name) name.textContent = displayNameFromUser(user)
    if (role) role.textContent = roleFromUser(user)
  } catch (error) {
    const name = document.getElementById('launcher-user-name')
    const role = document.getElementById('launcher-user-role')
    if (name) name.textContent = 'SIGNED OUT'
    if (role) role.textContent = 'LOGIN REQUIRED'
  }
}

document.querySelectorAll('.sb-link').forEach(button => {
  button.addEventListener('click', () => {
    window.location.hash = 'data-pool'
  })
})

els.grid.addEventListener('click', event => {
  const card = event.target.closest('.source-card')
  if (!card) return
  document.querySelectorAll('.source-card').forEach(item => item.classList.remove('active'))
  card.classList.add('active')
  renderTargets(card.dataset.source)
})

updateTime()
setInterval(updateTime, 60000)
loadDevSessionChrome()
document.addEventListener('click', handleAccountMenuDocumentClick)
document.addEventListener('keydown', handleAccountMenuKeydown)
document.getElementById('launcher-user-button')?.addEventListener('click', toggleAccountMenu)
document.getElementById('launcher-logout')?.addEventListener('click', logoutDevUser)
loadDevDataPool()
