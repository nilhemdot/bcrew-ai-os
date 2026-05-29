export const SKOOL_SOURCE_SYSTEM_MAP_CARD_ID = 'SKOOL-SOURCE-SYSTEM-MAP-001'
export const SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY = 'skool-source-system-map-v1'
export const SKOOL_SOURCE_SYSTEM_MAP_PLAN_PATH = 'docs/process/skool-source-system-map-001-plan.md'
export const SKOOL_SOURCE_SYSTEM_MAP_SCRIPT_PATH = 'scripts/process-skool-source-system-map-check.mjs'
export const SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID = 'source-system:skool:source-system-map:v1'
export const SKOOL_SOURCE_ID = 'SRC-SKOOL-001'

export const SKOOL_SOURCE_SYSTEM_TARGET_FIXTURE = [
  {
    targetKey: 'skool-corpus-backfill',
    sourceId: SKOOL_SOURCE_ID,
    title: 'Skool corpus validation/backfill lane',
    status: 'blocked',
    runtimeMode: 'paused',
    inspectedCount: 0,
    archivedCount: 0,
    extractedCount: 0,
    metadata: {
      sourceNote: 'docs/source-notes/skool-corpus.md',
      blockedBy: 'Need approved export/API/admin path and content-use boundary. Blind scraping is blocked by policy risk.',
      backlogIds: ['SKOOL-001', 'WEB-CRAWLER-001', 'MULTIMODAL-EXTRACTOR-001'],
    },
  },
  {
    targetKey: 'mark-skool-premium-recordings',
    sourceId: SKOOL_SOURCE_ID,
    title: 'Mark Skool premium membership recordings',
    status: 'blocked',
    runtimeMode: 'paused',
    inspectedCount: 0,
    archivedCount: 0,
    extractedCount: 0,
    metadata: {
      url: 'https://www.skool.com/earlyaidopters/classroom/26269254?md=40b2005716c94833a5f4563d0f3c40f0',
      sourceKey: 'mark-skool-premium-recordings',
      requestedBy: 'Steve',
      accessBoundary: 'paid_auth_member_content',
      approvalRequired: true,
      noCrawlUntilApproved: true,
    },
  },
  {
    targetKey: 'mark-skool-claudeclaw-classroom',
    sourceId: SKOOL_SOURCE_ID,
    title: 'Mark Skool ClaudeClaw classroom',
    status: 'blocked',
    runtimeMode: 'paused',
    inspectedCount: 0,
    archivedCount: 0,
    extractedCount: 0,
    metadata: {
      url: 'https://www.skool.com/earlyaidopters/classroom/f1a72e71?md=e02d48da3b644170a9a8ab0624804102',
      sourceKey: 'mark-skool-claudeclaw-classroom',
      requestedBy: 'Steve',
      accessBoundary: 'paid_auth_member_content',
      approvalRequired: true,
      noCrawlUntilApproved: true,
    },
  },
  {
    targetKey: 'kia-ai-automations-skool-community-public-check',
    sourceId: SKOOL_SOURCE_ID,
    title: 'Kia AI Automations Skool community public-read check',
    status: 'planned',
    runtimeMode: 'manual',
    inspectedCount: 0,
    archivedCount: 0,
    extractedCount: 0,
    metadata: {
      sourceNote: 'docs/source-notes/kia-ai-automations-build-intel.md',
      suppliedBy: 'Steve 2026-05-23',
      publicReadCheckOnly: true,
      stopIfAuthRequired: true,
      noCommunityCrawl: true,
      noExternalWrites: true,
    },
  },
]

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function number(value) {
  return Number(value || 0)
}

function bool(value) {
  return value === true || value === 'true' || value === '1'
}

function parseMetadata(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeTarget(row = {}) {
  return {
    targetKey: text(row.targetKey || row.target_key),
    sourceId: text(row.sourceId || row.source_id || SKOOL_SOURCE_ID),
    title: text(row.title),
    lane: text(row.lane),
    targetType: text(row.targetType || row.target_type),
    status: text(row.status),
    priority: text(row.priority),
    runtimeMode: text(row.runtimeMode || row.runtime_mode),
    inspectedCount: number(row.inspectedCount || row.inspected_count),
    archivedCount: number(row.archivedCount || row.archived_count),
    extractedCount: number(row.extractedCount || row.extracted_count),
    metadata: parseMetadata(row.metadata),
  }
}

function normalizeItem(row = {}) {
  return {
    itemKey: text(row.itemKey || row.item_key),
    targetKey: text(row.targetKey || row.target_key),
    sourceId: text(row.sourceId || row.source_id || SKOOL_SOURCE_ID),
    itemType: text(row.itemType || row.item_type),
    status: text(row.status),
    artifactId: text(row.artifactId || row.artifact_id),
    metadata: parseMetadata(row.metadata),
  }
}

function hasPaidPrivateBoundary(target = {}) {
  const signal = `${target.targetKey} ${target.title} ${target.metadata?.accessBoundary || ''} ${target.metadata?.blockedBy || ''}`
  return /paid|private|member|auth/i.test(signal)
}

function hasPublicReadBoundary(target = {}) {
  return bool(target.metadata?.publicReadCheckOnly) || /public|free/i.test(`${target.targetKey} ${target.title}`)
}

function accessBoundaryForTarget(target = {}) {
  if (hasPaidPrivateBoundary(target)) return 'paid_auth_member_content'
  if (hasPublicReadBoundary(target)) return 'public_read_check_only'
  return 'access_path_audit_required'
}

function sourceStateForTarget(target = {}, itemCount = 0) {
  if (lower(target.status) === 'blocked') return 'blocked_by_boundary'
  if (itemCount > 0) return 'metadata_or_content_items_present'
  if (hasPublicReadBoundary(target)) return 'planned_public_metadata_only'
  return 'planned_source_map_only'
}

function nextActionForTarget(target = {}, itemCount = 0) {
  const boundary = accessBoundaryForTarget(target)
  if (boundary === 'paid_auth_member_content') {
    return 'Hold until Steve approves the exact paid/private Skool packet, content-use boundary, source session, and allowed artifacts.'
  }
  if (boundary === 'public_read_check_only') {
    return 'Create an exact public-read packet and run only the approved visible/session-ready Skool runner; stop on login, join, auth, paid, download, post, comment, or message surfaces.'
  }
  if (itemCount > 0) return 'Grade mapped items before any extraction.'
  return 'Complete access-path audit and link inventory before any Skool crawl or extraction.'
}

function summarizeTarget(target = {}, items = []) {
  const targetItems = list(items).filter(item => item.targetKey === target.targetKey)
  const artifactCount = targetItems.filter(item => item.artifactId).length
  const extractedCount = targetItems.filter(item => {
    const signal = `${item.itemType} ${item.status} ${item.metadata?.extractionStatus || ''}`
    return /extracted_with_evidence|content_extraction/i.test(signal)
  }).length
  const boundary = accessBoundaryForTarget(target)
  return {
    targetKey: target.targetKey,
    sourceId: target.sourceId || SKOOL_SOURCE_ID,
    title: target.title,
    status: target.status,
    runtimeMode: target.runtimeMode,
    url: text(target.metadata?.url),
    sourceNote: text(target.metadata?.sourceNote),
    accessBoundary: boundary,
    sourceState: sourceStateForTarget(target, targetItems.length),
    itemCount: targetItems.length,
    artifactCount,
    extractedCount,
    approvalRequired: boundary !== 'public_read_check_only' || bool(target.metadata?.approvalRequired),
    publicReadCheckOnly: boundary === 'public_read_check_only',
    noCrawlUntilApproved: bool(target.metadata?.noCrawlUntilApproved) || bool(target.metadata?.noCommunityCrawl) || boundary !== 'public_read_check_only',
    stopIfAuthRequired: bool(target.metadata?.stopIfAuthRequired) || boundary === 'public_read_check_only',
    exactPacketRequired: true,
    nextAction: nextActionForTarget(target, targetItems.length),
  }
}

export function buildSkoolSourceSystemMap({
  targets = SKOOL_SOURCE_SYSTEM_TARGET_FIXTURE,
  items = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const normalizedTargets = list(targets)
    .map(normalizeTarget)
    .filter(target => target.sourceId === SKOOL_SOURCE_ID && target.targetKey)
    .sort((a, b) => a.targetKey.localeCompare(b.targetKey))
  const normalizedItems = list(items)
    .map(normalizeItem)
    .filter(item => item.sourceId === SKOOL_SOURCE_ID || normalizedTargets.some(target => target.targetKey === item.targetKey))
  const sourceTargets = normalizedTargets.map(target => summarizeTarget(target, normalizedItems))
  const blockedTargets = sourceTargets.filter(target => target.status === 'blocked')
  const plannedTargets = sourceTargets.filter(target => target.status === 'planned')
  const paidPrivateTargets = sourceTargets.filter(target => target.accessBoundary === 'paid_auth_member_content')
  const publicReadTargets = sourceTargets.filter(target => target.accessBoundary === 'public_read_check_only')
  const itemCount = sourceTargets.reduce((sum, target) => sum + number(target.itemCount), 0)
  const extractedItemCount = sourceTargets.reduce((sum, target) => sum + number(target.extractedCount), 0)
  const artifactItemCount = sourceTargets.reduce((sum, target) => sum + number(target.artifactCount), 0)

  return {
    schemaVersion: 1,
    generatedAt,
    cardId: SKOOL_SOURCE_SYSTEM_MAP_CARD_ID,
    closeoutKey: SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY,
    reportArtifactId: SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
    sourceId: SKOOL_SOURCE_ID,
    sourceName: 'Skool',
    status: extractedItemCount > 0 ? 'source_map_has_existing_items' : 'source_map_ready_extraction_blocked',
    summary: {
      targetCount: sourceTargets.length,
      itemCount,
      artifactItemCount,
      extractedItemCount,
      blockedTargetCount: blockedTargets.length,
      plannedTargetCount: plannedTargets.length,
      paidPrivateTargetCount: paidPrivateTargets.length,
      publicReadTargetCount: publicReadTargets.length,
      approvalRequiredTargetCount: sourceTargets.filter(target => target.approvalRequired).length,
      zeroSkoolContentExtracted: extractedItemCount === 0,
    },
    guardrails: {
      readOnlyMapOnly: true,
      browserStarted: false,
      sourceRowsMutated: false,
      writesAtomsOrVectors: false,
      externalWritesAllowed: false,
      loginAllowedInThisSlice: false,
      joinAllowedInThisSlice: false,
      courseCrawlAllowedInThisSlice: false,
      memberDataReadAllowedInThisSlice: false,
      paidPrivateExtractionAllowedInThisSlice: false,
      postCommentMessageAllowed: false,
      downloadsAllowed: false,
      normalChromeProfileAllowed: false,
      browserbaseAllowed: false,
      rawContentIncluded: false,
    },
    routePolicy: {
      defaultRoute: 'source_map_and_access_boundary_first',
      publicFreeRoute: 'exact_packet_then_source_session_broker_then_skool_free_god_mode_runner',
      paidPrivateRoute: 'exact_packet_content_use_approval_and_session_boundary_required',
      preferredRunnerAfterApproval: 'skool:free-god-mode',
      approvalGate: 'no Skool login, join, course crawl, paid/private read, post, comment, message, download, or external write without exact approval',
      ledgerRoute: 'source-extraction-state-ledger-v1',
    },
    sourceTargets,
    stateModel: {
      fingerprintFields: ['sourceId', 'targetKey', 'url', 'accessBoundary', 'status', 'runtimeMode', 'itemCount', 'lastSeenOrUpdatedAt'],
      targetStates: [
        'planned_source_map_only',
        'planned_public_metadata_only',
        'blocked_by_boundary',
        'metadata_or_content_items_present',
      ],
      extractionStates: [
        'not_started_no_source_items',
        'metadata_mapped_content_not_extracted',
        'blocked_pending_source_auth_approval',
        'approved_packet_ready',
        'extracted_with_evidence',
      ],
      reviewStates: [
        'unreviewed',
        'graded_keep',
        'graded_ignore',
        'implemented_cleared',
      ],
      suppressionRule: 'graded_ignore and implemented_cleared stay in history but are suppressed from Director candidates unless changed',
    },
    packetRequirements: {
      requiredBeforeAnyRunner: [
        'exact_skool_target_key_and_url',
        'free_public_or_paid_private_boundary',
        'content_owner_and_permitted_use',
        'approved_account_or_source_identity',
        'source_session_state',
        'allowed_surfaces',
        'allowed_artifacts',
        'max_pages_runtime_and_cost',
        'stop_conditions',
      ],
      forbiddenWithoutApproval: [
        'login_or_mfa',
        'join_group',
        'paid_or_member_content_read',
        'course_or_classroom_crawl',
        'post_comment_message_or_reply',
        'member_profile_or_member_list_read',
        'download',
        'account_profile_credential_or_payment_mutation',
        'external_write',
      ],
    },
    directorRouting: {
      proposedOnly: true,
      currentDirectorCandidateCount: 0,
      reason: 'No Skool content has been extracted; only target/access state is eligible for planning.',
      nextDirectorInputAfterApproval: 'new_or_changed_metadata_plus_extracted_evidence_from_exact_approved_packets',
      suppressClearedItems: true,
    },
    nextCards: [
      'FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001',
      'SOURCE-SESSION-BROKER-001',
      'DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001',
      'DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001',
    ],
  }
}

export function evaluateSkoolSourceSystemMap(snapshot = buildSkoolSourceSystemMap()) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const targets = list(snapshot.sourceTargets)
  const guardrails = snapshot.guardrails || {}
  const routePolicy = snapshot.routePolicy || {}
  const stateModel = snapshot.stateModel || {}

  add(snapshot.cardId === SKOOL_SOURCE_SYSTEM_MAP_CARD_ID && snapshot.sourceId === SKOOL_SOURCE_ID, 'map is tied to the Skool source contract', `${snapshot.cardId || 'missing'} / ${snapshot.sourceId || 'missing'}`)
  add(number(snapshot.summary?.targetCount) >= 4, 'map includes the governed Skool target set', String(snapshot.summary?.targetCount || 0))
  add(number(snapshot.summary?.paidPrivateTargetCount) >= 2, 'map identifies paid/private/member Skool targets', String(snapshot.summary?.paidPrivateTargetCount || 0))
  add(number(snapshot.summary?.publicReadTargetCount) >= 1, 'map identifies at least one public-read Skool target', String(snapshot.summary?.publicReadTargetCount || 0))
  add(number(snapshot.summary?.extractedItemCount) === 0 && snapshot.summary?.zeroSkoolContentExtracted === true, 'map proves no Skool content is extracted yet', String(snapshot.summary?.extractedItemCount || 0))
  add(targets.some(target => target.targetKey === 'skool-corpus-backfill' && target.sourceNote === 'docs/source-notes/skool-corpus.md' && target.sourceState === 'blocked_by_boundary'), 'Skool corpus lane remains blocked by source note/policy boundary', 'skool-corpus-backfill')
  add(targets.some(target => target.targetKey === 'mark-skool-premium-recordings' && target.accessBoundary === 'paid_auth_member_content' && target.exactPacketRequired), 'Mark premium recordings require exact paid/private packet', 'mark-skool-premium-recordings')
  add(targets.some(target => target.targetKey === 'kia-ai-automations-skool-community-public-check' && target.publicReadCheckOnly && target.stopIfAuthRequired), 'Kia public-read target stops if auth is required', 'kia-ai-automations-skool-community-public-check')
  add(
    guardrails.browserStarted === false &&
      guardrails.sourceRowsMutated === false &&
      guardrails.writesAtomsOrVectors === false &&
      guardrails.externalWritesAllowed === false,
    'map proof does not start browser, mutate source rows, write atoms/vectors, or write externally',
    JSON.stringify(guardrails),
  )
  add(
    guardrails.loginAllowedInThisSlice === false &&
      guardrails.joinAllowedInThisSlice === false &&
      guardrails.courseCrawlAllowedInThisSlice === false &&
      guardrails.memberDataReadAllowedInThisSlice === false &&
      guardrails.paidPrivateExtractionAllowedInThisSlice === false &&
      guardrails.postCommentMessageAllowed === false &&
      guardrails.downloadsAllowed === false,
    'map keeps Skool login/join/crawl/member/download/write actions blocked',
    JSON.stringify(guardrails),
  )
  add(
    guardrails.browserbaseAllowed === false &&
      guardrails.normalChromeProfileAllowed === false &&
      routePolicy.publicFreeRoute === 'exact_packet_then_source_session_broker_then_skool_free_god_mode_runner',
    'route is local/session-broker after exact packet, with hosted/normal profile blocked',
    JSON.stringify(routePolicy),
  )
  add(
    list(stateModel.targetStates).includes('blocked_by_boundary') &&
      list(stateModel.extractionStates).includes('blocked_pending_source_auth_approval') &&
      list(stateModel.reviewStates).includes('implemented_cleared'),
    'state model covers target, extraction, review, and suppression states',
    JSON.stringify(stateModel),
  )
  add(
    list(snapshot.packetRequirements?.requiredBeforeAnyRunner).includes('content_owner_and_permitted_use') &&
      list(snapshot.packetRequirements?.forbiddenWithoutApproval).includes('post_comment_message_or_reply') &&
      list(snapshot.packetRequirements?.forbiddenWithoutApproval).includes('member_profile_or_member_list_read'),
    'packet requirements preserve content-use and member/write boundaries',
    JSON.stringify(snapshot.packetRequirements || {}),
  )
  add(
    snapshot.directorRouting?.proposedOnly === true &&
      number(snapshot.directorRouting?.currentDirectorCandidateCount) === 0 &&
      snapshot.directorRouting?.suppressClearedItems === true,
    'Director routing is proposal-only until approved Skool evidence exists',
    JSON.stringify(snapshot.directorRouting || {}),
  )
  add(
    list(snapshot.nextCards).includes('FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001') &&
      list(snapshot.nextCards).includes('SOURCE-SESSION-BROKER-001') &&
      list(snapshot.nextCards).includes('DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001'),
    'next cards route to runner/session proof and daily Director review loop',
    list(snapshot.nextCards).join(', '),
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    checks,
    failed,
  }
}

export function buildSkoolSourceSystemMapDogfoodProof() {
  const snapshot = buildSkoolSourceSystemMap()
  const evaluation = evaluateSkoolSourceSystemMap(snapshot)
  return {
    ok: evaluation.ok,
    summary: snapshot.summary,
    dogfoodInvariant: evaluation.ok
      ? 'fixture proves Skool target map, paid/private blockers, public-read stop rules, zero extracted content, and no browser/source-row/atom/external writes'
      : evaluation.failed.map(item => item.check).join(', '),
  }
}

export function buildSkoolSourceSystemMapReportArtifact(snapshot = {}) {
  return {
    reportArtifactId: SKOOL_SOURCE_SYSTEM_MAP_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY,
    department: 'foundation',
    title: 'Skool Source System Map V1',
    status: 'generated',
    sourceIds: [SKOOL_SOURCE_ID],
    sourceCoverage: list(snapshot.sourceTargets).map(target => ({
      sourceId: target.sourceId || SKOOL_SOURCE_ID,
      targetKey: target.targetKey,
      status: target.status,
      accessBoundary: target.accessBoundary,
      itemCount: target.itemCount,
      extractedCount: target.extractedCount,
      nextAction: target.nextAction,
    })),
    summaryMarkdown: [
      '# Skool Source System Map V1',
      '',
      `- Targets mapped: ${snapshot.summary?.targetCount || 0}`,
      `- Source items found: ${snapshot.summary?.itemCount || 0}`,
      `- Skool content extracted: ${snapshot.summary?.extractedItemCount || 0}`,
      `- Paid/private/member targets: ${snapshot.summary?.paidPrivateTargetCount || 0}`,
      `- Public-read targets: ${snapshot.summary?.publicReadTargetCount || 0}`,
      '',
      'This is a source-system map only. No Skool browser session, login, join, course crawl, member read, download, post/comment/message, source row mutation, atom/vector write, or external write was performed.',
    ].join('\n'),
    structuredOutputJson: snapshot,
    metadata: {
      cardId: SKOOL_SOURCE_SYSTEM_MAP_CARD_ID,
      closeoutKey: SKOOL_SOURCE_SYSTEM_MAP_CLOSEOUT_KEY,
      planPath: SKOOL_SOURCE_SYSTEM_MAP_PLAN_PATH,
      proofCommand: 'npm run process:skool-source-system-map-check -- --apply --json',
      browserStarted: false,
      sourceRowsMutated: false,
      atomOrVectorWrites: false,
      externalWritesStarted: false,
    },
  }
}
