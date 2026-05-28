function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sourceRunMetadata(item = {}) {
  return item.metadata || item.metadata_json || {}
}

const SOURCE_RUN_BUCKET_LABELS = {
  'public-web-resources': 'Public pages/resources',
  'public-code-repos': 'Public code repos',
  'creator-newsletters': 'Creator newsletters',
  'free-communities': 'Free communities',
  'products-tools-to-approve': 'Products/tools',
  'paid-auth-gates': 'Paid/auth gates',
}

function sourceRunBucketLabel(bucketId = '') {
  return SOURCE_RUN_BUCKET_LABELS[text(bucketId)] || text(bucketId).replace(/[-_]+/g, ' ') || 'Unknown source'
}

function sourceRunHasUnsafeSideEffect(metadata = {}) {
  const sideEffects = metadata.sideEffects || {}
  return sideEffects.externalWrites === true ||
    sideEffects.writesBacklog === true ||
    sideEffects.submittedForm === true ||
    sideEffects.downloadedFile === true ||
    sideEffects.purchased === true ||
    sideEffects.postedOrMessaged === true ||
    sideEffects.mutatesCredentials === true ||
    sideEffects.normalChromeProfileUsed === true
}

function parsedUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function stripGitSuffix(value = '') {
  return text(value).replace(/\.git$/i, '')
}

function repoKeyForUrl(url = '') {
  const parsed = parsedUrl(url)
  if (!parsed) return text(url)
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  const parts = parsed.pathname.split('/').map(text).filter(Boolean)
  if (host === 'github.com' && parts.length >= 2) return `${host}/${parts[0]}/${stripGitSuffix(parts[1])}`.toLowerCase()
  if (host === 'gist.github.com' && parts.length >= 2) return `${host}/${parts[0]}/${parts[1]}`.toLowerCase()
  if (host === 'gitlab.com' && parts.length >= 2) return `${host}/${parts[0]}/${stripGitSuffix(parts[1])}`.toLowerCase()
  return `${host}${parsed.pathname}`.replace(/\/$/, '').toLowerCase()
}

function repoLabelForKey(key = '') {
  return text(key).replace(/^github\.com\//, '').replace(/^gist\.github\.com\//, 'gist/').replace(/^gitlab\.com\//, 'gitlab/')
}

function usefulSignalText(signal = {}) {
  return text(signal.text || signal.title || signal)
}

function normalizeTopRun(row = {}) {
  const metadata = row.metadata || {}
  const sourceStack = metadata.sourceStackUpdate || {}
  return {
    bucketId: text(metadata.bucketId),
    label: sourceRunBucketLabel(metadata.bucketId),
    url: text(metadata.url),
    host: text(metadata.host),
    status: text(metadata.status),
    sourceType: text(metadata.sourceType),
    pagesRead: number(metadata.pagesRead, 0),
    freeResourceCaptures: list(metadata.freeResourceCaptures).length,
    blockers: list(metadata.blockers).length,
    newsletterCandidates: number(metadata.newsletterCandidates, 0),
    paidGateEvaluations: number(metadata.paidGateEvaluations, 0),
    score: number(metadata.valueScore?.score, 0),
    grade: text(metadata.valueScore?.grade || 'ungraded').toUpperCase(),
    creatorId: text(sourceStack.creatorId),
    creator: text(sourceStack.creatorName),
    usefulSignals: list(metadata.usefulSignals).slice(0, 3).map(usefulSignalText).filter(Boolean),
  }
}

function buildRepoRunReadback(rows = []) {
  const repoRows = list(rows)
    .filter(row => text(row.metadata?.bucketId) === 'public-code-repos')
    .filter(row => text(row.item?.status || row.metadata?.status) === 'succeeded' || row.metadata?.ok === true)
  const byRepo = new Map()
  for (const row of repoRows) {
    const metadata = row.metadata || {}
    const repoKey = repoKeyForUrl(metadata.url)
    if (!repoKey) continue
    const current = byRepo.get(repoKey) || {
      repoKey,
      label: repoLabelForKey(repoKey),
      host: text(metadata.host),
      urls: [],
      runs: 0,
      pagesRead: 0,
      freeResourceCaptures: 0,
      blockers: 0,
      score: 0,
      grade: 'ungraded',
      usefulSignals: [],
      pageTitles: [],
      processedAt: '',
    }
    current.runs += 1
    current.pagesRead += number(metadata.pagesRead, 0)
    current.freeResourceCaptures += list(metadata.freeResourceCaptures).length
    current.blockers += list(metadata.blockers).length
    current.urls = [...new Set([...current.urls, text(metadata.url)].filter(Boolean))].slice(0, 5)
    current.usefulSignals = [...new Set([
      ...current.usefulSignals,
      ...list(metadata.usefulSignals).map(usefulSignalText).filter(Boolean),
    ])].slice(0, 6)
    current.pageTitles = [...new Set([
      ...current.pageTitles,
      ...list(metadata.pageSummaries).map(page => text(page.title)).filter(Boolean),
    ])].slice(0, 5)
    if (number(metadata.valueScore?.score, 0) > number(current.score, 0)) {
      current.score = number(metadata.valueScore?.score, 0)
      current.grade = text(metadata.valueScore?.grade || current.grade).toUpperCase()
    }
    const processedAt = text(row.item?.processedAt || row.item?.processed_at)
    if (processedAt && processedAt > current.processedAt) current.processedAt = processedAt
    byRepo.set(repoKey, current)
  }
  const topRepos = [...byRepo.values()].sort((left, right) =>
    number(right.score, 0) - number(left.score, 0) ||
    number(right.freeResourceCaptures, 0) - number(left.freeResourceCaptures, 0) ||
    number(right.pagesRead, 0) - number(left.pagesRead, 0) ||
    text(left.label).localeCompare(text(right.label))
  )
  const gradeBuckets = {}
  for (const repo of topRepos) {
    const grade = text(repo.grade || 'ungraded').toUpperCase() || 'ungraded'
    gradeBuckets[grade] = number(gradeBuckets[grade], 0) + 1
  }
  return {
    status: repoRows.length ? 'ready' : 'empty',
    runCount: repoRows.length,
    uniqueRepoCount: topRepos.length,
    pagesRead: repoRows.reduce((total, row) => total + number(row.metadata?.pagesRead, 0), 0),
    freeResourceCaptures: repoRows.reduce((total, row) => total + list(row.metadata?.freeResourceCaptures).length, 0),
    blockers: repoRows.reduce((total, row) => total + list(row.metadata?.blockers).length, 0),
    unsafeSideEffectRows: repoRows.filter(row => sourceRunHasUnsafeSideEffect(row.metadata)).length,
    gradeBuckets,
    topRepos: topRepos.slice(0, 12),
    rawArtifactPathsReturned: false,
    plainEnglish: 'Public repo readback summarizes saved source-browser evidence from watched-video links. It does not clone, install, download, import code, create backlog cards, or claim deep repo implementation review is finished.',
    nextAction: 'Use this to pick high-signal repos for the future repo deep-review worker, which should prefer README/docs/raw files and extract implementation patterns with provenance.',
  }
}

export function buildSourceBrowserRunSummary(runItems = []) {
  const rows = list(runItems).map(item => ({
    item,
    metadata: sourceRunMetadata(item),
  })).filter(row => text(row.metadata.url || row.metadata.rowId))
  const succeededRows = rows.filter(row => text(row.item.status || row.metadata.status) === 'succeeded' || row.metadata.ok === true)
  const failedRows = rows.filter(row => !succeededRows.includes(row))
  const gradeBuckets = {}
  const bucketMap = new Map()
  let pagesRead = 0
  let freeResourceCaptures = 0
  let blockers = 0
  let newsletterCandidates = 0
  let paidGateEvaluations = 0
  let unsafeSideEffectRows = 0

  for (const row of rows) {
    const metadata = row.metadata
    const bucketId = text(metadata.bucketId || 'unknown')
    const score = metadata.valueScore || {}
    const grade = text(score.grade || 'ungraded').toUpperCase() || 'ungraded'
    pagesRead += number(metadata.pagesRead, 0)
    freeResourceCaptures += list(metadata.freeResourceCaptures).length
    blockers += list(metadata.blockers).length
    newsletterCandidates += number(metadata.newsletterCandidates, 0)
    paidGateEvaluations += number(metadata.paidGateEvaluations, 0)
    if (sourceRunHasUnsafeSideEffect(metadata)) unsafeSideEffectRows += 1
    gradeBuckets[grade] = number(gradeBuckets[grade], 0) + 1
    const bucket = bucketMap.get(bucketId) || {
      bucketId,
      label: sourceRunBucketLabel(bucketId),
      runs: 0,
      succeeded: 0,
      failed: 0,
      pagesRead: 0,
      freeResourceCaptures: 0,
      blockers: 0,
      newsletterCandidates: 0,
      paidGateEvaluations: 0,
      bestScore: 0,
      bestGrade: 'ungraded',
    }
    bucket.runs += 1
    if (succeededRows.includes(row)) bucket.succeeded += 1
    else bucket.failed += 1
    bucket.pagesRead += number(metadata.pagesRead, 0)
    bucket.freeResourceCaptures += list(metadata.freeResourceCaptures).length
    bucket.blockers += list(metadata.blockers).length
    bucket.newsletterCandidates += number(metadata.newsletterCandidates, 0)
    bucket.paidGateEvaluations += number(metadata.paidGateEvaluations, 0)
    if (number(score.score, 0) > number(bucket.bestScore, 0)) {
      bucket.bestScore = number(score.score, 0)
      bucket.bestGrade = grade
    }
    bucketMap.set(bucketId, bucket)
  }

  const topRuns = succeededRows
    .map(normalizeTopRun)
    .sort((left, right) =>
      number(right.score, 0) - number(left.score, 0) ||
      number(right.freeResourceCaptures, 0) - number(left.freeResourceCaptures, 0) ||
      number(right.pagesRead, 0) - number(left.pagesRead, 0) ||
      text(left.host).localeCompare(text(right.host))
    )
    .slice(0, 12)

  return {
    status: rows.length ? 'ready' : 'empty',
    totalRuns: rows.length,
    succeededRuns: succeededRows.length,
    failedRuns: failedRows.length,
    pagesRead,
    freeResourceCaptures,
    blockers,
    newsletterCandidates,
    paidGateEvaluations,
    unsafeSideEffectRows,
    gradeBuckets,
    bucketSummaries: [...bucketMap.values()].sort((left, right) =>
      number(right.runs, 0) - number(left.runs, 0) ||
      text(left.label).localeCompare(text(right.label))
    ),
    topRuns,
    repoReadback: buildRepoRunReadback(rows),
    plainEnglish: 'Saved source-browser evidence is summarized here. Full raw artifacts stay in the source-run ledger; this preview keeps the Dev page fast while preserving counts and provenance.',
  }
}
