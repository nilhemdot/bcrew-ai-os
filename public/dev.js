const API_ROUTE = '/api/foundation/dev-team-hub'

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
  evidenceGrid: document.getElementById('evidence-grid'),
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
  if (normalized.includes('pending') || normalized.includes('approval') || normalized.includes('needs')) return 'pending'
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

function buildLiveSources(snapshot = {}) {
  const daily = snapshot.dailyWatch || {}
  const mark = snapshot.markYoutube || {}
  const youtubeContract = sourceContract(snapshot, 'SRC-YOUTUBE-INTEL-001')

  const live = [
    {
      id: 'youtube',
      name: 'YouTube Creators',
      label: 'Public creators',
      badge: statusBadge(daily.status),
      status: text(youtubeContract?.status, 'Needs source'),
      summary: `${compactNumber(daily.summary?.creatorCount)} public creator channels feed Dev. Detailed creator proof is visible as targets are promoted.`,
      tags: [text(mark.targetStatus, 'Needs source'), 'public', 'daily'],
      targets: [
        [text(mark.displayName, 'Mark Kashef'), 'Creator target', `${compactNumber(mark.markResearchPoolCount)} tracked videos · last run ${shortDate(mark.targetLastRunAt)}`, statusBadge(mark.targetStatus)],
      ],
      sourceRoute: daily.sourceRoute || '/api/foundation/build-intel/youtube-creator-daily-watch',
    },
  ]

  return [...live, ...plannedSources]
}

function buildEvidenceCards(snapshot = {}) {
  const counts = snapshot.counts || {}
  return [
    {
      value: counts.researchPool,
      label: 'Video pool',
      tone: 'live',
      summary: 'Videos the system knows about. Some are only saved as video info; approved ones get deeper review.',
      meta: 'Daily YouTube watch',
    },
    {
      value: counts.atoms,
      label: 'Extracted facts',
      tone: 'verified',
      summary: `${compactNumber(counts.atoms)} key facts and ${compactNumber(counts.evidenceHits)} proof notes are ready for Dev.`,
      meta: 'Saved findings + proof',
    },
    {
      value: counts.approvalRequiredLinks,
      label: 'Links to review',
      tone: counts.approvalRequiredLinks ? 'pending' : 'live',
      summary: `${compactNumber(counts.approvalRequiredLinks)} links Steve needs to OK before the system reads them.`,
      meta: 'Waiting for approval',
    },
    {
      value: counts.eyesTimestampedVisualEvidence,
      label: 'Visual evidence',
      tone: 'live',
      summary: 'Timestamped notes from approved video, audio, and screen review.',
      meta: 'Video/audio/visual review',
    },
  ]
}

function extractorSummary(item = {}) {
  const byLane = {
    'youtube-god-mode-pipeline': 'Reads public video/page context, transcripts, audio, and approved visual evidence. Browser hands, comments, and logged-in navigation are next.',
    'meetings-transcripts': 'Reads meeting notes and transcripts into Foundation. Dev-specific routing is pending.',
    'email-missive-comms': 'Reads governed email/comms candidates into Foundation. Dev-specific routing is pending.',
    'slack-comms': 'Reads governed Slack threads into Foundation. Dev-specific routing is pending.',
    'synthesis-router': 'Brain layer: dedupes extracted facts and routes them into build candidates.',
  }
  return byLane[item.laneId] || text(item.summary || item.detail, 'Foundation extraction lane.')
}

function extractorTitle(item = {}) {
  const byLane = {
    'youtube-god-mode-pipeline': 'YouTube video extractor',
    'meetings-transcripts': 'Meetings extractor',
    'email-missive-comms': 'Gmail / Missive extractor',
    'slack-comms': 'Slack extractor',
    'synthesis-router': 'Synthesis router',
  }
  return byLane[item.laneId] || text(item.title || item.name, 'Extraction system')
}

function extractorIcon(item = {}) {
  const byLane = {
    'youtube-god-mode-pipeline': 'video_library',
    'meetings-transcripts': 'forum',
    'email-missive-comms': 'mail',
    'slack-comms': 'tag',
    'synthesis-router': 'account_tree',
  }
  return byLane[item.laneId] || 'hub'
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
  const status = statusLabel(source.badge || source.label)
  const count = list(source.targets).length
  const targetCopy = count === 1 ? '1 target' : `${compactNumber(count)} targets`
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

function candidateSourceCopy(candidate = {}) {
  const source = `${candidate.sourceReportArtifactId || ''} ${candidate.title || ''} ${candidate.why || ''}`.toLowerCase()
  if (source.includes('mark-kashef') || source.includes('mark kashef')) return 'From Mark Kashef videos'
  if (source.includes('youtube')) return 'From YouTube research'
  if (source.includes('video')) return 'From video review'
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
        <span>Last run</span>
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
  renderEvidence(snapshot)
  renderSources()
  renderTargets(state.selectedSourceId)
  renderDirector(snapshot)
}

function renderError(error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const html = `<article class="loading-card error">Dev Data Pool failed to load: ${escapeHtml(message)}</article>`
  els.extractorGrid.innerHTML = html
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
