export const GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID = 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001'
export const GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_PLAN_PATH = 'docs/process/extractor-eyes-hands-brain-runtime-001-plan.md'
export const GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_SCRIPT_PATH = 'scripts/process-god-mode-extractor-system-contract-check.mjs'

export const GOD_MODE_EXTRACTOR_REQUIRED_CAPABILITIES = [
  'source_packet',
  'metadata_triage',
  'read',
  'ears',
  'eyes',
  'hands',
  'brain',
  'evidence',
  'boundaries',
  'output',
  'grading',
  'autopilot',
]

export const GOD_MODE_EXTRACTOR_SOURCE_SOPS = [
  {
    sourceFamily: 'youtube_public_creator',
    label: 'YouTube public creator SOP',
    steps: [
      'Refresh public creator metadata for every approved creator before spending model budget.',
      'Run metadata triage for relevance, public/no-auth boundary, duplicate status, long-course routing, title signal, and noise rejection.',
      'Queue the latest 10 relevant public videos for every approved creator as the first baseline; deepen S/A sources toward 50; throttle C/D sources after baseline unless a lane override exists.',
      'Run qualifying videos through full video/audio/visual watch, transcript/page capture, timestamped evidence, and model-route ledger proof.',
      'Read the whole YouTube page, including title, description, visible metadata, caption/transcript status, and page evidence; public comments remain operator-excluded.',
      'Classify every description/resource links set; safe public repo/docs/resource pages become exact source packets and approved public worker runs, while unsafe/private/paid/login/download/form/short-link/community/course links become blocked or approval-required packets.',
      'Capture free resources such as skills, code, templates, repos, docs, checklists, and public pages when the source packet allows it.',
      'When a free Skool/community link appears, create a free-community source packet; if approved and within boundary, inspect free chat, free courses, and free resources with governed Hands.',
      'When a paid gate appears, stop before purchase/login/private content and create a paid gate evaluation packet for Steve: what was learned for free, what is likely behind the gate, risk, cost if visible, and buy/not-buy recommendation.',
      'Persist atoms, evidence hits, resource dispositions, source-packet status, paid-gate evaluation, Director input, Scoper readiness, and creator grade update.',
      'Show every creator on the YouTube source surface with grade/score, watched count, metadata count, pending baseline, resource status, blockers, and next action.',
      'Run the morning autopilot without babysitting after the dry-run/live-bounded proof is green; stop and report blockers instead of guessing. No video-only completion can count as full God Mode.',
    ],
  },
  {
    sourceFamily: 'skool_free_community',
    label: 'Skool free community SOP',
    steps: [
      'Require an exact free-community source packet, actor/session boundary, content-use rule, and allowed area list before navigation.',
      'Use governed Hands to inspect only allowed free areas such as public/free chat, free courses, pinned resources, docs, and resource links.',
      'Capture useful free resources and implementation patterns with source URL, timestamp/capture time, page title, and evidence artifact.',
      'Stop at paid, private, member-only, login-required, form, checkout, DM, posting, commenting, or download boundaries unless separately approved.',
      'Emit a value evaluation packet when the free layer suggests a paid course/community might be worth buying.',
    ],
  },
  {
    sourceFamily: 'skool_paid_or_private',
    label: 'Skool paid/private SOP',
    steps: [
      'Do not enter or crawl until Steve approves the paid/private source packet, session boundary, storage rules, and content-use limits.',
      'After approval, run one bounded lesson/community proof before any broad queue.',
      'Preserve provenance without copying private course content into git or public surfaces.',
      'Stop before purchases, account changes, messages, comments, posts, downloads, or external writes unless the source packet explicitly allows that exact action.',
    ],
  },
  {
    sourceFamily: 'myicor_paid_training',
    label: 'MyICOR paid training SOP',
    steps: [
      'Do not log in or navigate paid training until Steve approves the exact MyICOR packet, session boundary, course scope, and content-use rules.',
      'After approval, run one bounded approved lesson proof with Eyes/Ears/Read/Hands/Brain/Evidence before broad training extraction.',
      'Capture course map, lesson claims, implementation steps, resources, and blockers without storing private raw media in git.',
      'Stop before purchases, forms, profile/account changes, downloads, external writes, or unapproved course areas.',
    ],
  },
  {
    sourceFamily: 'github_docs_public_resources',
    label: 'GitHub/docs/public resource SOP',
    steps: [
      'Require exact public repo/docs/resource source packet from a YouTube/resource-link disposition or approved source registry row.',
      'Read metadata, README/docs, license/provenance, examples, install/use steps, and implementation relevance.',
      'Follow only allowed same-source docs links when the packet allows it; otherwise create follow-up packets.',
      'Capture useful code/resource summary and implementation applicability without auto-copying private code, mutating repos, creating backlog cards, or writing externally.',
    ],
  },
]

export const GOD_MODE_EXTRACTOR_BACKLOG_UPDATE = {
  title: 'Build the full God Mode extractor runtime and source SOP system',
  lane: 'scoped',
  priority: 'P0',
  rank: 8,
  source: 'Steve May 26 full God Mode extractor correction',
  summary: [
    'Build the reusable extractor system plus source-family SOPs. The runtime must not stop at watching videos.',
    'It must triage metadata, watch/listen/see/read, navigate with governed Hands where approved, follow approved resource links, capture free resources, evaluate paid gates, update creator/source grades, and run morning autopilot without babysitting.',
  ].join(' '),
  whyItMatters: [
    'Extraction is how AIOS learns what to build and how to improve itself.',
    'If the system only watches videos and ignores pages, description links, free resources, free communities, paid-gate evaluation, source grades, and autopilot, it is not God Mode and it will keep wasting Steve time.',
  ].join(' '),
  nextAction: [
    'Implement this parent before more broad YouTube spend: lock the reusable Eyes/Ears/Read/Hands/Brain/Evidence/Boundary/Output/Grade/Autopilot contract, then build the YouTube SOP end to end, then add Skool free-community, Skool paid/private, MyICOR paid training, and GitHub/docs/resource SOPs as source-specific runners.',
    'No video-only catch-up may claim full God Mode.',
  ].join(' '),
  statusNote: [
    'Stabbed from Steve May 26 correction. Required behavior: all approved creators visible with grade/score; metadata triage first; latest 10 relevant public videos per creator for baseline; S/A deepen and C/D park/throttle; full watch includes video/audio/visual plus whole page and description links; free skills/code/templates/repos/docs/resources must be captured when packet-allowed; free Skool/community links become source packets and approved free-area Hands runs; paid gates stop and produce buy/not-buy value evaluation for Steve; morning autopilot runs without babysitting after proof; Skool/MyICOR/private/auth require exact source packets and session/content boundaries. Proof command: npm run process:god-mode-extractor-system-contract-check -- --json. This is not permission to crawl private/auth/paid sources, buy, submit forms, download, post/comment/message, write externally, auto-create backlog cards, or spend provider budget.',
  ].join(' '),
}

export const YOUTUBE_GOD_MODE_CATCHUP_BACKLOG_UPDATE = {
  nextAction: [
    'Do not run more broad live video catch-up until the parent God Mode extractor runtime/SOP contract is represented in proof.',
    'The YouTube lane must execute the source SOP: metadata triage -> latest-10 baseline queue -> full video/audio/visual watch -> whole page/description extraction -> resource-link packets/follow-up -> free-resource capture -> free-community packet if linked -> paid-gate value evaluation -> creator grade update -> morning autopilot report.',
  ].join(' '),
  statusNote: [
    'Open parent catch-up lane. A watched video is not complete God Mode by itself. Completion requires every approved creator row to show metadata count, watched count, grade/score by lane, pending baseline, resource-link/source-packet/Hands status, free-resource capture status, paid-gate evaluation status, blocker/next action, and morning autopilot disposition. Public comments stay operator-excluded. Skool/MyICOR/private/auth links stop at source-packet/session approval boundaries.',
  ].join(' '),
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

export function buildGodModeExtractorSystemContractSnapshot() {
  const requiredSourceFamilies = GOD_MODE_EXTRACTOR_SOURCE_SOPS.map(sop => sop.sourceFamily)
  const youtube = GOD_MODE_EXTRACTOR_SOURCE_SOPS.find(sop => sop.sourceFamily === 'youtube_public_creator')
  return {
    cardId: GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_CARD_ID,
    planPath: GOD_MODE_EXTRACTOR_SYSTEM_CONTRACT_PLAN_PATH,
    requiredCapabilities: [...GOD_MODE_EXTRACTOR_REQUIRED_CAPABILITIES],
    sourceSops: GOD_MODE_EXTRACTOR_SOURCE_SOPS.map(sop => ({
      ...sop,
      steps: [...sop.steps],
    })),
    requiredSourceFamilies,
    youtubeStepCount: list(youtube?.steps).length,
    youtubeMustHave: [
      'metadata triage',
      'latest 10',
      'creator grade',
      'whole YouTube page',
      'description/resource links',
      'free resources',
      'free Skool/community',
      'paid gate evaluation',
      'morning autopilot',
      'no video-only completion',
    ],
    reportOnly: true,
    startsExtraction: false,
    callsProvider: false,
    writesExternalSystems: false,
    autoCreatesBacklog: false,
  }
}

export function evaluateGodModeExtractorSystemContract(snapshot = buildGodModeExtractorSystemContractSnapshot()) {
  const findings = []
  const requiredFamilies = [
    'youtube_public_creator',
    'skool_free_community',
    'skool_paid_or_private',
    'myicor_paid_training',
    'github_docs_public_resources',
  ]
  const sourceFamilies = new Set(list(snapshot.sourceSops).map(sop => sop.sourceFamily))
  for (const family of requiredFamilies) {
    if (!sourceFamilies.has(family)) findings.push({ check: 'required_source_family_sop_present', detail: family })
  }
  const capabilities = new Set(list(snapshot.requiredCapabilities))
  for (const capability of GOD_MODE_EXTRACTOR_REQUIRED_CAPABILITIES) {
    if (!capabilities.has(capability)) findings.push({ check: 'required_capability_present', detail: capability })
  }
  const youtubeText = list(snapshot.sourceSops)
    .filter(sop => sop.sourceFamily === 'youtube_public_creator')
    .flatMap(sop => sop.steps)
    .join(' ')
    .toLowerCase()
  for (const marker of list(snapshot.youtubeMustHave)) {
    if (!youtubeText.includes(text(marker).toLowerCase())) findings.push({ check: 'youtube_sop_marker_present', detail: marker })
  }
  if (snapshot.startsExtraction) findings.push({ check: 'contract_does_not_start_extraction', detail: 'startsExtraction=true' })
  if (snapshot.callsProvider) findings.push({ check: 'contract_does_not_call_provider', detail: 'callsProvider=true' })
  if (snapshot.writesExternalSystems) findings.push({ check: 'contract_does_not_write_external', detail: 'writesExternalSystems=true' })
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function buildGodModeExtractorSystemContractDogfoodProof() {
  const healthy = buildGodModeExtractorSystemContractSnapshot()
  const videoOnly = {
    ...healthy,
    sourceSops: [
      {
        sourceFamily: 'youtube_public_creator',
        label: 'Weak video-only lane',
        steps: [
          'Watch videos and create ideas.',
        ],
      },
    ],
  }
  const missingHands = {
    ...healthy,
    requiredCapabilities: GOD_MODE_EXTRACTOR_REQUIRED_CAPABILITIES.filter(item => item !== 'hands'),
  }
  const unsafe = {
    ...healthy,
    startsExtraction: true,
    callsProvider: true,
    writesExternalSystems: true,
  }
  const healthyEval = evaluateGodModeExtractorSystemContract(healthy)
  const videoOnlyEval = evaluateGodModeExtractorSystemContract(videoOnly)
  const missingHandsEval = evaluateGodModeExtractorSystemContract(missingHands)
  const unsafeEval = evaluateGodModeExtractorSystemContract(unsafe)
  return {
    ok: healthyEval.ok &&
      !videoOnlyEval.ok &&
      !missingHandsEval.ok &&
      !unsafeEval.ok,
    cases: [
      { name: 'healthy_full_contract_passes', ok: healthyEval.ok },
      { name: 'video_only_youtube_sop_fails', ok: !videoOnlyEval.ok, findings: videoOnlyEval.findings },
      { name: 'missing_hands_capability_fails', ok: !missingHandsEval.ok, findings: missingHandsEval.findings },
      { name: 'contract_cannot_start_extraction_or_provider_or_external_write', ok: !unsafeEval.ok, findings: unsafeEval.findings },
    ],
  }
}
