import {
  EXTRACTOR_HANDS_BROWSER_RUNTIME_CARD_ID,
} from './extractor-hands-browser-runtime.js'
export const GOD_MODE_EXTRACTOR_PARITY_GATE_CARD_ID = 'GOD-MODE-EXTRACTOR-PARITY-GATE-001'
export const GOD_MODE_EXTRACTOR_PARITY_GATE_SCRIPT_PATH = 'scripts/process-god-mode-extractor-parity-gate-check.mjs'

export const GOD_MODE_REQUIRED_FAMILY_IDS = [
  'youtube-public-videos',
  'youtube-public-comments',
  'youtube-long-courses',
  'public-web-resource-links',
  'creator-newsletters',
  'github-repos',
  'skool-free-communities',
  'skool-paid-courses',
  'paid-course-training-platforms',
  'google-drive-meet-training',
  'gmail-missive',
  'slack',
  'meetings-transcripts',
  'system-signals',
]

export const GOD_MODE_REQUIRED_CAPABILITIES = [
  'eyes',
  'ears',
  'hands',
  'reading',
  'brain',
  'evidence',
  'boundaries',
  'output',
]

const GOD_MODE_LEVEL = 'god_mode'
const PROVEN = 'working'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function byLaneId(lanes = []) {
  return new Map(list(lanes).map(lane => [lane.laneId, lane]))
}

function family(input = {}) {
  return {
    familyId: input.familyId,
    label: input.label,
    sourceOwner: input.sourceOwner || 'Foundation',
    accessBoundary: input.accessBoundary || 'Needs source boundary',
    currentLevel: input.currentLevel || 'discovery_only',
    claimsGodMode: input.claimsGodMode === true,
    modelRoute: input.modelRoute || 'Not assigned',
    cadence: input.cadence || 'Not scheduled',
    latestRunAt: input.latestRunAt || null,
    capabilities: {
      eyes: 'not_applicable',
      ears: 'not_applicable',
      hands: 'not_applicable',
      reading: 'not_applicable',
      brain: 'not_applicable',
      evidence: 'not_applicable',
      boundaries: 'not_applicable',
      output: 'not_applicable',
      comments: 'not_applicable',
      resourceLinks: 'not_applicable',
      sourcePacket: 'not_applicable',
      ...input.capabilities,
    },
    blockers: list(input.blockers),
    nextCard: input.nextCard || '',
    visibleClaim: input.visibleClaim || input.label || input.familyId,
  }
}

export function buildGodModeExtractorParitySnapshot({ activeExtractionLanes = [], generatedAt = new Date().toISOString() } = {}) {
  const lanes = byLaneId(activeExtractionLanes)
  const youtubeLane = lanes.get('youtube-video-intelligence-pipeline') || {}
  const meetingsLane = lanes.get('meetings-transcripts') || {}
  const emailLane = lanes.get('email-missive-comms') || {}
  const slackLane = lanes.get('slack-comms') || {}
  const synthesisLane = lanes.get('synthesis-router') || {}

  const families = [
    family({
      familyId: 'youtube-public-videos',
      label: 'YouTube public videos',
      sourceOwner: 'Build Intel',
      accessBoundary: 'Public YouTube pages only; no login or paid/community access',
      currentLevel: 'eyes_ears_brain_partial',
      modelRoute: 'Gemini API video/audio/visual review plus Foundation report bundles',
      cadence: 'Catch-up batches plus daily new-release watch',
      latestRunAt: youtubeLane.latestRunAt,
      capabilities: {
        eyes: PROVEN,
        ears: PROVEN,
        reading: PROVEN,
        brain: PROVEN,
        evidence: PROVEN,
        boundaries: PROVEN,
        output: PROVEN,
        hands: 'planned',
        comments: 'operator_excluded',
        resourceLinks: 'approval_queue',
        sourcePacket: 'public_source_contract',
      },
      blockers: [
        'Approved resource-link follow-up now has source-packet worker and bounded Hands routes, but public video rows still need real packet upgrades/readback before full source-family God Mode.',
        'YouTube video pages are still not allowed to claim full God Mode until resource packets, Hands status, and freshness are proven per source item.',
      ],
      nextCard: 'BUILD-INTEL-LINK-APPROVAL-SOURCE-PACKETS-001',
      visibleClaim: 'YouTube video intelligence',
    }),
    family({
      familyId: 'youtube-public-comments',
      label: 'YouTube public comments (operator excluded)',
      sourceOwner: 'Build Intel',
      accessBoundary: 'Intentionally excluded from active extraction by Steve; no LLM/runtime spend on YouTube comments',
      currentLevel: 'operator_excluded_low_value_signal',
      modelRoute: 'None; comments are not part of the active God Mode lane',
      cadence: 'Disabled unless Steve explicitly reverses the exclusion',
      capabilities: {
        reading: 'operator_excluded',
        brain: 'operator_excluded',
        evidence: 'operator_excluded',
        boundaries: PROVEN,
        output: 'operator_excluded',
        comments: 'operator_excluded',
        resourceLinks: 'source_packet_preview',
        sourcePacket: PROVEN,
      },
      blockers: [
        'Steve decided YouTube comments are low-value noise for this sprint and should not consume LLM/runtime attention.',
        'The old proof can remain historical boundary evidence, but comments are not a God Mode blocker or next build.',
      ],
      nextCard: 'NO-ACTIVE-CARD-OPERATOR-EXCLUDED',
    }),
    family({
      familyId: 'youtube-long-courses',
      label: 'YouTube long courses',
      sourceOwner: 'Build Intel',
      accessBoundary: 'Public long-form YouTube only unless source packet says otherwise',
      currentLevel: 'planned_long_watch',
      modelRoute: 'Gemini API long-watch lane, not fast mode by default',
      cadence: 'Queued after short-video parity',
      capabilities: {
        eyes: 'planned',
        ears: 'planned',
        reading: 'planned',
        brain: 'planned',
        evidence: 'planned',
        boundaries: PROVEN,
        output: 'planned',
      },
      blockers: ['Needs long-video budget, chunking, resume, and evidence proof.'],
      nextCard: 'YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001',
    }),
    family({
      familyId: 'public-web-resource-links',
      label: 'Public web/resource links',
      sourceOwner: 'Foundation source packet review',
      accessBoundary: 'Standing public/free auto-read; stop at forms, downloads, auth, paid/private, purchase, post/comment/message, account/profile, and credential boundaries',
      currentLevel: 'source_god_mode_runtime_v1_public_free',
      modelRoute: 'Source God Mode extractor runtime with clean browser Hands, deterministic policy brain, evidence artifacts, and optional Stagehand agentic browser adapter',
      cadence: 'Public/free source follow-up queue plus operator review for blockers',
      capabilities: {
        eyes: PROVEN,
        hands: PROVEN,
        reading: PROVEN,
        brain: PROVEN,
        evidence: PROVEN,
        boundaries: PROVEN,
        output: PROVEN,
        resourceLinks: 'public_free_auto_read_ready',
        sourcePacket: PROVEN,
      },
      blockers: [
        'Source God Mode runtime V1 proves live clean-browser click/navigation, public/free follow-up, newsletter form detection without submit, free-community public-area follow-up, paid/auth/download/form blockers, and creator source-stack output on a local dogfood source.',
        'Next gap is production ingestion from real YouTube/resource queues into Foundation atoms, source-stack rows, and Scoper packets.',
        'Paid/private/auth/session work still routes to Source Session Broker and source-specific packets.',
      ],
      nextCard: 'SOURCE-BROWSER-AGENTIC-RUNTIME-001',
    }),
    family({
      familyId: 'creator-newsletters',
      label: 'Creator newsletters',
      sourceOwner: 'Build Intel source intake',
      accessBoundary: 'Free newsletters from approved creators may use ai@bensoncrew.ca or crewbert@bensoncrew.ca; stop on paid/private/profile/post/message/unsafe actions',
      currentLevel: 'signup_page_detection_ready_mailbox_lane_pending',
      modelRoute: 'Source God Mode runtime detects newsletter pages/forms without submit; mailbox label/folder monitor plus issue extractor pending',
      cadence: 'Signup/onboarding proof next, then daily mailbox monitor',
      capabilities: {
        eyes: PROVEN,
        hands: 'signup_detect_ready_no_submit',
        reading: 'planned_mailbox_monitor',
        brain: 'signup_policy_brain_ready',
        evidence: 'runtime_artifact_ready',
        boundaries: PROVEN,
        output: 'creator_source_stack_candidate_ready',
        resourceLinks: 'public_free_resource_followup_planned',
        sourcePacket: 'standing_free_source_policy_required',
      },
      blockers: [
        'Runtime V1 detects newsletter signup pages/forms and records no-submit source-stack candidates.',
        'Needs newsletter source-lane proof: approved inbox choice, Gmail label/folder routing, signup/confirmation evidence, unsubscribe path, issue extraction, resource-link handling, and low-value unsubscribe/park rule.',
        'Newsletter opt-ins are allowed only for free approved creator/source newsletters; paid upgrades, profile/account changes, unsafe downloads, unexpected login/private areas, and posting/messaging stay blocked.',
      ],
      nextCard: 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001',
    }),
    family({
      familyId: 'github-repos',
      label: 'GitHub repos',
      sourceOwner: 'Build Intel',
      accessBoundary: 'Public repos or explicitly approved private repo packets only',
      currentLevel: 'public_free_runtime_ready_repo_worker_pending',
      modelRoute: 'Source God Mode runtime can auto-read public/free resource pages; repo-specific README/license/provenance worker pending',
      cadence: 'After YouTube/resource queue integration',
      capabilities: {
        eyes: 'runtime_ready',
        hands: 'runtime_ready',
        reading: 'runtime_ready',
        brain: 'repo_specific_worker_pending',
        evidence: 'runtime_artifact_ready',
        boundaries: PROVEN,
        output: 'source_stack_candidate_ready',
      },
      blockers: [
        'Generic source-browser runtime is ready for public/free repo links.',
        'Needs repo target registry, README/docs/license/provenance extraction, star/value filters, and code provenance rules before claiming repo-family God Mode.',
      ],
      nextCard: 'SOURCE-BROWSER-AGENTIC-RUNTIME-001',
    }),
    family({
      familyId: 'skool-free-communities',
      label: 'Skool free communities',
      sourceOwner: 'Foundation source packet review',
      accessBoundary: 'Standing free/public community policy with source identity/session boundary; stop at paid/private/member/login/action boundaries',
      currentLevel: 'free_public_runtime_v1_local_proof',
      modelRoute: 'Source God Mode runtime V1 proves free/public community navigation on local fixture; real Skool identity/session proof pending',
      cadence: 'After first approved/free public target run',
      capabilities: {
        eyes: PROVEN,
        hands: PROVEN,
        reading: PROVEN,
        brain: 'free_community_policy_brain_ready',
        evidence: PROVEN,
        boundaries: PROVEN,
        output: 'source_stack_candidate_ready',
        sourcePacket: 'standing_free_policy_plus_session_boundary',
      },
      blockers: [
        'Runtime V1 proves free-community style navigation, recent-activity/resource/classroom follow-up, and paid/private/login blockers on a local dogfood source.',
        'Needs first real free Skool source run with approved source identity/session boundary before broad Skool queue.',
        'Posting, commenting, messaging, paid/member/private areas, profile/account changes, and purchases remain blocked.',
      ],
      nextCard: 'FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001',
    }),
    family({
      familyId: 'skool-paid-courses',
      label: 'Skool paid courses',
      sourceOwner: 'Foundation source packet review',
      accessBoundary: 'Paid/private/member source packet required before any login/navigation',
      currentLevel: 'blocked_paid_private',
      modelRoute: 'Skool paid worker parked',
      cadence: 'Not scheduled',
      capabilities: {
        hands: 'blocked_by_source_packet',
        reading: 'blocked_by_source_packet',
        brain: 'planned',
        evidence: 'planned',
        boundaries: PROVEN,
        output: 'planned',
        sourcePacket: 'required',
      },
      blockers: ['Needs Steve-approved paid-source packet, login/session boundary, storage rules, and content-use limit.'],
      nextCard: 'BUILD-INTEL-LINK-APPROVAL-SOURCE-PACKETS-001',
    }),
    family({
      familyId: 'paid-course-training-platforms',
      label: 'Paid course/training platforms',
      sourceOwner: 'Foundation source packet review',
      accessBoundary: 'Paid training source packet required before authorized browser session; MyICOR is one instance, not a top-level source family',
      currentLevel: 'blocked_paid_private',
      modelRoute: 'Paid training platform worker parked; MyICOR is the current known example',
      cadence: 'Not scheduled',
      capabilities: {
        hands: 'blocked_by_source_packet',
        reading: 'blocked_by_source_packet',
        brain: 'planned',
        evidence: 'planned',
        boundaries: PROVEN,
        output: 'planned',
        sourcePacket: 'required',
      },
      blockers: ['Needs exact paid training platform source packet, browser profile/session boundary, course scope, and content-use rules. Historical MyICOR source ID remains SRC-MYICRO-001 as provenance only.'],
      nextCard: 'MYICRO-TRAINING-001',
    }),
    family({
      familyId: 'google-drive-meet-training',
      label: 'Google Drive/Meet training corpus',
      sourceOwner: 'Foundation Drive/Meet',
      accessBoundary: 'Benson Crew governed Drive/Meet files only',
      currentLevel: 'readable_partial',
      modelRoute: 'Drive/meeting transcript extraction plus future video review',
      cadence: 'Backfill plus current sync',
      capabilities: {
        reading: PROVEN,
        ears: 'transcript_dependent',
        brain: 'partial',
        evidence: PROVEN,
        boundaries: PROVEN,
        output: 'partial',
      },
      blockers: ['Needs video/audio/visual review route for training recordings, not just file text/transcripts.'],
      nextCard: 'SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001',
    }),
    family({
      familyId: 'gmail-missive',
      label: 'Gmail / Missive',
      sourceOwner: 'Foundation comms spine',
      accessBoundary: 'Governed internal comms only',
      currentLevel: 'readable_brain_partial',
      modelRoute: 'Gmail/Missive extractors plus synthesis router',
      cadence: 'Current sync jobs',
      latestRunAt: emailLane.latestRunAt,
      capabilities: {
        reading: PROVEN,
        brain: 'partial',
        evidence: PROVEN,
        boundaries: PROVEN,
        output: 'partial',
      },
      blockers: ['Dev-specific routing and Director freshness still need proof.'],
      nextCard: 'DEV-SOURCE-SLICE-ROUTER-001',
    }),
    family({
      familyId: 'slack',
      label: 'Slack',
      sourceOwner: 'Foundation comms spine',
      accessBoundary: 'Governed internal Slack threads only',
      currentLevel: 'readable_brain_partial',
      modelRoute: 'Slack sync/extract plus synthesis router',
      cadence: 'Current sync jobs',
      latestRunAt: slackLane.latestRunAt,
      capabilities: {
        reading: PROVEN,
        brain: 'partial',
        evidence: PROVEN,
        boundaries: PROVEN,
        output: 'partial',
      },
      blockers: ['Dev-specific routing and thread quality scoring still need proof.'],
      nextCard: 'DEV-SOURCE-SLICE-ROUTER-001',
    }),
    family({
      familyId: 'meetings-transcripts',
      label: 'Meetings / transcripts',
      sourceOwner: 'Foundation meetings spine',
      accessBoundary: 'Governed Benson Crew meeting notes/transcripts only',
      currentLevel: 'readable_brain_partial',
      modelRoute: 'Meeting notes/transcript extraction plus synthesis router',
      cadence: 'Current sync jobs',
      latestRunAt: meetingsLane.latestRunAt,
      capabilities: {
        ears: 'transcript_dependent',
        reading: PROVEN,
        brain: 'partial',
        evidence: PROVEN,
        boundaries: PROVEN,
        output: 'partial',
      },
      blockers: ['Dev-specific routing and issue/opportunity scoring still need proof.'],
      nextCard: 'DEV-SOURCE-SLICE-ROUTER-001',
    }),
    family({
      familyId: 'system-signals',
      label: 'System signals and synthesis router',
      sourceOwner: 'Foundation intelligence spine',
      accessBoundary: 'Internal source-backed facts only',
      currentLevel: 'brain_partial',
      modelRoute: 'Synthesis router and Director',
      cadence: 'After extractor runs; freshness gate required',
      latestRunAt: synthesisLane.latestRunAt,
      capabilities: {
        brain: 'partial',
        evidence: PROVEN,
        boundaries: PROVEN,
        output: 'partial',
      },
      blockers: ['Synthesis must refresh after extractor runs or show stale state.'],
      nextCard: 'SYNTHESIS-ROUTER-FRESHNESS-TRIGGER-001',
    }),
  ]

  return {
    cardId: GOD_MODE_EXTRACTOR_PARITY_GATE_CARD_ID,
    generatedAt,
    families,
    summary: {
      familyCount: families.length,
      claimsGodModeCount: families.filter(item => item.claimsGodMode === true || item.currentLevel === GOD_MODE_LEVEL).length,
      blockedFamilyCount: families.filter(item => text(item.currentLevel).includes('blocked')).length,
      handsNotProvenCount: families.filter(item => item.capabilities.hands !== PROVEN && item.capabilities.hands !== 'not_applicable').length,
    },
  }
}

function hasAllFields(item = {}) {
  return [
    item.familyId,
    item.label,
    item.sourceOwner,
    item.accessBoundary,
    item.currentLevel,
    item.modelRoute,
    item.cadence,
    item.nextCard,
  ].every(Boolean) && item.capabilities && list(item.blockers).length >= 0
}

function isGodModeClaim(item = {}) {
  return item.claimsGodMode === true || text(item.currentLevel) === GOD_MODE_LEVEL
}

function capabilityIsProven(item = {}, capability = '') {
  return item.capabilities?.[capability] === PROVEN
}

function addViolation(violations, familyId, ruleId, detail = '') {
  violations.push({ familyId: familyId || 'source-family-matrix', ruleId, detail })
}

export function evaluateGodModeExtractorParity(snapshot = buildGodModeExtractorParitySnapshot()) {
  const violations = []
  const families = list(snapshot.families)
  const familyIds = new Set(families.map(item => item.familyId))

  for (const familyId of GOD_MODE_REQUIRED_FAMILY_IDS) {
    if (!familyIds.has(familyId)) addViolation(violations, familyId, 'required_family_missing', 'missing source family maturity row')
  }

  for (const item of families) {
    if (!hasAllFields(item)) addViolation(violations, item.familyId, 'required_fields_missing', 'family needs owner, boundary, level, model route, cadence, next card, and capabilities')
    if (!item.capabilities) addViolation(violations, item.familyId, 'capabilities_missing', 'capability map required')

    if (isGodModeClaim(item)) {
      for (const capability of GOD_MODE_REQUIRED_CAPABILITIES) {
        if (!capabilityIsProven(item, capability)) {
          addViolation(violations, item.familyId, 'god_mode_capability_not_proven', `${capability}=${item.capabilities?.[capability] || 'missing'}`)
        }
      }
      if (item.capabilities.resourceLinks !== PROVEN && item.familyId === 'youtube-public-videos') {
        addViolation(violations, item.familyId, 'resource_links_not_proven', `resourceLinks=${item.capabilities.resourceLinks || 'missing'}`)
      }
      if (item.capabilities.sourcePacket !== PROVEN && /skool|myicor|paid|private/i.test(`${item.familyId} ${item.accessBoundary}`)) {
        addViolation(violations, item.familyId, 'paid_private_source_packet_not_proven', `sourcePacket=${item.capabilities.sourcePacket || 'missing'}`)
      }
    }

    if (/skool|myicor/i.test(item.familyId) && isGodModeClaim(item)) {
      addViolation(violations, item.familyId, 'paid_private_source_cannot_claim_god_mode_without_approved_packet', item.accessBoundary)
    }
  }

  const visibleFalseClaims = families
    .filter(item => /god mode/i.test(`${item.visibleClaim} ${item.label}`) && !isGodModeClaim(item))
    .map(item => item.familyId)
  if (visibleFalseClaims.length) {
    addViolation(violations, 'source-family-matrix', 'visible_false_god_mode_claim', visibleFalseClaims.join(', '))
  }

  const youtubeVideo = families.find(item => item.familyId === 'youtube-public-videos') || {}
  if (youtubeVideo.capabilities?.hands === PROVEN || youtubeVideo.capabilities?.resourceLinks === PROVEN) {
    addViolation(violations, 'youtube-public-videos', 'youtube_video_lane_overclaims_current_capability', 'current lane should remain partial until hands/resource links are actually proven')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'healthy',
    cardId: snapshot.cardId || GOD_MODE_EXTRACTOR_PARITY_GATE_CARD_ID,
    summary: snapshot.summary || {},
    violations,
  }
}

export function buildGodModeExtractorParityDogfoodProof() {
  const validSnapshot = buildGodModeExtractorParitySnapshot({ generatedAt: '2026-05-25T00:00:00.000Z' })
  const valid = evaluateGodModeExtractorParity(validSnapshot)
  const falseYoutube = buildGodModeExtractorParitySnapshot({ generatedAt: '2026-05-25T00:00:00.000Z' })
  falseYoutube.families = falseYoutube.families.map(item => item.familyId === 'youtube-public-videos'
    ? { ...item, claimsGodMode: true, currentLevel: GOD_MODE_LEVEL }
    : item)
  const falseYoutubeEval = evaluateGodModeExtractorParity(falseYoutube)
  const falseSkool = buildGodModeExtractorParitySnapshot({ generatedAt: '2026-05-25T00:00:00.000Z' })
  falseSkool.families = falseSkool.families.map(item => item.familyId === 'skool-paid-courses'
    ? { ...item, claimsGodMode: true, currentLevel: GOD_MODE_LEVEL }
    : item)
  const falseSkoolEval = evaluateGodModeExtractorParity(falseSkool)

  return {
    ok: valid.ok === true && falseYoutubeEval.ok === false && falseSkoolEval.ok === false,
    cases: [
      { name: 'current_partial_matrix_passes_without_full_god_mode_claim', ok: valid.ok === true },
      { name: 'youtube_video_false_god_mode_claim_fails', ok: falseYoutubeEval.ok === false },
      { name: 'skool_paid_false_god_mode_claim_fails', ok: falseSkoolEval.ok === false },
    ],
  }
}
