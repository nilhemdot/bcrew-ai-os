import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import {
  createDecision,
  getFoundationSnapshot,
  initFoundationDb,
} from './foundation-db.js'
import { classifyPersonalWorkspacePath } from './foundation-personal-workspace-boundary.js'

const execFile = promisify(execFileCallback)

export const CANONICAL_DECISION_CATEGORIES = ['strategy', 'system', 'execution', 'people']
export const DECISION_AUTO_EMIT_VERBS = ['pin', 'park', 'defer', 'pivot', 'lock', 'disable', 'adopt', 'override', 'sequence_change']
export const DECISION_AUTO_EMIT_SOURCE = 'decision-auto-emit'
export const DECISION_AUTO_EMIT_APPROVED_SOURCE_SURFACES = [
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-log.js',
]

const VERB_PATTERNS = [
  { verb: 'pin', pattern: /\bpin(?:ned|s|ning)?\b/i },
  { verb: 'park', pattern: /\bpark(?:ed|s|ing)?\b/i },
  { verb: 'defer', pattern: /\bdefer(?:red|s|ring)?\b/i },
  { verb: 'pivot', pattern: /\bpivot(?:ed|s|ing)?\b/i },
  { verb: 'lock', pattern: /\block(?:ed|s|ing)?\b/i },
  { verb: 'disable', pattern: /\bdisable(?:d|s|ing)?\b/i },
  { verb: 'adopt', pattern: /\badopt(?:ed|s|ing)?\b/i },
  { verb: 'override', pattern: /\boverride(?:d|s|ing)?\b/i },
  { verb: 'sequence_change', pattern: /\b(?:sequence[-\s]change|change(?:d|s|ing)?\s+sequence|resequence(?:d|s|ing)?|move(?:d|s|ing)?\s+.+?\s+(?:before|after)\s+.+?)(?:[.;,]|$)/i },
  { verb: 'use_over', pattern: /\buse\s+(.+?)\s+over\s+(.+?)(?:[.;,]|$)/i },
]

const SYNTHETIC_DECISION_TEXT = [
  'Adopt evidence-based process gates before action-loop work.',
  'Use Strategy Hub route review over generic Action Router visibility for strategic routes.',
  'Park broad corpus expansion until the Foundation enforcement hit list is complete.',
  'Override the old manual closeout habit with ship-gate proof.',
  'Sequence change: move Foundation control completion before Phase G Track 2.',
].join('\n')

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function stripListPrefix(value) {
  return normalizeText(value)
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
}

function sentenceCase(value) {
  const text = normalizeText(value)
  if (!text) return ''
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function cleanDecisionTitle(value) {
  return sentenceCase(stripListPrefix(value)
    .replace(/^decision\s*:\s*/i, '')
    .replace(/^commit\s*:\s*/i, '')
    .replace(/\s+#\d+\b/g, '')
    .replace(/\s+\([^)]+\)\s*$/g, '')
    .replace(/[.]+$/g, ''))
}

export function normalizeDecisionTitle(value) {
  return cleanDecisionTitle(value)
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function containsAny(text, words) {
  const haystack = String(text || '').toLowerCase()
  return words.some(word => haystack.includes(word))
}

export function classifyDecisionCategory(text) {
  const normalized = String(text || '').toLowerCase()
  if (containsAny(normalized, ['strategy', 'strategic', 'hub', 'north star', 'quarter', 'q2', 'bhag'])) {
    return { category: 'strategy', inferred: true }
  }
  if (containsAny(normalized, ['person', 'people', 'owner', 'role', 'user', 'access', 'steve', 'agent'])) {
    return { category: 'people', inferred: true }
  }
  if (containsAny(normalized, ['apply', 'route', 'review', 'cadence', 'workflow', 'process', 'execution', 'meeting'])) {
    return { category: 'execution', inferred: true }
  }
  return { category: 'system', inferred: true }
}

function candidateSummary(title, verb) {
  if (verb === 'use_over') return `Proposed decision found from a "Use X over Y" statement: ${title}.`
  return `Proposed decision found from a "${verb}" statement: ${title}.`
}

function candidateRationale(input) {
  const source = input.commitSha
    ? `commit ${input.commitSha.slice(0, 12)}`
    : input.sourceLabel || 'synthetic or provided text'
  return `The auto-emitter found decision language in ${source}. Human review is still required before locking this decision.`
}

function buildEvidenceNote({ category, categoryInferred, line, commitSha, sourceLabel }) {
  const source = commitSha ? `commit ${commitSha}` : sourceLabel || 'provided text'
  const cleanLine = normalizeText(line).replace(/[.]+$/g, '')
  const categoryNote = categoryInferred
    ? `Category was inferred as ${category} from the existing taxonomy.`
    : `Category is ${category}.`
  return `${categoryNote} Source evidence: ${source}: "${cleanLine}".`
}

function lineLooksLikeDecision(line) {
  const normalized = normalizeText(line)
  if (!normalized) return false
  if (/^merge\b/i.test(normalized)) return false
  if (/^revert\b/i.test(normalized)) return false
  return VERB_PATTERNS.some(definition => definition.pattern.test(normalized))
}

function splitDecisionSegments(rawLine) {
  return String(rawLine || '')
    .split(/(?<=[.!?])\s+/)
    .map(stripListPrefix)
    .filter(Boolean)
}

function detectVerb(line) {
  for (const definition of VERB_PATTERNS) {
    if (definition.pattern.test(line)) return definition.verb
  }
  return null
}

function titleFromLine(line, verb) {
  const cleaned = stripListPrefix(line)
  if (verb === 'use_over') {
    const match = cleaned.match(/\buse\s+(.+?)\s+over\s+(.+?)(?:[.;,]|$)/i)
    if (match) return cleanDecisionTitle(`Use ${match[1]} over ${match[2]}`)
  }
  return cleanDecisionTitle(cleaned)
}

function buildDedupeKey(commitSha, normalizedTitle, fallbackSource) {
  const sourceKey = commitSha ? commitSha.toLowerCase() : normalizeDecisionTitle(fallbackSource || 'provided-text')
  return `${sourceKey}:${normalizedTitle}`
}

function normalizeRelativePath(value, cwd = process.cwd()) {
  const text = normalizeText(value).replace(/\\/g, '/')
  if (!text) return ''
  if (path.isAbsolute(text)) return path.relative(cwd, text).replace(/\\/g, '/')
  return text.replace(/^\.\//, '')
}

function assertTextFileAllowed(textFile, cwd = process.cwd()) {
  const relativePath = normalizeRelativePath(textFile, cwd)
  const privateRule = classifyPersonalWorkspacePath(relativePath)
  if (privateRule) {
    throw new Error(`Decision auto-emit refuses private workspace text files: ${relativePath}. Use an approved tracked source surface instead.`)
  }
}

export function extractDecisionCandidatesFromText(input = {}) {
  const text = String(input.text || '')
  const commitSha = normalizeText(input.commitSha)
  const sourceLabel = normalizeText(input.sourceLabel) || (commitSha ? `commit ${commitSha}` : 'provided text')
  const lines = text.split(/\r?\n/)
  const candidates = []
  const seen = new Set()

  lines.forEach((rawLine, index) => {
    for (const line of splitDecisionSegments(rawLine)) {
      if (!lineLooksLikeDecision(line)) continue

      const verb = detectVerb(line)
      const title = titleFromLine(line, verb)
      const normalizedTitle = normalizeDecisionTitle(title)
      if (!title || !normalizedTitle) continue

      const { category, inferred } = classifyDecisionCategory(`${title} ${line}`)
      const dedupeKey = buildDedupeKey(commitSha, normalizedTitle, sourceLabel)
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      candidates.push({
        title,
        normalizedTitle,
        category,
        status: 'proposed',
        verb,
        summary: candidateSummary(title, verb),
        rationale: candidateRationale({ commitSha, sourceLabel }),
        sourceRef: commitSha ? `${DECISION_AUTO_EMIT_SOURCE}:${commitSha}` : `${DECISION_AUTO_EMIT_SOURCE}:${normalizeDecisionTitle(sourceLabel)}`,
        contextRef: `${DECISION_AUTO_EMIT_SOURCE}:${dedupeKey}`,
        evidenceNotes: buildEvidenceNote({ category, categoryInferred: inferred, line, commitSha, sourceLabel }),
        metadata: {
          source: DECISION_AUTO_EMIT_SOURCE,
          commitSha: commitSha || null,
          sourceLabel,
          lineNumber: index + 1,
          verb,
          dedupeKey,
          categoryInferred: inferred,
        },
      })
    }
  })

  return candidates
}

async function git(args, options = {}) {
  const { stdout } = await execFile('git', args, {
    cwd: options.cwd || process.cwd(),
    maxBuffer: 1024 * 1024 * 8,
  })
  return String(stdout || '').trim()
}

async function readCommit(commitRef, options = {}) {
  const format = '%H%n%B'
  const output = await git(['show', '-s', `--format=${format}`, commitRef], options)
  const [shaLine, ...bodyLines] = output.split(/\r?\n/)
  return {
    commitSha: normalizeText(shaLine),
    text: bodyLines.join('\n').trim(),
    sourceLabel: `commit ${normalizeText(shaLine).slice(0, 12)}`,
  }
}

async function listCommits(fromRef, toRef, options = {}) {
  const range = fromRef ? `${fromRef}..${toRef || 'HEAD'}` : (toRef || 'HEAD')
  const output = await git(['rev-list', '--reverse', range], options)
  return output ? output.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : []
}

export async function collectDecisionAutoEmitInputs(options = {}) {
  if (options.synthetic) {
    return [{
      text: SYNTHETIC_DECISION_TEXT,
      sourceLabel: 'synthetic decision auto-emit proof',
      commitSha: '',
      synthetic: true,
    }]
  }

  if (options.foundationSources) {
    const cwd = options.cwd || process.cwd()
    return Promise.all(DECISION_AUTO_EMIT_APPROVED_SOURCE_SURFACES.map(async relativePath => ({
      text: await fs.readFile(path.join(cwd, relativePath), 'utf8'),
      sourceLabel: relativePath,
      commitSha: normalizeText(options.commitSha),
      approvedSourceSurface: true,
    })))
  }

  if (options.textFile) {
    assertTextFileAllowed(options.textFile, options.cwd || process.cwd())
    return [{
      text: await fs.readFile(options.textFile, 'utf8'),
      sourceLabel: options.sourceLabel || options.textFile,
      commitSha: normalizeText(options.commitSha),
    }]
  }

  if (options.text) {
    return [{
      text: options.text,
      sourceLabel: options.sourceLabel || 'provided text',
      commitSha: normalizeText(options.commitSha),
    }]
  }

  if (options.fromRef || options.toRef) {
    const shas = await listCommits(options.fromRef, options.toRef || 'HEAD', options)
    return Promise.all(shas.map(sha => readCommit(sha, options)))
  }

  return [await readCommit(options.commitRef || 'HEAD', options)]
}

export async function scanDecisionAutoEmitCandidates(options = {}) {
  const inputs = await collectDecisionAutoEmitInputs(options)
  const candidates = inputs.flatMap(input => extractDecisionCandidatesFromText(input))
  const byDedupeKey = new Map()
  for (const candidate of candidates) {
    byDedupeKey.set(candidate.metadata.dedupeKey, candidate)
  }
  return {
    generatedAt: new Date().toISOString(),
    mode: options.synthetic ? 'synthetic' : 'scan',
    inputsScanned: inputs.length,
    candidateCount: byDedupeKey.size,
    candidates: Array.from(byDedupeKey.values()),
  }
}

function existingDecisionByContext(decisions = []) {
  const map = new Map()
  for (const decision of decisions) {
    const contextRef = normalizeText(decision.contextRef)
    if (contextRef) map.set(contextRef, decision)
  }
  return map
}

export async function applyDecisionAutoEmitCandidates(candidates = [], options = {}) {
  if (options.synthetic) {
    throw new Error('Synthetic decision auto-emit mode is read-only. Run without --synthetic before applying.')
  }

  await initFoundationDb()
  const foundation = await getFoundationSnapshot()
  const existingByContext = existingDecisionByContext(foundation.decisions || [])
  const created = []
  const skipped = []

  for (const candidate of candidates) {
    const existing = existingByContext.get(candidate.contextRef)
    if (existing) {
      skipped.push({
        title: candidate.title,
        contextRef: candidate.contextRef,
        reason: `Already proposed as ${existing.id}.`,
        decisionId: existing.id,
      })
      continue
    }

    const decision = await createDecision({
      category: candidate.category,
      title: candidate.title,
      summary: candidate.summary,
      rationale: candidate.rationale,
      sourceRef: candidate.sourceRef,
      contextRef: candidate.contextRef,
      evidenceNotes: candidate.evidenceNotes,
      decisionOwner: options.decisionOwner || null,
      confirmedBy: null,
      participantNames: [],
      supersedesIds: [],
    }, options.actor || 'decision-auto-emit')

    existingByContext.set(candidate.contextRef, decision)
    if (decision.status !== 'proposed') {
      throw new Error(`Decision auto-emit expected proposed-only write mode, but ${decision.id} was ${decision.status}.`)
    }
    created.push({
      decisionId: decision.id,
      title: decision.title,
      category: decision.category,
      status: decision.status,
      contextRef: decision.contextRef,
    })
  }

  return {
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
  }
}

export function validateDecisionAutoEmitApplySafety(applyResult = {}) {
  const created = Array.isArray(applyResult.created) ? applyResult.created : []
  const unsafe = created.filter(item => item.status && item.status !== 'proposed')
  return {
    ok: unsafe.length === 0,
    proposedOnly: unsafe.length === 0,
    unsafeCount: unsafe.length,
  }
}

export async function buildDecisionAutoEmitSafetyProof(options = {}) {
  const cwd = options.cwd || process.cwd()
  const syntheticScan = await scanDecisionAutoEmitCandidates({ synthetic: true, cwd })
  const duplicateDecisionCandidates = extractDecisionCandidatesFromText({
    text: 'Adopt evidence-based gates before feature work.\nAdopt evidence-based gates before feature work.',
    sourceLabel: 'synthetic duplicate proof',
  })
  let privateSourceBlocked = false
  try {
    await collectDecisionAutoEmitInputs({
      textFile: 'memory/synthetic-private-source.md',
      cwd,
    })
  } catch (error) {
    privateSourceBlocked = /private workspace text files/i.test(error?.message || '')
  }
  const proposedOnly = validateDecisionAutoEmitApplySafety({
    created: [{ status: 'proposed' }],
  })
  const lockedRejected = validateDecisionAutoEmitApplySafety({
    created: [{ status: 'locked' }],
  })

  return {
    ok: syntheticScan.candidateCount >= 5 &&
      duplicateDecisionCandidates.length === 1 &&
      privateSourceBlocked &&
      proposedOnly.ok &&
      lockedRejected.ok === false,
    explicitLanguageOnly: true,
    syntheticCandidateCount: syntheticScan.candidateCount,
    duplicateCollapsed: duplicateDecisionCandidates.length === 1,
    privateSourceBlocked,
    proposedOnlyApplyMode: proposedOnly.ok,
    lockedApplyResultRejected: lockedRejected.ok === false,
    approvedSourceSurfaces: DECISION_AUTO_EMIT_APPROVED_SOURCE_SURFACES,
  }
}

export function buildDecisionAutoEmitSummary(scan, applyResult = null) {
  const categories = CANONICAL_DECISION_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0
    return acc
  }, {})
  for (const candidate of scan.candidates || []) {
    categories[candidate.category] = (categories[candidate.category] || 0) + 1
  }

  return {
    generatedAt: scan.generatedAt,
    mode: scan.mode,
    inputsScanned: scan.inputsScanned,
    candidateCount: scan.candidateCount,
    categories,
    applied: applyResult ? {
      createdCount: applyResult.createdCount,
      skippedCount: applyResult.skippedCount,
    } : null,
    approvedSourceSurfaces: DECISION_AUTO_EMIT_APPROVED_SOURCE_SURFACES,
  }
}
