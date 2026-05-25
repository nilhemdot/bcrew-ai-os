export const GOD_MODE_EXTRACTOR_PARITY_GATE_CARD_ID = 'GOD-MODE-EXTRACTOR-PARITY-GATE-001'
export const GOD_MODE_EXTRACTOR_PARITY_GATE_SCRIPT_PATH = 'scripts/process-god-mode-extractor-parity-gate-check.mjs'

export const GOD_MODE_REQUIRED_FAMILY_IDS = [
  'youtube-public-videos',
  'youtube-public-comments',
  'youtube-long-courses',
  'public-web-resource-links',
  'github-repos',
  'skool-free-communities',
  'skool-paid-courses',
  'myicor-paid-training',
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
        comments: 'planned',
        resourceLinks: 'approval_queue',
        sourcePacket: 'public_source_contract',
      },
      blockers: [
        'Public comments are not yet integrated.',
        'Approved resource-link follow-up is still source-packet gated.',
        'Browser hands/navigation is not proven for this lane.',
      ],
      nextCard: 'YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001',
      visibleClaim: 'YouTube video intelligence',
    }),
    family({
      familyId: 'youtube-public-comments',
      label: 'YouTube public comments',
      sourceOwner: 'Build Intel',
      accessBoundary: 'Public comments only, no member/private data',
      currentLevel: 'adapter_ready_missing_api_key_and_runner_integration',
      modelRoute: 'YouTube Data API public comment adapter plus source-packet classifier; API key and runner integration pending',
      cadence: 'Proof command only until API key config and full-watch runner integration are wired',
      capabilities: {
        reading: 'adapter_ready',
        brain: 'adapter_ready',
        evidence: 'adapter_ready',
        boundaries: PROVEN,
        output: 'adapter_ready',
        comments: 'adapter_ready',
        resourceLinks: 'source_packet_preview',
        sourcePacket: PROVEN,
      },
      blockers: [
        'Needs YOUTUBE_DATA_API_KEY or YOUTUBE_API_KEY configured.',
        'Needs batch runner integration before comments are part of normal YouTube full-watch output.',
        'Run npm run process:youtube-public-comments-extractor-check -- --json before any adapter claims comment support.',
      ],
      nextCard: 'YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001',
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
      accessBoundary: 'Exact URL approval before any follow-up crawl',
      currentLevel: 'source_packet_queue',
      modelRoute: 'Source packet preview first; worker route after approval',
      cadence: 'Operator-reviewed queue',
      capabilities: {
        hands: 'approval_gated',
        reading: 'approval_gated',
        brain: 'planned',
        evidence: 'planned',
        boundaries: PROVEN,
        output: 'planned',
        resourceLinks: 'approval_queue',
        sourcePacket: PROVEN,
      },
      blockers: ['Needs approve/deny/comment UI and exact source packet state before crawling.'],
      nextCard: 'BUILD-INTEL-LINK-APPROVAL-SOURCE-PACKETS-001',
    }),
    family({
      familyId: 'github-repos',
      label: 'GitHub repos',
      sourceOwner: 'Build Intel',
      accessBoundary: 'Public repos or explicitly approved private repo packets only',
      currentLevel: 'planned',
      modelRoute: 'Repo intelligence worker pending',
      cadence: 'Not scheduled',
      capabilities: {
        reading: 'planned',
        brain: 'planned',
        evidence: 'planned',
        boundaries: PROVEN,
        output: 'planned',
      },
      blockers: ['Needs repo target registry, star/value filters, and code provenance rules.'],
      nextCard: 'DEV-INTEL-SOURCE-COVERAGE-001',
    }),
    family({
      familyId: 'skool-free-communities',
      label: 'Skool free communities',
      sourceOwner: 'Foundation source packet review',
      accessBoundary: 'Exact free-community packet and content-use rules required',
      currentLevel: 'blocked_by_source_packet',
      modelRoute: 'Skool/community worker parked',
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
      blockers: ['Needs exact source packet, actor/session boundary, and allowed post/comment/member scope.'],
      nextCard: 'BUILD-INTEL-LINK-APPROVAL-SOURCE-PACKETS-001',
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
      familyId: 'myicor-paid-training',
      label: 'MyICOR paid training',
      sourceOwner: 'Foundation source packet review',
      accessBoundary: 'Paid training source packet required before authorized browser session',
      currentLevel: 'blocked_paid_private',
      modelRoute: 'MyICOR worker parked',
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
      blockers: ['Needs exact MyICOR source packet, browser profile/session boundary, course scope, and content-use rules.'],
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
      if (item.capabilities.comments !== PROVEN && item.familyId.startsWith('youtube')) {
        addViolation(violations, item.familyId, 'youtube_comments_not_proven', `comments=${item.capabilities.comments || 'missing'}`)
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
  if (youtubeVideo.capabilities?.hands === PROVEN || youtubeVideo.capabilities?.comments === PROVEN || youtubeVideo.capabilities?.resourceLinks === PROVEN) {
    addViolation(violations, 'youtube-public-videos', 'youtube_video_lane_overclaims_current_capability', 'current lane should remain partial until comments/hands/resource links are actually proven')
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
