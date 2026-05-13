export const ATOM_FLOW_AUTO_DEMOTION_CARD_ID = 'ATOM-FLOW-AUTO-DEMOTION-001'
export const ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY = 'atom-flow-auto-demotion-v1'
export const ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH = 'docs/process/atom-flow-auto-demotion-001-plan.md'
export const ATOM_FLOW_AUTO_DEMOTION_APPROVAL_PATH = 'docs/process/approvals/ATOM-FLOW-AUTO-DEMOTION-001.json'
export const ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH = 'scripts/process-atom-flow-auto-demotion-check.mjs'
export const DEFAULT_ATOM_FLOW_WINDOW_HOURS = 48

function normalizeText(value) {
  return String(value || '').trim()
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function parseDate(value) {
  const text = normalizeText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildAtomFlowStatus({
  sourceId = '',
  extractedOk = false,
  activeAtoms = 0,
  atomCandidateSignals = 0,
  latestAtomAt = null,
  now = new Date(),
  windowHours = DEFAULT_ATOM_FLOW_WINDOW_HOURS,
} = {}) {
  const normalizedWindowHours = Math.max(1, toFiniteNumber(windowHours, DEFAULT_ATOM_FLOW_WINDOW_HOURS))
  const normalizedNow = parseDate(now) || new Date()
  const normalizedLatestAtomAt = parseDate(latestAtomAt)
  const normalizedActiveAtoms = Math.max(0, toFiniteNumber(activeAtoms, 0))
  const normalizedCandidateSignals = Math.max(0, toFiniteNumber(atomCandidateSignals, 0))
  const sourceLabel = normalizeText(sourceId) || 'unknown source'

  if (!extractedOk) {
    return {
      sourceId: sourceLabel,
      status: 'not_applicable',
      demoteAtomized: false,
      windowHours: normalizedWindowHours,
      activeAtoms: normalizedActiveAtoms,
      atomCandidateSignals: normalizedCandidateSignals,
      latestAtomAt: normalizedLatestAtomAt?.toISOString?.() || null,
      ageHours: null,
      reason: 'Source is not extracted yet, so promoted atom flow is not expected.',
    }
  }

  if (normalizedActiveAtoms <= 0) {
    return {
      sourceId: sourceLabel,
      status: 'stale',
      demoteAtomized: true,
      windowHours: normalizedWindowHours,
      activeAtoms: normalizedActiveAtoms,
      atomCandidateSignals: normalizedCandidateSignals,
      latestAtomAt: null,
      ageHours: null,
      reason: `${sourceLabel} is extracted but has no promoted intelligence_atoms in the atom-flow window.`,
    }
  }

  if (!normalizedLatestAtomAt) {
    return {
      sourceId: sourceLabel,
      status: 'stale',
      demoteAtomized: true,
      windowHours: normalizedWindowHours,
      activeAtoms: normalizedActiveAtoms,
      atomCandidateSignals: normalizedCandidateSignals,
      latestAtomAt: null,
      ageHours: null,
      reason: `${sourceLabel} has promoted atoms, but the latest atom timestamp is missing.`,
    }
  }

  const ageHours = Math.max(0, (normalizedNow.getTime() - normalizedLatestAtomAt.getTime()) / 36e5)
  if (ageHours > normalizedWindowHours) {
    return {
      sourceId: sourceLabel,
      status: 'stale',
      demoteAtomized: true,
      windowHours: normalizedWindowHours,
      activeAtoms: normalizedActiveAtoms,
      atomCandidateSignals: normalizedCandidateSignals,
      latestAtomAt: normalizedLatestAtomAt.toISOString(),
      ageHours: Number(ageHours.toFixed(2)),
      reason: `${sourceLabel} latest promoted atom is ${Number(ageHours.toFixed(1))}h old, outside the ${normalizedWindowHours}h atom-flow window.`,
    }
  }

  return {
    sourceId: sourceLabel,
    status: 'healthy',
    demoteAtomized: false,
    windowHours: normalizedWindowHours,
    activeAtoms: normalizedActiveAtoms,
    atomCandidateSignals: normalizedCandidateSignals,
    latestAtomAt: normalizedLatestAtomAt.toISOString(),
    ageHours: Number(ageHours.toFixed(2)),
    reason: `${sourceLabel} has fresh promoted atom flow inside the ${normalizedWindowHours}h window.`,
  }
}

export function buildSyntheticAtomFlowAutoDemotionProof() {
  const now = '2026-05-13T02:30:00.000Z'
  const stale = buildAtomFlowStatus({
    sourceId: 'SRC-STALE-001',
    extractedOk: true,
    activeAtoms: 2,
    latestAtomAt: '2026-05-10T02:30:00.000Z',
    now,
    windowHours: 24,
  })
  const restored = buildAtomFlowStatus({
    sourceId: 'SRC-RESTORED-001',
    extractedOk: true,
    activeAtoms: 2,
    latestAtomAt: '2026-05-13T02:00:00.000Z',
    now,
    windowHours: 24,
  })
  const missingPromotedAtoms = buildAtomFlowStatus({
    sourceId: 'SRC-CANDIDATE-ONLY-001',
    extractedOk: true,
    activeAtoms: 0,
    atomCandidateSignals: 4,
    now,
    windowHours: 24,
  })
  const notApplicable = buildAtomFlowStatus({
    sourceId: 'SRC-NOT-EXTRACTED-001',
    extractedOk: false,
    activeAtoms: 0,
    now,
    windowHours: 24,
  })

  return {
    ok: stale.status === 'stale' &&
      stale.demoteAtomized === true &&
      restored.status === 'healthy' &&
      restored.demoteAtomized === false &&
      missingPromotedAtoms.status === 'stale' &&
      missingPromotedAtoms.demoteAtomized === true &&
      notApplicable.status === 'not_applicable' &&
      notApplicable.demoteAtomized === false,
    stale,
    restored,
    missingPromotedAtoms,
    notApplicable,
  }
}
