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
  if (host.includes('github.com') || host.includes('gist.github.com')) return 'github'
  if (host.includes('gumroad') || lower.includes('checkout') || lower.includes('purchase') || lower.includes('payment')) return 'purchase_or_checkout'
  if (lower.includes('download') || /\.(zip|dmg|pkg|exe|msi|tar|gz|rar|7z)(\?|$)/i.test(url)) return 'download'
  if (host.includes('bit.ly') || host.includes('t.co') || host.includes('tinyurl') || host.includes('linktr.ee') || host.includes('beacons.ai')) return 'short_link'
  if (host.includes('calendly') || lower.includes('book-a-call') || lower.includes('form') || lower.includes('optin') || lower.includes('subscribe')) return 'form_or_booking'
  if (host.includes('discord') || host.includes('circle') || lower.includes('community') || lower.includes('member') || lower.includes('course') || lower.includes('classroom')) return 'community_or_course'
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

  return {
    sourcePacketId,
    exactUrl: url,
    host,
    sourceFamily: family,
    sourceType,
    proposedDecision,
    operatorNote,
    reviewIntent: reviewIntentFor(proposedDecision),
    currentResolverDisposition: resolver.disposition,
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
        packet.writesBacklog === false,
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
  return {
    ok: cases.every(item => item.ok),
    cases,
  }
}
