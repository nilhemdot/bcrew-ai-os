import {
  classifyFreeResourceFileLink,
} from './source-free-resource-file-policy.js'

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

function hostOf(value = '') {
  return parsedUrl(value)?.hostname.replace(/^www\./, '').toLowerCase() || ''
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

function normalizeFileResourceCandidate(candidate = {}, metadata = {}) {
  const url = text(candidate.url)
  if (!url) return null
  const label = text(candidate.label || candidate.title || candidate.reason || candidate.nextAction)
  const filePolicy = candidate.filePolicy?.isFileResource
    ? candidate.filePolicy
    : classifyFreeResourceFileLink({ url, label })
  const resourceKind = text(candidate.resourceKind || filePolicy.resourceKind || 'download_or_file_path')
  return {
    url,
    host: text(candidate.host) || hostOf(url),
    label,
    sourceFamily: text(candidate.sourceFamily || 'download_or_file'),
    decision: text(candidate.decision || candidate.type || 'blocked_download_requires_file_policy'),
    metadataOnly: candidate.metadataOnly !== false,
    downloadAllowed: candidate.downloadAllowed === true,
    extension: text(candidate.extension || filePolicy.extension),
    resourceKind,
    safety: text(candidate.safety || filePolicy.safety || 'metadata_only_until_file_type_review'),
    nextAction: text(candidate.nextAction || filePolicy.nextAction || 'Do not download; route to file/resource policy.'),
    sourceUrl: text(metadata.url),
    bucketId: text(metadata.bucketId),
    creatorId: text(metadata.sourceStackUpdate?.creatorId),
    creator: text(metadata.sourceStackUpdate?.creatorName),
  }
}

function fileResourceCandidatesForMetadata(metadata = {}) {
  const explicit = list(metadata.fileResourceCandidates)
    .map(candidate => normalizeFileResourceCandidate(candidate, metadata))
    .filter(Boolean)
  const fromBlockers = list(metadata.blockers)
    .filter(blocker => /download|file/i.test(`${blocker.type || blocker.decision || ''} ${blocker.reason || blocker.blocker || ''} ${blocker.url || ''}`))
    .map(blocker => normalizeFileResourceCandidate({
      ...blocker,
      decision: blocker.decision || blocker.type || 'blocked_download_requires_file_policy',
      label: blocker.label || blocker.reason || blocker.nextAction,
    }, metadata))
    .filter(Boolean)
  const byUrl = new Map()
  for (const candidate of [...explicit, ...fromBlockers]) {
    const key = candidate.url.toLowerCase()
    if (!byUrl.has(key)) byUrl.set(key, candidate)
  }
  return [...byUrl.values()]
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
    fileResourceCandidates: fileResourceCandidatesForMetadata(metadata).length,
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
      repoReadbackReadyRuns: 0,
      localRepoPagesRead: 0,
      globalChromePagesOpened: 0,
      globalChromeLinksSkipped: 0,
      repoHardBlockers: 0,
      implementationSignalCount: 0,
      handsRepoLocalFollowCount: 0,
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
    const repoReview = metadata.repoReview || {}
    if (repoReview.applies === true || repoReview.status === 'repo_readback_ready') {
      if (repoReview.status === 'repo_readback_ready') current.repoReadbackReadyRuns += 1
      current.localRepoPagesRead += number(repoReview.localRepoPagesRead, 0)
      current.globalChromePagesOpened += number(repoReview.globalChromePagesOpened, 0)
      current.globalChromeLinksSkipped += number(repoReview.globalChromeLinksSkipped, 0)
      current.repoHardBlockers += number(repoReview.hardBlockerCount, 0)
      current.implementationSignalCount += number(repoReview.implementationSignalCount, 0)
      current.handsRepoLocalFollowCount += number(repoReview.handsRepoLocalFollowCount, 0)
    }
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
  const repoReadbackReadyRuns = topRepos.reduce((total, repo) => total + number(repo.repoReadbackReadyRuns, 0), 0)
  const localRepoPagesRead = topRepos.reduce((total, repo) => total + number(repo.localRepoPagesRead, 0), 0)
  const globalChromePagesOpened = topRepos.reduce((total, repo) => total + number(repo.globalChromePagesOpened, 0), 0)
  const globalChromeLinksSkipped = topRepos.reduce((total, repo) => total + number(repo.globalChromeLinksSkipped, 0), 0)
  const repoHardBlockerCount = topRepos.reduce((total, repo) => total + number(repo.repoHardBlockers, 0), 0)
  const implementationSignalCount = topRepos.reduce((total, repo) => total + number(repo.implementationSignalCount, 0), 0)
  const handsRepoLocalFollowCount = topRepos.reduce((total, repo) => total + number(repo.handsRepoLocalFollowCount, 0), 0)
  return {
    status: repoRows.length ? 'ready' : 'empty',
    runCount: repoRows.length,
    uniqueRepoCount: topRepos.length,
    pagesRead: repoRows.reduce((total, row) => total + number(row.metadata?.pagesRead, 0), 0),
    freeResourceCaptures: repoRows.reduce((total, row) => total + list(row.metadata?.freeResourceCaptures).length, 0),
    blockers: repoRows.reduce((total, row) => total + list(row.metadata?.blockers).length, 0),
    runtimeProofStatus: repoReadbackReadyRuns ? 'ready' : 'pending_next_repo_run',
    repoReadbackReadyRuns,
    localRepoPagesRead,
    globalChromePagesOpened,
    globalChromeLinksSkipped,
    repoHardBlockerCount,
    implementationSignalCount,
    handsRepoLocalFollowCount,
    unsafeSideEffectRows: repoRows.filter(row => sourceRunHasUnsafeSideEffect(row.metadata)).length,
    gradeBuckets,
    topRepos: topRepos.slice(0, 12),
    rawArtifactPathsReturned: false,
    runtimeProofPlainEnglish: repoReadbackReadyRuns
      ? 'Repo runtime proof is present on saved runs: the source browser stayed inside repo-local README/docs/examples paths and skipped GitHub/GitLab navigation chrome.'
      : 'Future repo runs now include repo-local/chrome-skip proof fields; older saved repo rows may predate that runtime metadata.',
    plainEnglish: 'Public repo readback summarizes saved source-browser evidence from watched-video links. It does not clone, install, download, import code, create backlog cards, or claim deep repo implementation review is finished.',
    nextAction: 'Use this to pick high-signal repos for the future repo deep-review worker, which should prefer README/docs/raw files and extract implementation patterns with provenance.',
  }
}

function buildFileResourceReadback(rows = []) {
  const candidatesByUrl = new Map()
  let candidateCount = 0
  let unsafeSideEffectRows = 0
  for (const row of list(rows)) {
    const metadata = row.metadata || {}
    const candidates = fileResourceCandidatesForMetadata(metadata)
    if (candidates.length && sourceRunHasUnsafeSideEffect(metadata)) unsafeSideEffectRows += 1
    for (const candidate of candidates) {
      candidateCount += 1
      const key = candidate.url.toLowerCase()
      const current = candidatesByUrl.get(key) || {
        url: candidate.url,
        host: candidate.host,
        label: candidate.label,
        extension: candidate.extension,
        resourceKind: candidate.resourceKind,
        safety: candidate.safety,
        metadataOnly: true,
        downloadAllowed: false,
        nextAction: candidate.nextAction,
        sourceRuns: 0,
        sourceUrls: [],
        buckets: [],
        creators: [],
      }
      current.sourceRuns += 1
      current.downloadAllowed = current.downloadAllowed || candidate.downloadAllowed === true
      current.metadataOnly = current.metadataOnly && candidate.metadataOnly !== false
      current.sourceUrls = [...new Set([...current.sourceUrls, candidate.sourceUrl].filter(Boolean))].slice(0, 5)
      current.buckets = [...new Set([...current.buckets, sourceRunBucketLabel(candidate.bucketId)].filter(Boolean))].slice(0, 4)
      current.creators = [...new Set([...current.creators, candidate.creator].filter(Boolean))].slice(0, 4)
      candidatesByUrl.set(key, current)
    }
  }

  const topCandidates = [...candidatesByUrl.values()].sort((left, right) =>
    number(right.sourceRuns, 0) - number(left.sourceRuns, 0) ||
    text(left.resourceKind).localeCompare(text(right.resourceKind)) ||
    text(left.host).localeCompare(text(right.host)) ||
    text(left.label || left.url).localeCompare(text(right.label || right.url))
  )
  const kindCounts = topCandidates.reduce((acc, candidate) => {
    const key = text(candidate.resourceKind || 'unknown')
    acc[key] = number(acc[key], 0) + 1
    return acc
  }, {})

  return {
    status: topCandidates.length ? 'ready' : 'empty',
    candidateCount,
    uniqueCandidateCount: topCandidates.length,
    kindCounts,
    downloadAllowedCount: topCandidates.filter(candidate => candidate.downloadAllowed === true).length,
    unsafeSideEffectRows,
    topCandidates: topCandidates.slice(0, 12),
    rawArtifactPathsReturned: false,
    plainEnglish: 'File/download links are reviewable metadata only. The source browser records URL/host/label/type and keeps actual downloads blocked until a separate file reader policy exists.',
    nextAction: 'Use this queue to decide which public docs/templates should move to a governed file/document reader; installers and archives stay blocked unless explicitly sandboxed.',
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
  let fileResourceCandidates = 0
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
    const fileCandidates = fileResourceCandidatesForMetadata(metadata)
    fileResourceCandidates += fileCandidates.length
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
      fileResourceCandidates: 0,
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
    bucket.fileResourceCandidates += fileCandidates.length
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
    fileResourceCandidates,
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
    fileResourceReadback: buildFileResourceReadback(rows),
    plainEnglish: 'Saved source-browser evidence is summarized here. Full raw artifacts stay in the source-run ledger; this preview keeps the Dev page fast while preserving counts and provenance.',
  }
}
