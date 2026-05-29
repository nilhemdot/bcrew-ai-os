import crypto from 'node:crypto'

import {
  classifyYoutubeResourceLink,
  normalizeYoutubeResourceUrl,
} from './youtube-resource-link-resolver.js'

export const BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID = 'BUILD-INTEL-LINK-APPROVAL-SOURCE-PACKETS-001'
export const BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_PLAN_PATH = 'docs/process/build-intel-link-approval-source-packets-001-plan.md'
export const BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_SCRIPT_PATH = 'scripts/process-build-intel-link-approval-source-packets-check.mjs'

const DEFAULT_OUTPUT_DESTINATION = 'Foundation intelligence pool after approved source-specific worker run'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function hostOf(rawUrl = '') {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function lowerSource(link = {}) {
  return [
    link.url,
    link.host,
    link.reason,
    link.blocker,
    link.classification,
    link.label,
    link.sourceText,
    link.operatorNote,
    link.operatorComment,
  ].map(text).join(' ').toLowerCase()
}

function sourceFamilyFor(link = {}) {
  const url = normalizeYoutubeResourceUrl(link.url || link.normalizedUrl || link.href || '')
  const host = text(link.host || hostOf(url)).toLowerCase()
  const lower = lowerSource({ ...link, url, host })
  if (host === 'accounts.google.com' || host === 'support.google.com' || host === 'policies.google.com') return 'system_noise'
  if (host.includes('skool')) return 'skool'
  if (lower.includes('myicor') || lower.includes('myicro') || lower.includes('icor')) return 'myicor'
  if (host.includes('gumroad') || lower.includes('checkout') || lower.includes('purchase') || lower.includes('payment')) return 'purchase_or_checkout'
  if (lower.includes('download') || /\.(zip|dmg|pkg|exe|msi|tar|gz|rar|7z)(\?|$)/i.test(url)) return 'download'
  if (host.includes('bit.ly') || host.includes('t.co') || host.includes('tinyurl') || host.includes('shorturl') || host.includes('rebrand.ly') || host.includes('cutt.ly') || host.includes('linktr.ee') || host.includes('beacons.ai')) return 'short_link'
  if (
    host.includes('calendly') ||
    host.includes('typeform') ||
    lower.includes('book-a-call') ||
    lower.includes('submit data') ||
    lower.includes('external action') ||
    /(^|[/?#&=._-])(form|forms|optin|opt-in|waitlist|join)([/?#&=._-]|$)/.test(lower)
  ) return 'form_or_booking'
  if (host.includes('github.com') || host.includes('gist.github.com')) return 'github'
  if (host.includes('discord') || host.includes('circle') || lower.includes('member') || lower.includes('membership') || lower.includes('classroom') || lower.includes('login')) return 'community_or_course'
  if (host.includes('linkedin') || host.includes('instagram') || host.includes('x.com') || host.includes('twitter') || host.includes('tiktok')) return 'social'
  return 'public_web'
}

function decisionFromOperatorNote(link = {}) {
  const lower = lowerSource(link)
  if (!lower) return ''
  if (/free (skool |community)|free community|public community/.test(lower)) return 'approve_free_community_bounded_read'
  if (/sales page|selling ai|sells ai|selling product|offer page|funnel|landing page/.test(lower)) return 'approve_sales_page_review'
  if (/(paid|private|member|course).*(bought|purchased|have access|we have access|log in)|log in and crawl|login and crawl/.test(lower)) return 'approve_paid_source_access'
  if (/(not bought|didn.t buy|did not buy|possible purchase|maybe buy|consider buying|purchase candidate)/.test(lower)) return 'park_purchase_candidate'
  if (/reject|noise|ignore|do not follow/.test(lower)) return 'reject_noise'
  return ''
}

function defaultDecisionFor(link = {}) {
  const family = sourceFamilyFor(link)
  const lower = lowerSource(link)
  const operatorDecision = decisionFromOperatorNote(link)
  if (operatorDecision) return operatorDecision
  if (family === 'github' || family === 'public_web') return 'approve_public_free_read'
  if (family === 'system_noise') return 'reject_noise'
  if (family === 'skool') {
    if (lower.includes('paid') || lower.includes('premium') || lower.includes('classroom') || lower.includes('course')) return 'hold_paid_private'
    return 'manual_source_packet'
  }
  if (family === 'myicor' || family === 'community_or_course') return 'approve_login_bounded_read'
  if (family === 'purchase_or_checkout' || family === 'download' || family === 'form_or_booking') return 'hold_paid_private'
  if (family === 'short_link') return 'manual_source_packet'
  if (family === 'social') return 'reject_noise'
  return 'manual_source_packet'
}

function sourceTypeFor(family = '', decision = '') {
  if (family === 'skool' && decision === 'approve_free_community_bounded_read') return 'free_skool_community'
  if (family === 'skool' && (decision === 'hold_paid_private' || decision === 'approve_paid_source_access' || decision === 'park_purchase_candidate')) return 'paid_or_private_skool'
  if (family === 'skool') return 'skool_source_candidate'
  if (family === 'github') return 'public_code_repository'
  if (family === 'myicor') return 'paid_training_source'
  if (family === 'short_link') return 'destination_unknown'
  if (family === 'purchase_or_checkout') return 'purchase_or_checkout_page'
  if (family === 'download') return 'download_or_file'
  if (family === 'form_or_booking') return 'form_booking_or_opt_in'
  if (family === 'community_or_course') return 'community_or_course'
  if (family === 'social') return 'social_or_noise'
  if (family === 'system_noise') return 'system_noise'
  return 'public_web_page'
}

function accessBoundaryFor(decision = '', family = '') {
  if (decision === 'approve_public_free_read') return 'exact_public_no_login_read_only'
  if (decision === 'approve_sales_page_review') return 'exact_public_sales_page_read_only_no_forms'
  if (decision === 'approve_free_community_bounded_read') return 'free_community_source_packet_before_worker'
  if (decision === 'approve_login_bounded_read') return 'login_required_source_specific_packet_before_worker'
  if (decision === 'approve_paid_source_access') return 'paid_private_source_packet_with_credentials_before_worker'
  if (decision === 'park_purchase_candidate') return 'not_purchased_purchase_candidate_only'
  if (decision === 'hold_paid_private') return 'paid_private_or_member_content_hold'
  if (decision === 'reject_noise') return 'do_not_follow'
  if (family === 'short_link') return 'expand_destination_metadata_only_before_any_follow'
  return 'manual_split_required'
}

function allowedActionsFor(decision = '', family = '') {
  if (decision === 'approve_public_free_read') {
    return [
      'Read the exact public URL only.',
      'Capture public metadata and visible public page context.',
      'Route findings into a source-specific extractor proposal.',
    ]
  }
  if (decision === 'approve_login_bounded_read') {
    return [
      'Prepare a source-specific run packet.',
      'Use approved credentials/session only after the packet is accepted.',
      'Read only the exact source areas named in the packet.',
    ]
  }
  if (decision === 'approve_sales_page_review') {
    return [
      'Read the exact public sales page only.',
      'Capture offer, positioning, funnel, claims, pricing signals, and CTA structure.',
      'Do not submit forms or opt in.',
    ]
  }
  if (decision === 'approve_free_community_bounded_read') {
    return [
      'Create a source packet for the exact free community URL.',
      'Use a Skool/community extractor only after the source packet is accepted.',
      'Read only public/free areas named in the packet.',
    ]
  }
  if (decision === 'approve_paid_source_access') {
    return [
      'Create a paid-source run packet for the exact community/course.',
      'Use approved credentials/session boundaries only after packet acceptance.',
      'Read only the purchased areas Steve explicitly approved.',
    ]
  }
  if (decision === 'park_purchase_candidate') {
    return [
      'Do not crawl this link.',
      'Park it as a possible purchase.',
      'Score it against creator value and likely business/build upside.',
    ]
  }
  if (decision === 'hold_paid_private') {
    return [
      'Keep the link parked.',
      'Create a source packet Steve can review later.',
      'Record why paid/private/member content is blocked.',
    ]
  }
  if (decision === 'reject_noise') return ['Keep the rejection record so the same link does not keep resurfacing.']
  if (family === 'short_link') return ['Expand the destination metadata only after Steve approves exact expansion.']
  return ['Split this into an exact source packet before any worker can use it.']
}

function forbiddenActionsFor() {
  return [
    'Do not crawl adjacent pages.',
    'Do not log in from the approval action.',
    'Do not read paid, private, member, classroom, course, or comment content unless a later source-specific worker packet allows it.',
    'Do not download files from the approval action.',
    'Do not submit forms, book calls, purchase, or opt in from the approval action.',
    'Do not write backlog/cards from the approval action.',
    'Do not start a worker from approval alone.',
  ]
}

function extractorFor(family = '') {
  if (family === 'skool') return 'Skool worker, parked until source packet approval'
  if (family === 'myicor') return 'MyICOR training worker, parked until source packet approval'
  if (family === 'github') return 'GitHub/repo public metadata worker'
  if (family === 'short_link') return 'Short-link destination resolver'
  if (family === 'purchase_or_checkout' || family === 'download' || family === 'form_or_booking') return 'Manual source packet review only'
  if (family === 'system_noise') return 'No extractor'
  return 'Public web source worker'
}

function decisionCopy({ decision = '', family = '', host = '' } = {}) {
  if (decision === 'approve_public_free_read') return `Approve exact public read of ${host || 'this link'} only.`
  if (decision === 'approve_sales_page_review') return `Review ${host || 'this page'} as a public sales/offer page only.`
  if (decision === 'approve_free_community_bounded_read') return 'Approve as a free/community source packet; worker still needs the Skool/community extractor boundary.'
  if (decision === 'approve_login_bounded_read') return 'Approve a guarded login/source packet first; no worker runs from this click.'
  if (decision === 'approve_paid_source_access') return 'Approve a paid-source packet because we already bought access; worker still waits for exact login/scope rules.'
  if (decision === 'park_purchase_candidate') return 'Park this as a possible purchase and score it against creator value before buying.'
  if (decision === 'hold_paid_private') return 'Hold this. Paid/private/member content needs a separate source packet.'
  if (decision === 'reject_noise') return 'Reject this as noise so it stops coming back.'
  if (family === 'short_link') return 'Approve destination expansion only, then review the real final URL.'
  return 'Split this into a more exact source packet before approval.'
}

function reviewIntentFor(decision = '') {
  if (decision === 'approve_sales_page_review') return 'study_offer_and_positioning'
  if (decision === 'approve_free_community_bounded_read') return 'mine_free_community_for_useful_builder_signals'
  if (decision === 'approve_paid_source_access') return 'extract_purchased_private_source_inside_scope'
  if (decision === 'park_purchase_candidate') return 'score_whether_paid_access_is_worth_buying'
  if (decision === 'approve_public_free_read') return 'read_public_source_for_context'
  if (decision === 'reject_noise') return 'do_not_follow'
  return 'needs_operator_review'
}

function purchaseCandidateScoreFor(link = {}) {
  const lower = lowerSource(link)
  let score = 50
  if (/mark|icor|nate|dan|nick|dream labs|jono|austin/i.test(lower)) score += 20
  if (/agent|automation|aios|claude|codex|cursor|workflow|memory|browser|hands/i.test(lower)) score += 15
  if (/paid|course|community|classroom|training|skool/i.test(lower)) score += 10
  if (/unknown|short|bit\.ly|linktr\.ee/i.test(lower)) score -= 15
  return Math.max(0, Math.min(100, score))
}

function runtimeStageFor(decision = '') {
  if (decision === 'approve_public_free_read') return 'eligible_public_read_worker_after_packet_record'
  if (decision === 'approve_sales_page_review') return 'eligible_sales_page_review_worker_after_packet_record'
  if (decision === 'approve_free_community_bounded_read') return 'needs_free_community_source_packet_then_worker'
  if (decision === 'approve_login_bounded_read') return 'needs_login_source_packet_and_session_preflight'
  if (decision === 'approve_paid_source_access') return 'needs_paid_source_packet_and_session_preflight'
  if (decision === 'park_purchase_candidate') return 'parked_purchase_candidate_no_worker'
  if (decision === 'hold_paid_private') return 'held_paid_private_no_worker'
  if (decision === 'reject_noise') return 'rejected_no_worker'
  return 'needs_manual_source_packet'
}

function runtimeWorkerFor(decision = '', family = '') {
  if (decision === 'approve_public_free_read') return family === 'github' ? 'github_public_metadata_worker' : 'public_web_read_worker'
  if (decision === 'approve_sales_page_review') return 'public_sales_page_review_worker'
  if (decision === 'approve_free_community_bounded_read') return 'community_public_area_worker_after_packet'
  if (decision === 'approve_login_bounded_read') return 'approved_login_browser_hands_worker'
  if (decision === 'approve_paid_source_access') return 'approved_paid_source_browser_hands_worker'
  if (decision === 'park_purchase_candidate') return 'purchase_candidate_scoreboard'
  return 'none'
}

function runtimeRequiredBeforeRun(packet = {}) {
  const decision = text(packet.proposedDecision)
  const required = ['Steve confirms the packet preview.', 'The system records the source packet.']
  if (decision === 'approve_public_free_read' || decision === 'approve_sales_page_review') {
    required.push('Worker must stay on the exact URL and read visible public page context only.')
    return required
  }
  if (decision === 'approve_free_community_bounded_read') {
    required.push('Define exact public/free community areas allowed.')
    required.push('Prove the community worker cannot read member/private/course areas.')
    return required
  }
  if (decision === 'approve_login_bounded_read' || decision === 'approve_paid_source_access') {
    required.push('Choose the approved service identity/browser profile.')
    required.push('Prove login/session boundaries before reading content.')
    required.push('Define exact pages/modules/areas allowed and what must stop the run.')
    return required
  }
  if (decision === 'park_purchase_candidate') return ['No worker runs. Score whether buying this source is worth it.']
  if (decision === 'reject_noise') return ['No worker runs. Keep rejection record so it stops resurfacing.']
  return ['Operator must split this into a more exact source packet.']
}

function runtimeAllowedOperations(decision = '') {
  if (decision === 'approve_public_free_read' || decision === 'approve_sales_page_review') {
    return [
      'open exact URL',
      'capture title/meta/visible text',
      'classify outbound links',
      'capture screenshot hash/metadata if useful',
    ]
  }
  if (decision === 'approve_free_community_bounded_read') {
    return [
      'open exact approved community URL',
      'read only public/free approved areas',
      'capture visible post/course index metadata',
      'classify new links back into source packets',
    ]
  }
  if (decision === 'approve_login_bounded_read' || decision === 'approve_paid_source_access') {
    return [
      'open approved browser profile',
      'navigate only approved pages/modules',
      'capture visible allowed content and proof anchors',
      'stop on paywall, unexpected private area, form, download, or mutation prompt',
    ]
  }
  return []
}

function runtimeForbiddenOperations() {
  return [
    'start from approval alone',
    'crawl adjacent pages without packet scope',
    'submit forms',
    'purchase or opt in',
    'download files',
    'mutate credentials or browser profile settings',
    'post, comment, message, or write externally',
    'create backlog cards automatically',
  ]
}

function runtimeProfileRefFor(packet = {}) {
  const family = text(packet.sourceFamily || 'source').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'source'
  const host = text(packet.host || 'unknown-host').replace(/[^a-z0-9_.-]+/gi, '-').toLowerCase() || 'unknown-host'
  return `browser-profile:${family}:${host}:source-packet-boundary`
}

function runtimePlainEnglish(plan = {}) {
  if (plan.stage === 'eligible_public_read_worker_after_packet_record') {
    return 'After Steve confirms, record the packet, then a local browser worker can read this exact public page only.'
  }
  if (plan.stage === 'eligible_sales_page_review_worker_after_packet_record') {
    return 'After Steve confirms, record the packet, then a local browser worker can review this exact sales page without forms or opt-ins.'
  }
  if (plan.stage === 'needs_free_community_source_packet_then_worker') {
    return 'After Steve confirms, define the exact free/community scope before any Skool/community worker reads it.'
  }
  if (plan.stage === 'needs_login_source_packet_and_session_preflight') {
    return 'This needs an approved login/session profile and exact page scope before browser hands can read it.'
  }
  if (plan.stage === 'needs_paid_source_packet_and_session_preflight') {
    return 'This needs paid-source approval, approved credentials/session boundaries, and exact content scope before browser hands can read it.'
  }
  if (plan.stage === 'parked_purchase_candidate_no_worker') return 'No worker runs. Park this as a possible purchase and score it later.'
  if (plan.stage === 'held_paid_private_no_worker') return 'No worker runs. Paid/private content stays held until a source-specific packet is approved.'
  if (plan.stage === 'rejected_no_worker') return 'No worker runs. Reject this link as noise.'
  return 'No worker runs until this is turned into an exact source packet.'
}

export function buildSourcePacketRuntimePlan(packet = {}) {
  const decision = text(packet.proposedDecision)
  const family = text(packet.sourceFamily)
  const stage = runtimeStageFor(decision)
  const worker = runtimeWorkerFor(decision, family)
  const requiresAuth = stage.includes('login') || stage.includes('paid')
  const requiresCommunityBoundary = stage.includes('community')
  const runnableAfterPacket = stage.startsWith('eligible_')
  const sourceSpecificApprovalRequired = !runnableAfterPacket && stage !== 'rejected_no_worker' && stage !== 'parked_purchase_candidate_no_worker'
  const plan = {
    runtimePlanId: `runtime-plan:${stableHash([packet.sourcePacketId, packet.exactUrl, decision, packet.operatorNote]).slice(0, 16)}`,
    adapter: 'local_playwright_first',
    fallbackRoute: 'source_session_broker_or_harlan_operator_escalation_after_local_retries',
    externalBrowserSpendAllowed: false,
    stage,
    worker,
    startsImmediately: false,
    startsFromApprovalAction: false,
    runnableAfterPacket,
    sourceSpecificApprovalRequired,
    requiresAuth,
    requiresCommunityBoundary,
    persistentProfileRef: requiresAuth ? runtimeProfileRefFor(packet) : '',
    maxPages: runnableAfterPacket ? 1 : 0,
    maxClicks: runnableAfterPacket ? 0 : 0,
    allowedOperations: runtimeAllowedOperations(decision),
    forbiddenOperations: runtimeForbiddenOperations(),
    requiredBeforeRun: runtimeRequiredBeforeRun(packet),
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    costPosture: 'local_first_zero_incremental_platform_cost',
  }
  return {
    ...plan,
    plainEnglish: runtimePlainEnglish(plan),
  }
}

export function validateSourcePacketRuntimePlan(plan = {}) {
  const failures = []
  if (!text(plan.runtimePlanId)) failures.push('missing_runtime_plan_id')
  if (text(plan.hostedFallback)) failures.push('runtime_must_not_define_hosted_fallback')
  if (text(plan.fallbackRoute) !== 'source_session_broker_or_harlan_operator_escalation_after_local_retries') failures.push('missing_source_session_operator_fallback_route')
  if (plan.externalBrowserSpendAllowed !== false) failures.push('external_browser_spend_must_be_disabled')
  if (!text(plan.stage)) failures.push('missing_runtime_stage')
  if (!text(plan.worker)) failures.push('missing_runtime_worker')
  if (plan.startsImmediately !== false) failures.push('runtime_must_not_start_immediately')
  if (plan.startsFromApprovalAction !== false) failures.push('approval_must_not_start_runtime')
  if (plan.externalWrites !== false) failures.push('runtime_must_not_write_external_systems')
  if (plan.writesBacklog !== false) failures.push('runtime_must_not_write_backlog')
  if (plan.mutatesCredentials !== false) failures.push('runtime_must_not_mutate_credentials')
  if (plan.mutatesBrowserProfile !== false) failures.push('runtime_must_not_mutate_browser_profile')
  if (plan.requiresAuth && !text(plan.persistentProfileRef)) failures.push('auth_runtime_missing_profile_ref')
  if (plan.runnableAfterPacket && Number(plan.maxPages) > 1) failures.push('public_runtime_too_broad')
  if (plan.runnableAfterPacket && list(plan.allowedOperations).some(operation => /submit|purchase|download|login|paid/i.test(operation))) failures.push('public_runtime_has_unsafe_operation')
  if (plan.stage === 'rejected_no_worker' && plan.worker !== 'none') failures.push('rejected_packet_has_worker')
  return { ok: failures.length === 0, failures }
}

export function buildSourcePacketPreview(rawLink = {}, options = {}) {
  const url = normalizeYoutubeResourceUrl(rawLink.url || rawLink.normalizedUrl || rawLink.href || rawLink.sourceUrl || '')
  const host = text(rawLink.host || hostOf(url))
  const resolver = classifyYoutubeResourceLink({ ...rawLink, url, host })
  const family = sourceFamilyFor({ ...rawLink, url, host })
  const operatorNote = text(options.operatorNote || options.operatorComment || rawLink.operatorNote || rawLink.operatorComment)
  const proposedDecision = text(options.decision || rawLink.proposedDecision || rawLink.operatorDecision) || defaultDecisionFor({ ...rawLink, url, host, operatorNote })
  const sourceType = sourceTypeFor(family, proposedDecision)
  const accessBoundary = accessBoundaryFor(proposedDecision, family)
  const sourcePacketId = `source-packet:${stableHash([
    url,
    rawLink.sourceVideoId,
    rawLink.reportArtifactId || rawLink.sourceReportArtifactId,
    proposedDecision,
    operatorNote,
  ]).slice(0, 16)}`

  const packet = {
    sourcePacketId,
    exactUrl: url,
    host,
    sourceFamily: family,
    sourceType,
    proposedDecision,
    operatorNote,
    reviewIntent: reviewIntentFor(proposedDecision),
    currentResolverDisposition: resolver.disposition,
    currentResolverStatus: resolver.status,
    currentResolverCanResolve: resolver.canResolve === true,
    currentResolverApprovalRequired: resolver.approvalRequired === true,
    accessBoundary,
    allowedActions: allowedActionsFor(proposedDecision, family),
    forbiddenActions: forbiddenActionsFor(),
    approvedBy: '',
    approvedAt: null,
    budget: proposedDecision === 'approve_public_free_read' ? 'public_metadata_low_cost' : 'requires_source_specific_budget',
    cadence: 'one-time review first; recurring watch only after source contract approval',
    outputDestination: DEFAULT_OUTPUT_DESTINATION,
    extractor: extractorFor(family),
    runStateAfterApproval: 'record_source_packet_only_no_crawl',
    startsCrawler: false,
    externalWrites: false,
    writesBacklog: false,
    plainEnglish: decisionCopy({ decision: proposedDecision, family, host }),
    purchaseCandidateScore: proposedDecision === 'park_purchase_candidate' ? purchaseCandidateScoreFor({ ...rawLink, family }) : null,
    sourceVideoId: rawLink.sourceVideoId || '',
    sourceUrl: rawLink.sourceUrl || '',
    reportArtifactId: rawLink.reportArtifactId || rawLink.sourceReportArtifactId || '',
    reason: rawLink.reason || rawLink.blocker || resolver.blocker || 'Needs source-packet review before the system reads this link.',
  }
  return {
    ...packet,
    runtimePlan: buildSourcePacketRuntimePlan(packet),
  }
}

export function validateSourcePacketPreview(packet = {}) {
  const failures = []
  if (!text(packet.exactUrl)) failures.push('missing_exact_url')
  if (!text(packet.sourcePacketId)) failures.push('missing_source_packet_id')
  if (!text(packet.sourceFamily)) failures.push('missing_source_family')
  if (!text(packet.proposedDecision)) failures.push('missing_decision')
  if (!text(packet.accessBoundary)) failures.push('missing_access_boundary')
  if (!list(packet.allowedActions).length) failures.push('missing_allowed_actions')
  if (!list(packet.forbiddenActions).length) failures.push('missing_forbidden_actions')
  if (packet.startsCrawler !== false) failures.push('approval_must_not_start_crawler')
  if (packet.externalWrites !== false) failures.push('approval_must_not_write_external_systems')
  if (packet.writesBacklog !== false) failures.push('approval_must_not_write_backlog')
  if (packet.proposedDecision === 'hold_paid_private' && !String(packet.accessBoundary).includes('hold')) failures.push('paid_private_not_held')
  if (packet.sourceFamily === 'skool' && packet.proposedDecision === 'approve_public_free_read' && /classroom|course|paid|member/i.test(packet.exactUrl)) failures.push('skool_paid_route_cannot_be_public_read')
  const runtimeValidation = validateSourcePacketRuntimePlan(packet.runtimePlan || {})
  for (const failure of runtimeValidation.failures) failures.push(failure)
  return {
    ok: failures.length === 0,
    failures,
  }
}

export function buildLinkApprovalSourcePacketQueue(rawLinks = []) {
  return list(rawLinks)
    .map(link => {
      const packet = buildSourcePacketPreview(link)
      return {
        ...link,
        sourcePacketPreview: packet,
        sourcePacketValidation: validateSourcePacketPreview(packet),
      }
    })
}

export function buildLinkApprovalSourcePacketsDogfoodProof() {
  const fixtures = [
    {
      name: 'public_github_exact_read',
      link: { url: 'https://github.com/earlyaidopters/claudeclaw-os', host: 'github.com', sourceVideoId: 'abc123' },
      expectDecision: 'approve_public_free_read',
    },
    {
      name: 'public_github_course_named_repo_exact_read',
      link: { url: 'https://github.com/mattpocock/course-video-manager', host: 'github.com', sourceVideoId: 'hX7yG1KVYhI' },
      expectDecision: 'approve_public_free_read',
    },
    {
      name: 'public_aihero_newsletter_exact_read',
      link: { url: 'https://www.aihero.dev/newsletter', host: 'aihero.dev', sourceVideoId: 'hX7yG1KVYhI' },
      expectDecision: 'approve_public_free_read',
    },
    {
      name: 'free_or_ambiguous_skool_needs_manual_packet',
      link: { url: 'https://www.skool.com/ai-automations-by-kia/big-update-for-the-ai-agent-space', host: 'skool.com' },
      expectDecision: 'manual_source_packet',
    },
    {
      name: 'operator_note_approves_free_community_packet',
      link: {
        url: 'https://www.skool.com/ai-automations-by-kia',
        host: 'skool.com',
        operatorNote: 'free community follow it and scrape public/free areas',
      },
      expectDecision: 'approve_free_community_bounded_read',
    },
    {
      name: 'operator_note_sales_page_review',
      link: {
        url: 'https://chaseai.io',
        host: 'chaseai.io',
        operatorNote: 'could be good to see how another person is selling AI products review it for that',
      },
      expectDecision: 'approve_sales_page_review',
    },
    {
      name: 'paid_skool_holds_private_boundary',
      link: { url: 'https://www.skool.com/earlyaidopters/classroom/26269254', host: 'skool.com', reason: 'Paid classroom link' },
      expectDecision: 'hold_paid_private',
    },
    {
      name: 'operator_note_paid_source_bought_access',
      link: {
        url: 'https://www.skool.com/earlyaidopters/classroom/26269254',
        host: 'skool.com',
        operatorNote: 'paid community bought it so log in and crawl it',
      },
      expectDecision: 'approve_paid_source_access',
    },
    {
      name: 'operator_note_paid_source_possible_purchase',
      link: {
        url: 'https://www.skool.com/chase-ai/classroom',
        host: 'skool.com',
        operatorNote: 'paid community link did not buy it, possible purchase if creator gives gold',
      },
      expectDecision: 'park_purchase_candidate',
    },
    {
      name: 'gumroad_or_checkout_holds',
      link: { url: 'https://gumroad.com/l/agent-course', host: 'gumroad.com' },
      expectDecision: 'hold_paid_private',
    },
    {
      name: 'public_join_opt_in_holds_without_worker',
      link: { url: 'https://www.linkingyourthinking.com/join/transform-your-year-with-the-linear-calendar', host: 'linkingyourthinking.com' },
      expectDecision: 'hold_paid_private',
    },
    {
      name: 'github_download_holds_without_repo_worker',
      link: { url: 'https://desktop.github.com/download', host: 'desktop.github.com' },
      expectDecision: 'hold_paid_private',
    },
    {
      name: 'short_link_expansion_only',
      link: { url: 'https://bit.ly/agent-stack', host: 'bit.ly' },
      expectDecision: 'manual_source_packet',
    },
    {
      name: 'social_noise_rejects',
      link: { url: 'https://www.instagram.com/example', host: 'instagram.com' },
      expectDecision: 'reject_noise',
    },
  ]
  const cases = fixtures.map(fixture => {
    const packet = buildSourcePacketPreview(fixture.link)
    const validation = validateSourcePacketPreview(packet)
    return {
      name: fixture.name,
      ok: validation.ok &&
        packet.proposedDecision === fixture.expectDecision &&
        packet.startsCrawler === false &&
        packet.externalWrites === false &&
        packet.writesBacklog === false &&
        packet.runtimePlan?.startsFromApprovalAction === false &&
        packet.runtimePlan?.externalWrites === false &&
        packet.runtimePlan?.writesBacklog === false,
      packet,
      validation,
    }
  })
  const badBroadApproval = validateSourcePacketPreview({
    sourcePacketId: 'source-packet:bad',
    exactUrl: '',
    sourceFamily: 'skool',
    proposedDecision: 'approve_login_bounded_read',
    accessBoundary: '',
    allowedActions: ['crawl community'],
    forbiddenActions: [],
    startsCrawler: true,
    externalWrites: false,
    writesBacklog: false,
  })
  cases.push({
    name: 'broad_or_crawl_on_approval_fails_closed',
    ok: badBroadApproval.ok === false &&
      badBroadApproval.failures.includes('missing_exact_url') &&
      badBroadApproval.failures.includes('approval_must_not_start_crawler'),
    validation: badBroadApproval,
  })
  const badRuntimePlan = validateSourcePacketRuntimePlan({
    runtimePlanId: 'runtime-plan:bad',
    stage: 'eligible_public_read_worker_after_packet_record',
    worker: 'public_web_read_worker',
    startsImmediately: true,
    startsFromApprovalAction: true,
    runnableAfterPacket: true,
    maxPages: 50,
    allowedOperations: ['submit form', 'download file'],
    externalWrites: true,
    writesBacklog: true,
    mutatesCredentials: true,
    mutatesBrowserProfile: true,
  })
  cases.push({
    name: 'runtime_plan_blocks_auto_start_and_external_writes',
    ok: badRuntimePlan.ok === false &&
      badRuntimePlan.failures.includes('runtime_must_not_start_immediately') &&
      badRuntimePlan.failures.includes('approval_must_not_start_runtime') &&
      badRuntimePlan.failures.includes('runtime_must_not_write_external_systems') &&
      badRuntimePlan.failures.includes('runtime_must_not_write_backlog'),
    validation: badRuntimePlan,
  })
  return {
    ok: cases.every(item => item.ok),
    cases,
  }
}
