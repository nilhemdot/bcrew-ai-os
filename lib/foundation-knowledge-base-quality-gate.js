export const KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID = 'KNOWLEDGE-BASE-QUALITY-GATE-001'
export const KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY = 'knowledge-base-quality-gate-v1'
export const KNOWLEDGE_BASE_QUALITY_GATE_PLAN_PATH = 'docs/process/knowledge-base-quality-gate-001-plan.md'
export const KNOWLEDGE_BASE_QUALITY_GATE_APPROVAL_PATH = 'docs/process/approvals/KNOWLEDGE-BASE-QUALITY-GATE-001.json'
export const KNOWLEDGE_BASE_QUALITY_GATE_SCRIPT_PATH = 'scripts/process-knowledge-base-quality-gate-check.mjs'
export const KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-knowledge-base-quality-gate-closeout.md'
export const KNOWLEDGE_BASE_QUALITY_GATE_SPRINT_ID = 'knowledge-base-quality-gate-2026-05-17'

export const KNOWLEDGE_BASE_QUALITY_GATE_CHANGED_FILES = [
  'lib/foundation-knowledge-base-quality-gate.js',
  'scripts/process-knowledge-base-quality-gate-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'docs/process/knowledge-base-quality-gate-001-plan.md',
  'docs/process/approvals/KNOWLEDGE-BASE-QUALITY-GATE-001.json',
  'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-knowledge-base-quality-gate-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const KNOWLEDGE_BASE_QUALITY_GATE_PROOF_COMMANDS = [
  'node --check lib/foundation-knowledge-base-quality-gate.js lib/foundation-intelligence-audit-verifier.js scripts/process-knowledge-base-quality-gate-check.mjs scripts/foundation-verify.mjs',
  'npm run process:knowledge-base-quality-gate-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:ship-check -- --card=KNOWLEDGE-BASE-QUALITY-GATE-001 --planApprovalRef=docs/process/approvals/KNOWLEDGE-BASE-QUALITY-GATE-001.json --closeoutKey=knowledge-base-quality-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=KNOWLEDGE-BASE-QUALITY-GATE-001 --closeoutKey=knowledge-base-quality-gate-v1',
  'npm run process:foundation-ship -- --card=KNOWLEDGE-BASE-QUALITY-GATE-001 --planApprovalRef=docs/process/approvals/KNOWLEDGE-BASE-QUALITY-GATE-001.json --closeoutKey=knowledge-base-quality-gate-v1 --commitRef=HEAD',
]

export const KNOWLEDGE_BASE_QUALITY_GATE_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No compiled KB page writes, query index writes, vector table writes, atom creation, Research Inbox writes, or backlog mutation from extracted content.',
  'No auth-required or paid extraction without Steve approval.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
  'Do not mutate Google Drive permissions.',
  'No live Agent Feedback auto-send.',
]

export const KNOWLEDGE_BASE_QUALITY_GATE_RULE_IDS = [
  'frontmatter_required',
  'citations_source_ids_required',
  'freshness_not_stale_or_fuzzy',
  'contradictions_resolved',
  'page_size_budget',
  'orphan_page_blocked',
  'privacy_tier_allowed',
  'unsourced_doctrine_blocked',
]

const PRIVACY_TIER_RANK = {
  public: 0,
  internal: 1,
  restricted: 2,
  owner_private: 3,
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function toDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addViolation(violations, ruleId, pageId, detail = '') {
  violations.push({ ruleId, pageId: pageId || 'missing-page-id', detail })
}

function hasCitationForClaim(claim = {}, citations = []) {
  if (!claim.sourceId || !claim.citationId) return false
  return citations.some(citation =>
    citation?.id === claim.citationId &&
      citation?.sourceId === claim.sourceId &&
      text(citation?.url || citation?.artifactId || citation?.evidenceId),
  )
}

export function buildKnowledgeBaseQualityGate(overrides = {}) {
  return {
    cardId: KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
    closeoutKey: KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
    status: 'ready',
    ownerLayer: 'Foundation',
    proposalOnly: true,
    implementationWritesStarted: false,
    liveExtractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    policy: {
      now: '2026-05-17T23:20:00.000-04:00',
      maxPageChars: 12000,
      maxClaims: 80,
      maxAgentConsumptionTier: 'restricted',
      requireFrontmatterFields: ['pageId', 'title', 'owner', 'sourceIds', 'privacyTier', 'compilerVersion', 'lastCompiledAt', 'staleAfter'],
      requireCitationPerClaim: true,
      allowRootOrphans: true,
    },
    pages: [
      {
        frontmatter: {
          pageId: 'kb-karpathy-llm-wiki-pattern',
          title: 'Karpathy LLM wiki pattern',
          owner: 'Foundation',
          sourceIds: ['SRC-BUILD-INTEL-KARPATHY-KB-001'],
          privacyTier: 'internal',
          compilerVersion: 'kb-compiler-v1',
          lastCompiledAt: '2026-05-17T22:00:00.000-04:00',
          staleAfter: '2026-06-17T22:00:00.000-04:00',
        },
        pageRole: 'root',
        linkedFrom: [],
        linksTo: ['kb-quality-loop'],
        citations: [
          {
            id: 'cite-1',
            sourceId: 'SRC-BUILD-INTEL-KARPATHY-KB-001',
            url: 'https://example.invalid/karpathy-kb-source',
            capturedAt: '2026-05-17T21:00:00.000-04:00',
          },
        ],
        claims: [
          {
            id: 'claim-1',
            text: 'Compiled markdown knowledge needs source-backed citations before agents answer from it.',
            claimType: 'doctrine',
            sourceId: 'SRC-BUILD-INTEL-KARPATHY-KB-001',
            citationId: 'cite-1',
          },
        ],
        contradictions: [],
        content: 'Compiled markdown knowledge needs source-backed citations before agents answer from it.',
      },
    ],
    notNextBoundaries: KNOWLEDGE_BASE_QUALITY_GATE_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateKnowledgeBaseQualityGate(gate = buildKnowledgeBaseQualityGate()) {
  const violations = []
  const policy = gate.policy || {}
  const now = toDate(policy.now) || new Date('2026-05-17T23:20:00.000-04:00')
  const requiredFrontmatterFields = list(policy.requireFrontmatterFields)
  const maxPageChars = Number(policy.maxPageChars) || 12000
  const maxClaims = Number(policy.maxClaims) || 80
  const maxTierRank = PRIVACY_TIER_RANK[policy.maxAgentConsumptionTier] ?? PRIVACY_TIER_RANK.restricted
  const pages = list(gate.pages)

  if (gate.ownerLayer !== 'Foundation') addViolation(violations, 'foundation_owner_required', gate.cardId, gate.ownerLayer || 'missing')
  if (gate.proposalOnly !== true) addViolation(violations, 'proposal_only_required', gate.cardId, String(gate.proposalOnly))
  if (gate.implementationWritesStarted === true) addViolation(violations, 'compiled_write_started', gate.cardId, 'implementation writes are not approved')
  if (gate.liveExtractionStarted === true) addViolation(violations, 'live_extraction_started', gate.cardId, 'live extraction is not approved')
  if (gate.modelCallsStarted === true) addViolation(violations, 'model_call_started', gate.cardId, 'model calls are not approved')
  if (gate.externalWritesStarted === true) addViolation(violations, 'external_write_started', gate.cardId, 'external writes are not approved')
  if (!pages.length) addViolation(violations, 'compiled_pages_required_for_gate_fixture', gate.cardId, 'quality gate must be proven with synthetic compiled pages')

  for (const page of pages) {
    const frontmatter = page?.frontmatter || {}
    const pageId = text(frontmatter.pageId || page?.pageId)
    const citations = list(page?.citations)
    const claims = list(page?.claims)
    const sourceIds = list(frontmatter.sourceIds)

    for (const field of requiredFrontmatterFields) {
      const value = frontmatter[field]
      if (Array.isArray(value) ? value.length === 0 : !text(value)) {
        addViolation(violations, 'frontmatter_required', pageId, `missing ${field}`)
      }
    }

    if (!sourceIds.length || !citations.length) {
      addViolation(violations, 'citations_source_ids_required', pageId, 'missing source IDs or citations')
    }
    for (const claim of claims) {
      if (!hasCitationForClaim(claim, citations) || !sourceIds.includes(claim.sourceId)) {
        addViolation(violations, 'citations_source_ids_required', pageId, `claim ${claim?.id || 'missing'} lacks a matching citation/source ID`)
      }
      if (claim?.claimType === 'doctrine' && !hasCitationForClaim(claim, citations)) {
        addViolation(violations, 'unsourced_doctrine_blocked', pageId, `doctrine claim ${claim?.id || 'missing'} is unsourced`)
      }
    }

    const staleAfter = toDate(frontmatter.staleAfter)
    const lastCompiledAt = toDate(frontmatter.lastCompiledAt)
    if (!staleAfter || !lastCompiledAt || staleAfter <= now || /soon|eventual|periodic|fuzzy/i.test(text(frontmatter.freshnessExpectation))) {
      addViolation(violations, 'freshness_not_stale_or_fuzzy', pageId, frontmatter.staleAfter || frontmatter.freshnessExpectation || 'missing freshness')
    }

    const unresolvedContradictions = list(page?.contradictions).filter(item => item?.status !== 'resolved')
    if (unresolvedContradictions.length) {
      addViolation(violations, 'contradictions_resolved', pageId, `${unresolvedContradictions.length} unresolved contradiction(s)`)
    }

    if (text(page?.content).length > maxPageChars || claims.length > maxClaims) {
      addViolation(violations, 'page_size_budget', pageId, `chars=${text(page?.content).length} claims=${claims.length}`)
    }

    const linkedFrom = list(page?.linkedFrom)
    if (page?.pageRole !== 'root' && linkedFrom.length === 0) {
      addViolation(violations, 'orphan_page_blocked', pageId, 'non-root page has no inbound link')
    }

    const privacyTier = text(frontmatter.privacyTier)
    const privacyRank = PRIVACY_TIER_RANK[privacyTier]
    if (privacyRank === undefined || privacyRank > maxTierRank || page?.agentAccessible === true && privacyRank > PRIVACY_TIER_RANK.internal) {
      addViolation(violations, 'privacy_tier_allowed', pageId, privacyTier || 'missing')
    }
  }

  const ruleIds = new Set(violations.map(violation => violation.ruleId))
  return {
    ok: violations.length === 0,
    status: violations.length ? 'fail_closed' : 'pass',
    violations,
    summary: {
      pageCount: pages.length,
      violationCount: violations.length,
      failedRuleIds: [...ruleIds],
      ruleCount: KNOWLEDGE_BASE_QUALITY_GATE_RULE_IDS.length,
      proposalOnly: gate.proposalOnly === true,
      liveExtractionStarted: gate.liveExtractionStarted === true,
      modelCallsStarted: gate.modelCallsStarted === true,
      externalWritesStarted: gate.externalWritesStarted === true,
    },
  }
}

export function buildKnowledgeBaseQualityGateDogfoodProof() {
  const healthy = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate())
  const missingFrontmatter = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    pages: [{ ...buildKnowledgeBaseQualityGate().pages[0], frontmatter: { title: 'Missing frontmatter fields' } }],
  }))
  const missingCitation = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    pages: [{ ...buildKnowledgeBaseQualityGate().pages[0], citations: [], claims: [{ id: 'claim-x', claimType: 'doctrine', sourceId: 'SRC-X', citationId: 'missing' }] }],
  }))
  const staleFreshness = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    pages: [{ ...buildKnowledgeBaseQualityGate().pages[0], frontmatter: { ...buildKnowledgeBaseQualityGate().pages[0].frontmatter, staleAfter: '2026-05-01T00:00:00.000-04:00' } }],
  }))
  const contradiction = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    pages: [{ ...buildKnowledgeBaseQualityGate().pages[0], contradictions: [{ id: 'contradiction-1', status: 'open' }] }],
  }))
  const oversized = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    pages: [{ ...buildKnowledgeBaseQualityGate().pages[0], content: 'x'.repeat(13000) }],
  }))
  const orphan = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    pages: [{ ...buildKnowledgeBaseQualityGate().pages[0], pageRole: 'leaf', linkedFrom: [] }],
  }))
  const privacyViolation = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    pages: [{ ...buildKnowledgeBaseQualityGate().pages[0], agentAccessible: true, frontmatter: { ...buildKnowledgeBaseQualityGate().pages[0].frontmatter, privacyTier: 'owner_private' } }],
  }))
  const liveRun = evaluateKnowledgeBaseQualityGate(buildKnowledgeBaseQualityGate({
    liveExtractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
  }))

  const rejected = {
    missingFrontmatter: missingFrontmatter.ok === false,
    missingCitation: missingCitation.ok === false,
    staleFreshness: staleFreshness.ok === false,
    contradiction: contradiction.ok === false,
    oversized: oversized.ok === false,
    orphan: orphan.ok === false,
    privacyViolation: privacyViolation.ok === false,
    liveRun: liveRun.ok === false,
  }

  return {
    ok: healthy.ok === true && Object.values(rejected).every(Boolean),
    healthy,
    rejectedCases: rejected,
    invariant: 'Valid synthetic compiled pages pass; missing frontmatter, missing citations/source IDs, stale freshness, contradictions, oversized pages, orphan pages, privacy violations, unsourced doctrine, and live runs fail closed.',
  }
}
