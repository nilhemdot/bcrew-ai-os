export const BACKLOG_HYGIENE_CONTRACT_VERSION = 1
export const BACKLOG_HYGIENE_DEFAULT_STALE_EXECUTING_DAYS = 3
export const BACKLOG_HYGIENE_DONE_PROOF_REQUIRED_AFTER = '2026-04-27T00:00:00.000Z'
export const BACKLOG_HYGIENE_RUNTIME_SURFACE = 'Foundation > Runtime Health > Backlog Hygiene'

const doneLanguagePattern = /\b(done|closed|shipped|accepted|verified|proof complete|first slice done|v1 done|closed for v1)\b/i
const doneLanguageExclusions = /\b(remain(?:s|ing)? work|remains executing|remaining active work|not done|do not close|split completed|proof is now recorded|done card|done proof card)\b/i
const proofPattern = /(closed|done|accepted|shipped|verified|proof|foundation:verify|route|sample|commit|sha|npm run|docs\/|closeout)/i
const proofAnchorPattern = /(\b20\d{2}-\d{2}-\d{2}\b|proof|foundation:verify|route|sample|commit|sha|npm run|docs\/)/i
const scopedActivePattern = /\b(active now|currently active|currently running|is running|running now|is live|now live|actively being worked|same-session work)\b/i
const scopedParkingPattern = /\b(parked|not next|not built|not active|no same-session|returns to executing only|scoped follow-up|do not build)\b/i
const activeWorkPattern = /\b(active work|actively being worked|in progress|same-session|current proof run|current owner|currently|executing only for|do not close without|owner is actively working)\b/i
const processGatePattern = /\b(proof|acceptance|verifier|foundation:verify|npm run|closeout|scope|remaining work|done for v1|do not close)\b/i

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(from, to) {
  const fromDate = toDate(from)
  const toDateValue = toDate(to)
  if (!fromDate || !toDateValue) return null
  return Math.max(0, (toDateValue.getTime() - fromDate.getTime()) / 86400000)
}

function normalizeText(values) {
  return (Array.isArray(values) ? values : [values])
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join('\n')
}

function textExcerpt(value, maxLength = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

function hasCloseoutProof(card, closeoutIds = new Set()) {
  if (closeoutIds.has(card.id)) return true
  const text = normalizeText([card.source, card.nextAction, card.statusNote])
  return text.length >= 80 && proofPattern.test(text) && proofAnchorPattern.test(text)
}

function isDoneProofRequired(card, options = {}) {
  const requiredAfter = toDate(options.doneProofRequiredAfter || BACKLOG_HYGIENE_DONE_PROOF_REQUIRED_AFTER)
  const createdAt = toDate(card.createdAt)
  if (!requiredAfter || !createdAt) return true
  return createdAt >= requiredAfter
}

function createFinding({
  type,
  severity,
  card,
  issue,
  evidence,
  recommendedAction,
  synthetic = false,
}) {
  return {
    type,
    severity,
    cardId: card.id,
    title: card.title,
    lane: card.lane,
    priority: card.priority,
    updatedAt: card.updatedAt || card.createdAt || null,
    issue,
    evidence,
    recommendedAction,
    synthetic,
  }
}

function buildSyntheticStaleCard(generatedAt, staleExecutingDays) {
  const updatedAt = new Date(toDate(generatedAt).getTime() - ((staleExecutingDays + 1) * 86400000)).toISOString()
  return {
    id: 'SYNTHETIC-STALE-EXECUTING-001',
    title: 'Synthetic stale executing card',
    lane: 'executing',
    priority: 'P0',
    source: 'Synthetic backlog hygiene proof',
    summary: 'In-memory card used only to prove the hygiene probe catches stale executing work.',
    whyItMatters: 'Synthetic fixture proves the probe works without polluting the live backlog.',
    nextAction: 'This card intentionally has no current proof signal.',
    statusNote: 'Synthetic stale executing fixture for BACKLOG-HYGIENE-001.',
    createdAt: updatedAt,
    updatedAt,
    synthetic: true,
  }
}

export function buildBacklogHygieneSnapshot({
  backlogItems = [],
  closeouts = [],
  generatedAt = new Date().toISOString(),
  options = {},
} = {}) {
  const staleExecutingDays = Number.isFinite(Number(options.staleExecutingDays))
    ? Number(options.staleExecutingDays)
    : BACKLOG_HYGIENE_DEFAULT_STALE_EXECUTING_DAYS
  const includeSynthetic = Boolean(options.includeSynthetic)
  const closeoutIds = new Set((closeouts || []).flatMap(closeout => closeout.backlogIds || []))
  const items = includeSynthetic
    ? [...backlogItems, buildSyntheticStaleCard(generatedAt, staleExecutingDays)]
    : backlogItems
  const findings = []

  for (const card of items) {
    const lane = String(card.lane || '').trim()
    const priority = String(card.priority || '').trim()
    const text = normalizeText([card.title, card.summary, card.whyItMatters, card.nextAction, card.statusNote])
    const noteText = normalizeText([card.nextAction, card.statusNote])
    const ageDays = daysBetween(card.updatedAt || card.createdAt, generatedAt)

    if (lane === 'executing' && ageDays !== null && ageDays >= staleExecutingDays && !activeWorkPattern.test(noteText)) {
      findings.push(createFinding({
        type: 'stale_executing_card',
        severity: 'warning',
        card,
        issue: `${card.id} has been in executing for ${Math.floor(ageDays)} days without a current active-work signal.`,
        evidence: `Lane: executing. Updated: ${card.updatedAt || card.createdAt || 'unknown'}. Threshold: ${staleExecutingDays} days. Status note: ${textExcerpt(card.statusNote) || 'No status note.'}`,
        recommendedAction: 'Confirm active work, move it to scoped, move it to done with proof, or split completed proof into a done child card.',
        synthetic: Boolean(card.synthetic),
      }))
    }

    if (lane === 'done' && !hasCloseoutProof(card, closeoutIds)) {
      const required = isDoneProofRequired(card, options)
      findings.push(createFinding({
        type: 'done_without_closeout_proof',
        severity: required ? 'critical' : 'warning',
        card,
        issue: `${card.id} is done, but the status note does not show enough closeout proof.`,
        evidence: `Closeout-linked: ${closeoutIds.has(card.id) ? 'yes' : 'no'}. Status note: ${textExcerpt(card.statusNote) || 'No status note.'}`,
        recommendedAction: 'Add dated proof, a proof command, commit/route/sample/doc reference, or move the card out of done until proof exists.',
        synthetic: Boolean(card.synthetic),
      }))
    }

    if (lane === 'executing' && doneLanguagePattern.test(noteText) && !doneLanguageExclusions.test(noteText)) {
      findings.push(createFinding({
        type: 'executing_with_done_language',
        severity: 'warning',
        card,
        issue: `${card.id} is executing, but its note reads like completed work.`,
        evidence: `Status note: ${textExcerpt(card.statusNote) || 'No status note.'}`,
        recommendedAction: 'Move it to done with proof, or split the completed proof from the remaining active work.',
        synthetic: Boolean(card.synthetic),
      }))
    }

    if (lane === 'scoped' && scopedActivePattern.test(text) && !scopedParkingPattern.test(text)) {
      findings.push(createFinding({
        type: 'scoped_card_claims_active_work',
        severity: 'warning',
        card,
        issue: `${card.id} is scoped, but the copy sounds like work is already active.`,
        evidence: textExcerpt(noteText || text),
        recommendedAction: 'Move it to executing if work is active, or clarify that it is parked/scoped and not currently being worked.',
        synthetic: Boolean(card.synthetic),
      }))
    }

    if (priority === 'P0' && ['executing', 'scoped'].includes(lane)) {
      const missing = []
      if (!String(card.nextAction || '').trim()) missing.push('next action')
      if (!String(card.summary || '').trim()) missing.push('summary')
      if (!String(card.whyItMatters || '').trim()) missing.push('why it matters')
      if (!processGatePattern.test(noteText)) missing.push('proof or scope signal')
      if (missing.length) {
        findings.push(createFinding({
          type: 'missing_process_gate_fields',
          severity: 'warning',
          card,
          issue: `${card.id} is active P0 work but is missing process-gate clarity.`,
          evidence: `Missing: ${missing.join(', ')}.`,
          recommendedAction: 'Add scope, proof/acceptance language, and a clear next action before build work starts.',
          synthetic: Boolean(card.synthetic),
        }))
      }
    }

    if (lane === 'research' && ['P2', 'P3'].includes(priority) && !String(card.nextAction || '').trim()) {
      findings.push(createFinding({
        type: 'missing_process_gate_fields',
        severity: 'info',
        card,
        issue: `${card.id} is low-priority research without a next action.`,
        evidence: 'Research cards can stay loose, but a next action helps later triage.',
        recommendedAction: 'Add a one-line next action when this card becomes relevant.',
        synthetic: Boolean(card.synthetic),
      }))
    }
  }

  const severityCounts = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1
    return acc
  }, { critical: 0, warning: 0, info: 0 })
  const typeCounts = findings.reduce((acc, finding) => {
    acc[finding.type] = (acc[finding.type] || 0) + 1
    return acc
  }, {})
  const visibleFindings = findings
    .filter(finding => finding.severity !== 'info')
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 }
      return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
    })
    .slice(0, 12)

  return {
    contractVersion: BACKLOG_HYGIENE_CONTRACT_VERSION,
    generatedAt: toDate(generatedAt).toISOString(),
    surface: BACKLOG_HYGIENE_RUNTIME_SURFACE,
    policy: 'Read-only v1. Findings explain likely backlog drift; card movement still requires an explicit build/update.',
    thresholds: {
      staleExecutingDays,
      doneProofRequiredAfter: options.doneProofRequiredAfter || BACKLOG_HYGIENE_DONE_PROOF_REQUIRED_AFTER,
    },
    summary: {
      status: severityCounts.critical > 0 ? 'risk' : severityCounts.warning > 0 ? 'warning' : 'healthy',
      cardCount: backlogItems.length,
      findingCount: findings.length,
      visibleFindingCount: visibleFindings.length,
      criticalFindings: severityCounts.critical || 0,
      warningFindings: severityCounts.warning || 0,
      infoFindings: severityCounts.info || 0,
      syntheticFindings: findings.filter(finding => finding.synthetic).length,
      typeCounts,
    },
    findings,
    visibleFindings,
  }
}
