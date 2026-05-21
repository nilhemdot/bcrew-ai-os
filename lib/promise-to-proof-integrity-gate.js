export const PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID = 'PROMISE-TO-PROOF-INTEGRITY-GATE-001'

export const PROMISE_TO_PROOF_CONTINUATION_CARDS = [
  {
    id: PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID,
    title: 'Block V1 closeouts from burying unfinished product promises',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 1,
    source: 'Steve correction on 2026-05-20: V1 is not done if the full idea is not implemented',
    summary: 'Add a ship-gate integrity rule so any V1 card that ships a contract, preflight, synthetic proof, dry-run, metadata-only slice, or blocked capability must name a real continuation card before closeout can pass.',
    whyItMatters: 'Steve should not have to rediscover that a card marked done only shipped scaffolding. If the system closes a partial card, the remaining promise must stay visible as active backlog truth.',
    nextAction: 'Wire the promise-to-proof continuation check into process:ship-check and run the audit over existing done cards.',
    statusNote: 'Opened by promise-to-proof integrity repair. This card is not a feature build; it is the gate that prevents future buried V1 work.',
    owner: 'Foundation Orchestrator',
    originCardIds: [],
  },
  {
    id: 'WEB-GODMODE-LIVE-OPERATOR-002',
    title: 'Build real GOD-mode live browser and video operator proof',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 2,
    source: 'Continuation for WEB-GODMODE-001 after promise-to-proof audit',
    summary: 'Build the actual governed operator that can use an approved browser/session, navigate one approved source, read page text, capture screenshots/keyframes where allowed, inspect video/page state, discover links/resources, preserve timestamps/source links, and file source-backed artifacts.',
    whyItMatters: 'WEB-GODMODE-001 shipped the kernel only. Steve asked for a human-like operator that can see, click, watch, read, and preserve evidence. That capability remains unbuilt.',
    nextAction: 'Start with one public or Steve-approved source. Prove browser/session identity, navigation, screenshot/keyframe capture policy, transcript/page/description/link/resource discovery, artifact storage, stop controls, and no unauthorized private-source access.',
    statusNote: 'Continuation card. WEB-GODMODE-001 remains historical V1 kernel proof only and must not be treated as full GOD-mode extraction.',
    owner: 'Foundation Extractor',
    originCardIds: ['WEB-GODMODE-001', 'MULTIMODAL-EXTRACTOR-001', 'COURSE-SOURCE-AUTH-BOUNDARY-001'],
  },
  {
    id: 'MULTIMODAL-EXTRACTOR-IMPLEMENTATION-002',
    title: 'Implement multimodal extractor beyond the contract',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    source: 'Continuation for MULTIMODAL-EXTRACTOR-001 after promise-to-proof audit',
    summary: 'Implement a bounded multimodal extraction run that produces real evidence from transcript, visual frame/screenshot, page/resource, timestamp, route, and source provenance inputs instead of only validating the envelope contract.',
    whyItMatters: 'MULTIMODAL-EXTRACTOR-001 defined the contract, but the product need is extraction that understands what is said, shown, clicked, demonstrated, and linked.',
    nextAction: 'Use the live GOD-mode operator proof as the input source and produce one governed multimodal artifact with visual/text evidence and explicit missing-evidence reasons.',
    statusNote: 'Continuation card. Contract-only multimodal work is not accepted as implementation.',
    owner: 'Foundation Extractor',
    originCardIds: ['MULTIMODAL-EXTRACTOR-001', 'WEB-GODMODE-001'],
  },
  {
    id: 'EXTRACTION-TEAM-LIVE-WORKER-002',
    title: 'Launch the supervised Extraction Team worker for one bounded run',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: 'Continuation for EXTRACTION-TEAM-001 after promise-to-proof audit',
    summary: 'Turn the supervised Extraction Team contract into one live governed worker run with queue lease, stop controls, artifact/provenance output, failure logging, and no hidden worker behavior.',
    whyItMatters: 'EXTRACTION-TEAM-001 anchored the runtime contract but did not launch a worker. The system still needs proof that the team can perform real extraction safely.',
    nextAction: 'Proof: run one approved no-auth source through the supervised worker path, then prove queue status, artifacts, stop conditions, and review routing.',
    statusNote: 'Continuation card. EXTRACTION-TEAM-001 remains contract-only until a live worker run passes.',
    owner: 'Foundation Runtime',
    originCardIds: ['EXTRACTION-TEAM-001'],
  },
  {
    id: 'EXTRACTOR-BRAIN-FLEET-LIVE-PROOF-002',
    title: 'Run a real extractor proof through Brain Fleet',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Continuation for EXTRACTOR-BRAIN-FLEET-PROOF-001 after promise-to-proof audit',
    summary: 'Run a fresh approved extraction item through Brain Fleet with provider/route ledger truth, source fetch or browser observation, artifact preservation, atoms/review route, duplicate guard, and stop conditions.',
    whyItMatters: 'EXTRACTOR-BRAIN-FLEET-PROOF-001 used an existing archived transcript and skipped provider execution. It did not prove a live extractor path through Brain Fleet.',
    nextAction: 'Use one approved public YouTube or other no-auth item. Prove fresh source acquisition, route/ledger truth, artifact output, and downstream proposal routing.',
    statusNote: 'Continuation card. Existing archived-transcript proof is not full extractor runtime proof.',
    owner: 'Foundation Extractor / Brain Fleet',
    originCardIds: ['EXTRACTOR-BRAIN-FLEET-PROOF-001', 'BRAIN-FLEET-QUOTA-LEDGER-001'],
  },
  {
    id: 'YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002',
    title: 'Build latest-video YouTube scout with visual evidence',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    source: 'Continuation for YOUTUBE-SCOUT-001 after promise-to-proof audit',
    summary: 'Discover current approved creator videos, inspect transcript plus description/links/resources, capture screenshots/keyframes or explicit visual-missing reasons, and produce source-backed Build Intel observations.',
    whyItMatters: 'YOUTUBE-SCOUT-001 consumed existing transcript artifacts only. It did not perform latest-video discovery or visual/video intelligence.',
    nextAction: 'Proof: start with one approved creator and one latest public video; prove video metadata, transcript/description/link extraction, visual evidence policy, artifacts, and Build Intel review route.',
    statusNote: 'Continuation card. Transcript-only scout V1 is not full YouTube intelligence.',
    owner: 'Build Intel / Foundation Extractor',
    originCardIds: [
      'YOUTUBE-SCOUT-001',
      'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
      'EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001',
      'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001',
      'YOUTUBE-BUILD-INTEL-BATCH-001',
    ],
  },
  {
    id: 'YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002',
    title: 'Extract YouTube descriptions, links, downloads, and resources',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: 'Steve correction on YouTube extraction missing descriptions and linked resources',
    summary: 'Extend YouTube Build Intel extraction beyond transcripts to description text, outbound links, download/resource pages, code links, opt-ins, and purchase/approval prompts with source-use boundaries.',
    whyItMatters: 'The valuable implementation material is often in the video description or linked resources, not just the transcript.',
    nextAction: 'For one approved public video, extract transcript plus description links, classify resource/download/purchase links, ask for approval when paid action is required, and store evidence without unauthorized purchases.',
    statusNote: 'Continuation card. Transcript-only runtime proof does not satisfy YouTube Build Intel resource extraction.',
    owner: 'Build Intel / Foundation Extractor',
    originCardIds: [
      'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
      'BUILD-INTEL-OBSERVATION-EXTRACTOR-001',
      'EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001',
      'YOUTUBE-BUILD-INTEL-BATCH-001',
    ],
  },
  {
    id: 'SKOOL-LIVE-NAVIGATION-PROOF-002',
    title: 'Run approved Skool community and lesson navigation proof',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 8,
    source: 'Continuation for SKOOL-WORKER-001 and Steve-provided Skool community link',
    summary: 'After source approval, use a governed session to navigate the approved Skool community/classroom, inspect one lesson or feed item, capture allowed text/visual/resource evidence, and mark progress without broad private scraping.',
    whyItMatters: 'SKOOL-WORKER-001 created a preflight/access matrix only. Steve needs proof the system can move through a course/community like a human under approval.',
    nextAction: 'Use Steve-approved https://www.skool.com/earlyaidopters and/or classroom URL as the approval target, then run one bounded lesson/feed proof with artifacts, screenshots/keyframes policy, links/resources, and stop controls.',
    statusNote: 'Continuation card. Skool preflight is not live Skool extraction.',
    owner: 'Foundation Extractor',
    originCardIds: [
      'SKOOL-WORKER-001',
      'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001',
      'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
      'COURSE-SOURCE-AUTH-BOUNDARY-001',
    ],
  },
  {
    id: 'MYICOR-LIVE-NAVIGATION-PROOF-002',
    title: 'Run approved MyICOR course navigation proof',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 9,
    source: 'Continuation for MYICRO-TRAINING-001 after promise-to-proof audit',
    summary: 'After source approval, navigate one approved MyICOR/myICRO lesson or module, watch/read/capture allowed evidence, preserve resources and progress, and file source-backed doctrine observations.',
    whyItMatters: 'MYICRO-TRAINING-001 prepared preflight only. The real capability is course/app navigation and extraction under approval.',
    nextAction: 'Prepare exact source approval, then run one bounded lesson proof with browser/session preflight, lesson progress evidence, video/text/resource capture, timestamps, and stop controls.',
    statusNote: 'Continuation card. MyICOR preflight is not paid-course extraction.',
    owner: 'Foundation Extractor',
    originCardIds: ['MYICRO-TRAINING-001', 'MYICOR-EXTRACTION-PREFLIGHT-001', 'COURSE-SOURCE-AUTH-BOUNDARY-001'],
  },
  {
    id: 'MEETING-VIDEO-LIVE-RECORDING-PROOF-002',
    title: 'Run approved meeting-video recording proof',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 10,
    source: 'Continuation for MEETING-VIDEO-001 after promise-to-proof audit',
    summary: 'Use one approved meeting recording or linked media item to prove video/audio/text/visual extraction, timestamps, source links, artifact storage, and privacy boundaries.',
    whyItMatters: 'MEETING-VIDEO-001 shipped a preflight over manifests, not live recording understanding.',
    nextAction: 'Select one approved meeting media source and run a bounded proof through the multimodal/GOD-mode pipeline.',
    statusNote: 'Continuation card. Meeting media preflight is not meeting-video understanding.',
    owner: 'Foundation Extractor',
    originCardIds: ['MEETING-VIDEO-001'],
  },
  {
    id: 'DRIVE-WORKER-LIVE-CONTENT-EXTRACTION-002',
    title: 'Run approved Drive content extraction worker proof',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 11,
    source: 'Continuation for DRIVE-WORKER-001 and source extraction gaps',
    summary: 'Run a bounded approved Drive content extraction worker that reads one allowed file class, extracts useful content, preserves provenance, and records unsupported/blocked file classes honestly.',
    whyItMatters: 'Drive contains strategy, SOPs, training, and assets. Inventory/preflight is not enough if the system cannot extract useful source-backed content.',
    nextAction: 'Pick one approved Drive file class and run a no-permission-mutation extraction proof with artifact and source maturity updates.',
    statusNote: 'Continuation card. Drive inventory/control proof is not broad Drive content extraction.',
    owner: 'Foundation Extractor',
    originCardIds: ['DRIVE-WORKER-001', 'DRIVE-CONTENT-001'],
  },
  {
    id: 'BRAIN-FLEET-PROVIDER-EXECUTION-PROOF-002',
    title: 'Prove Brain Fleet provider execution with quota ledger',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 12,
    source: 'Continuation for Brain Fleet foundation, model capability, quota ledger, and route cards',
    summary: 'Run one approved provider/model call through Brain Fleet using capability registry, quota ledger, route truth, stop controls, artifact linkage, and provider execution proof.',
    whyItMatters: 'Brain Fleet foundation cards registered contracts, routes, and ledgers, but several proofs intentionally skipped provider execution.',
    nextAction: 'Proof: choose one low-cost approved workload and prove provider execution, ledger row, artifact reference, quota/reset posture, and failure behavior.',
    statusNote: 'Continuation card. Route/ledger/capability registration is not operational Brain Fleet execution.',
    owner: 'Brain Fleet',
    originCardIds: ['BRAIN-FLEET-FOUNDATION-001', 'BRAIN-FLEET-QUOTA-LEDGER-001', 'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001', 'GEMINI-VIDEO-BRAIN-ROUTE-001', 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001'],
  },
  {
    id: 'HARLAN-AUTH-LIVE-DELIVERY-002',
    title: 'Prove live Harlan auth notification and resume loop',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 13,
    source: 'Continuation for HARLAN-AUTH-ESCALATION-LOOP-001 after promise-to-proof audit',
    summary: 'Turn the Harlan auth escalation dry-run into one approved live delivery proof: notify Steve, wait for DONE, reverify, resume or fail closed, and record the full loop.',
    whyItMatters: 'HARLAN-AUTH-ESCALATION-LOOP-001 built the contract/draft only. The system still has not proven real notification delivery and resume behavior.',
    nextAction: 'Proof: use one safe synthetic auth-needed event and one approved delivery channel; prove dedupe/no-spam, delivery, DONE handling, reverify, and fail-closed timeout.',
    statusNote: 'Continuation card. Dry-run auth escalation is not live Harlan auth resolution.',
    owner: 'Harlan / Foundation Runtime',
    originCardIds: ['HARLAN-AUTH-ESCALATION-LOOP-001'],
  },
  {
    id: 'ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002',
    title: 'Prove action routes can resolve work, not just queue proposals',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 14,
    source: 'Continuation for action route proposal/review cards after promise-to-proof audit',
    summary: 'Move one approved source-backed recommendation from pending review through approval, apply/resolution, and evidence trail without unsafe external mutation.',
    whyItMatters: 'Action-route work is mostly pending/proposal-only. Foundation is not useful if source intelligence never resolves into approved action or explicit ignore.',
    nextAction: 'Proof: pick one safe internal route and prove approve/apply/resolved state, owner, source links, and rollback/ignore path.',
    statusNote: 'Continuation card. Review inbox and proposal-only routes are not completed action execution.',
    owner: 'Foundation Action Router',
    originCardIds: [
      'ACTION-ROUTE-REVIEW-INBOX-001',
      'ACTION-ROUTE-PROMOTION-WORKFLOW-001',
      'EXTRACTION-TO-KB-ATOM-PIPELINE-001',
      'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
      'RESEARCH-INBOX-001',
    ],
  },
  {
    id: 'RUNTIME-FIRST-JOBS-LIVE-SCHEDULE-PROOF-002',
    title: 'Prove first live scheduled runtime jobs actually run',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 15,
    source: 'Continuation for RUNTIME-FIRST-JOBS-001 after promise-to-proof audit',
    summary: 'Prove first safe scheduled jobs lease, run, record output, recover from stale state, and remain visible in runtime health without pretending dry-run parser proof is activation.',
    whyItMatters: 'RUNTIME-FIRST-JOBS-001 repaired seams and dry-run proof, but did not activate new live jobs or schedules.',
    nextAction: 'Proof: select one safe no-auth scheduled job and prove lease/run/output/staleness handling through worker/runtime health.',
    statusNote: 'Continuation card. Runtime dry-run/import repair is not live scheduled job activation.',
    owner: 'Foundation Runtime',
    originCardIds: ['RUNTIME-FIRST-JOBS-001'],
  },
  {
    id: 'EXTRACTION-TARGET-RETRY-RUNNERS-002',
    title: 'Build target-specific extraction retry runners',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 16,
    source: 'Continuation for extraction control/retry V1 cards after promise-to-proof audit',
    summary: 'Build target-specific retry runners for Drive, video, email attachments, Skool/Loom/course lanes, and other high-variance extraction targets instead of proving only meetings-current-day retry behavior.',
    whyItMatters: 'Extraction reliability cannot depend on whole-window reruns or a single meetings retry path. Failed items need bounded target-specific retry behavior with honest unsupported-target blocks.',
    nextAction: 'Start with one safe no-auth target after GOD-mode/source proof. Prove retryable item selection, lease/backoff, success/exhaustion, unsupported-target blocking, runtime health visibility, and no broad source mutation.',
    statusNote: 'Continuation card. Extraction retry/control V1 proved the policy and one meetings retry path, not broad target retry execution.',
    owner: 'Foundation Runtime / Extractor',
    originCardIds: ['EXTRACT-RETRY-001', 'EXTRACT-RUN-HARDENING-EXECUTION-001', 'EXTRACT-CONTROL-001'],
  },
  {
    id: 'HARLAN-LIVE-OPERATOR-RUNTIME-002',
    title: 'Build Harlan live operator runtime beyond source answers',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 17,
    source: 'Continuation for Harlan operator-loop and old-system agent harvest V1 cards after promise-to-proof audit',
    summary: 'Turn Harlan from source-backed read/answer contracts into a live governed operator surface with runtime identity, allowed actions, auth boundaries, UI or message surface, memory/profile use, and explicit stop controls.',
    whyItMatters: 'Harlan operator-loop V1 answered from Foundation truth but did not build live runtime, UI, voice/avatar, Telegram/message behavior, connector reach, or external-action authority.',
    nextAction: 'After GOD-mode and Brain Fleet route proof stabilize, define one safe Harlan runtime loop and prove fresh source inputs, operator response, allowed action boundary, auth escalation handoff, audit trail, and fail-closed behavior.',
    statusNote: 'Continuation card. Harlan source-answer and onboarding-harvest cards are not full live Harlan runtime.',
    owner: 'Harlan / Foundation Runtime',
    originCardIds: ['HARLAN-OPERATOR-LOOP-V1-001', 'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001'],
  },
  {
    id: 'MEETING-VAULT-LIVE-ACL-ENFORCEMENT-002',
    title: 'Prove approved Meeting Vault ACL mutation path',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 18,
    source: 'Continuation for MEETING-VAULT-ACL-001 after promise-to-proof audit',
    summary: 'Move Meeting Vault ACL enforcement from report-only/dry-run evidence to one approved live or explicitly simulated mutation proof with owner-preserving permissions, rollback posture, and audit trail.',
    whyItMatters: 'Raw meeting-note protection is not truly operational if the system only reports unsafe access and never proves the approved enforcement path.',
    nextAction: 'Proof scope: select one approved low-risk fixture or live file. Prove sensitivity classification, exact permission delta, owner preservation, approval boundary, mutation or approved simulation, and rollback/audit evidence.',
    statusNote: 'Continuation card. Meeting Vault report-only auto-enforcement is not live ACL enforcement.',
    owner: 'Foundation Security / Meeting Vault',
    originCardIds: ['MEETING-VAULT-ACL-001', 'MEETING-VAULT-AUTO-ENFORCEMENT-001'],
  },
  {
    id: 'LLM-ROUTER-LIVE-PROVIDER-BOUNDARY-PROOF-002',
    title: 'Prove LLM router live provider boundary',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 19,
    source: 'Continuation for MODEL-ROUTING-001 and LLM-ROUTER-001 after promise-to-proof audit',
    summary: 'Prove the router can execute one approved provider/model path through the governed boundary, record route/ledger truth, and fail closed for unsupported, unauthenticated, or over-budget routes.',
    whyItMatters: 'Model-routing and LLM-router V1 cards proved doctrine, planning, and dry-run logging. They did not prove that a real model reviewed anything under governed runtime controls.',
    nextAction: 'Proof scope: choose one low-cost approved provider call after Brain Fleet quota posture is clear. Prove route selection, provider execution or explicit auth-needed stop, ledger row, artifact reference, and no raw credential mutation.',
    statusNote: 'Continuation card. Dry-run router rows are not live model execution proof.',
    owner: 'Brain Fleet / LLM Runtime',
    originCardIds: ['MODEL-ROUTING-001', 'LLM-ROUTER-001', 'LLM-AUTH-AUDIT-001'],
  },
  {
    id: 'CODEX-DIRECT-SCHEDULED-BOUNDARY-PROOF-002',
    title: 'Prove Codex direct route scheduled boundary',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 20,
    source: 'Continuation for CODEX-DIRECT-SUBSCRIPTION-ROUTE-001 after promise-to-proof audit',
    summary: 'Prove whether Codex direct subscription routing can be used safely for scheduled or extractor workloads, or lock it as local-tooling-only with explicit runtime rejection.',
    whyItMatters: 'The direct Codex route shipped a bounded local CLI probe. Steve needs subscription routes to reduce paid API burn only when the boundary is real and safe, not implied by a local probe.',
    nextAction: 'Proof scope: run one safe scheduled-boundary check. Prove allowed workload classes, rejected workload classes, ledger/quota posture, auth-needed behavior, and no hidden background Codex execution.',
    statusNote: 'Continuation card. A local Codex probe is not proof of scheduled/extractor production use.',
    owner: 'Brain Fleet / Codex Route',
    originCardIds: ['CODEX-DIRECT-SUBSCRIPTION-ROUTE-001'],
  },
  {
    id: 'OPENCLAW-LIVE-ADAPTER-PROBE-002',
    title: 'Prove OpenClaw live adapter boundary',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 21,
    source: 'Continuation for OPENCLAW-ADAPTER-BOUNDARY-001 after promise-to-proof audit',
    summary: 'Move OpenClaw adapter work from metadata/fallback proof into one governed live adapter probe or explicit unavailable-state proof with gateway behavior, route posture, quota/reset truth, and failure boundaries.',
    whyItMatters: 'OPENCLAW-ADAPTER-BOUNDARY-001 proved no provider calls and no gateway mutation. It did not prove OpenClaw can serve as an operational adapter.',
    nextAction: 'Proof scope: perform one safe OpenClaw readiness/live-probe path if credentials/runtime exist, otherwise prove unavailable-state handling, blocked routing, quota/reset posture, and clear operator next action.',
    statusNote: 'Continuation card. Metadata/fallback adapter proof is not live OpenClaw adapter behavior.',
    owner: 'Brain Fleet / OpenClaw',
    originCardIds: ['OPENCLAW-ADAPTER-BOUNDARY-001'],
  },
  {
    id: 'BRAIN-FLEET-QUOTA-RESET-ENFORCEMENT-PROOF-002',
    title: 'Prove Brain Fleet quota and reset enforcement',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 22,
    source: 'Continuation for Brain Fleet quota ledger and subscription/native route unknowns after promise-to-proof audit',
    summary: 'Prove quota/reset enforcement for at least one provider/API route and one subscription/local route class, including unknown reset handling, stop conditions, and operator-visible ledger truth.',
    whyItMatters: 'A quota ledger that records skipped rows is useful bookkeeping, but it does not yet protect Steve from hidden token burn or ambiguous subscription limits.',
    nextAction: 'Proof scope: use one low-cost approved workload and one no-execution/unknown-reset route. Prove quota allowance, rate/auth/over-budget stop decisions, reset-time behavior, ledger visibility, and no credential mutation.',
    statusNote: 'Continuation card. Quota ledger visibility is not quota enforcement proof.',
    owner: 'Brain Fleet',
    originCardIds: [
      'BRAIN-FLEET-QUOTA-LEDGER-001',
      'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001',
      'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001',
      'OPENCLAW-ADAPTER-BOUNDARY-001',
    ],
  },
  {
    id: 'FOUNDATION-KB-PERSISTED-PAGE-INDEX-002',
    title: 'Build persisted Foundation KB page index',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 23,
    source: 'Continuation for FOUNDATION-KB-COMPILER-V1-001 after promise-to-proof audit',
    summary: 'Move Foundation KB from proposal-only compiled drafts into a durable indexed knowledge page store with provenance, review state, freshness, and search/query readiness.',
    whyItMatters: 'Draft KB packets are not durable absorption. Steve needs extracted lessons and system knowledge to become findable, source-backed operating memory instead of another transient review queue.',
    nextAction: 'Proof scope: persist one approved KB page/index entry from an existing source-backed proposal, prove provenance, review state, lookup/search visibility, stale/update behavior, and no unapproved source copying.',
    statusNote: 'Continuation card. FOUNDATION-KB-COMPILER-V1-001 shipped proposal-only KB drafts, not a persisted KB index.',
    owner: 'Foundation Knowledge',
    originCardIds: ['FOUNDATION-KB-COMPILER-V1-001'],
  },
  {
    id: 'EXTRACTION-TO-KB-ATOM-PERSISTENCE-002',
    title: 'Persist approved extraction outputs as KB atoms',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 24,
    source: 'Continuation for EXTRACTION-TO-KB-ATOM-PIPELINE-001 after promise-to-proof audit',
    summary: 'Turn the extraction-to-KB/atom proposal contract into one approved persistence path that writes durable KB/atom/fact records with source anchors, review state, and rollback/ignore posture.',
    whyItMatters: 'Extraction is not useful if valuable observations stop as proposals and never become durable source-backed memory or action candidates.',
    nextAction: 'Proof scope: take one approved extraction proposal, persist the KB/atom/fact record, prove source links, review/apply state, duplicate guard, rollback/ignore path, and verifier coverage.',
    statusNote: 'Continuation card. Proposal-only extraction-to-KB/atom contract is not durable absorption.',
    owner: 'Foundation Knowledge / Extractor',
    originCardIds: ['EXTRACTION-TO-KB-ATOM-PIPELINE-001', 'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001'],
  },
  {
    id: 'BUILD-INTEL-REVIEW-TO-ACTION-PROOF-002',
    title: 'Prove Build Intel review resolves into action',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 25,
    source: 'Continuation for BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001 after promise-to-proof audit',
    summary: 'Move one Build Intel review item from pending proposal through approved action, durable record, archive/ignore alternative, and closed-loop evidence.',
    whyItMatters: 'A review queue that never resolves creates the same drift problem in a different place. Build Intel must become approved action or explicit no-op, not permanent pending work.',
    nextAction: 'Proof scope: select one safe Build Intel item, approve or reject it, apply one internal action or durable record, prove owner/source/evidence trail, and show the closed/ignored path.',
    statusNote: 'Continuation card. Proposal review is not completed source-to-action behavior.',
    owner: 'Build Intel / Action Router',
    originCardIds: ['BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001', 'BUILD-INTEL-OBSERVATION-EXTRACTOR-001'],
  },
  {
    id: 'DECISION-ROUTE-LOCK-DOCTRINE-PROOF-002',
    title: 'Prove decision routes can lock doctrine',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 26,
    source: 'Continuation for DECISION-004 and DECISION-008 after promise-to-proof audit',
    summary: 'Move one route-derived proposed decision from review into locked/applied doctrine or explicit rejected state with source anchors, owner approval, and verifier-visible outcome.',
    whyItMatters: 'Decision capture is not enough. If doctrine stays proposed/pending forever, the system keeps relearning the same rules without making them operational.',
    nextAction: 'Proof scope: choose one low-risk proposed decision, approve/apply or reject it, update the durable doctrine/decision record, prove source/evidence trail, and verify stale/weak lock-in is blocked.',
    statusNote: 'Continuation card. Pending-decision review and accountability-doctrine proposal work are not applied doctrine.',
    owner: 'Foundation Decisions',
    originCardIds: ['DECISION-004', 'DECISION-008'],
  },
  {
    id: 'STRATEGY-OPERATOR-ACTION-CARD-PROMOTION-002',
    title: 'Promote Strategy intelligence into operator action cards',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 27,
    source: 'Continuation for strategy/scoper proposal-only cards after promise-to-proof audit',
    summary: 'Turn one source-backed Strategy or Intel Scoper proposal into an approved operator action card with acceptance criteria, source anchors, owner, and resolution path.',
    whyItMatters: 'Strategy intelligence is only valuable when it changes real operator work. Read-only strategy atoms and scoper proposals should produce approved action cards or explicit no-ops.',
    nextAction: 'Proof scope: pick one approved Strategy/Scoper proposal, promote it into a backlog/action card, prove source anchors, acceptance criteria, owner, current lane, and rollback/archive path.',
    statusNote: 'Continuation card. Strategy read-only/proposal surfaces are not operator action-card promotion.',
    owner: 'Strategy / Foundation Action Router',
    originCardIds: ['STRATEGIC-INTEL-001', 'INTEL-SCOPER-001', 'STRATEGY-001', 'GOV-001'],
  },
  {
    id: 'CEO-OPERATOR-INTELLIGENCE-CARDS-002',
    title: 'Build source-backed CEO operator intelligence cards',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 28,
    source: 'Continuation for CEO-DASHBOARD-PATTERN-001 and operator pulse after promise-to-proof audit',
    summary: 'Build the real CEO/operator intelligence card surface: source-backed cards that show what changed, what it means, what to review, what is blocked, what action is next, and how it resolves.',
    whyItMatters: 'A dashboard pattern is not a working operator intelligence system. Steve needs cards that convert source truth and backlog state into reviewable decisions and next actions.',
    nextAction: 'Proof scope: render one real source-backed operator card with source IDs, recommendation, action route/review state, blocked/next state, resolution evidence, and no static snapshot drift.',
    statusNote: 'Continuation card. CEO dashboard pattern and pulse surfaces are not full CEO operator intelligence cards.',
    owner: 'CEO Dashboard / Foundation UI',
    originCardIds: ['CEO-DASHBOARD-PATTERN-001', 'FOUNDATION-OPERATOR-PULSE-001', 'FOUNDATION-SURFACE-UPDATES-001'],
  },
]

export const PROMISE_TO_PROOF_ORIGIN_UPDATES = PROMISE_TO_PROOF_CONTINUATION_CARDS
  .flatMap(card => (card.originCardIds || []).map(originId => ({
    originId,
    continuationId: card.id,
  })))

const LIMITATION_RE = /\b(no live|not live|dry[- ]run|no-send|draft only|preflight|approval[- ]bound|contract only|kernel\/proof|synthetic only|fixture only|local html fixture|metadata-only|proposal-only|read-only|report-only|provider execution (?:is )?skipped|no browser|no network|no extraction|no crawl|no transcript|no screenshot|no keyframes|no OCR|no vision|no model|no provider|no runtime|workers? unlaunched|parked|blocked|not built)\b/i
const PRODUCT_CAPABILITY_RE = /\b(GOD-mode|extractor|crawler|crawl|browser|watch videos|video|YouTube|Skool|MyICOR|Mycro|Loom|course|transcript|screenshot|keyframe|multimodal|Brain Fleet|LLM router|model routing|provider execution|model capability|Codex direct|Gemini video|Claude Code|OpenClaw adapter|Harlan[- ]auth|auth escalation|action route|KB compiler|KB page|KB atom|knowledge base|Build Intel review|Build Intel extraction|Build Intel YouTube|decision route|doctrine proof|Strategy operator|CEO dashboard|operator intelligence|source worker)\b/i
const HIGH_INTENT_PRODUCT_RE = /\b(GOD-mode|YouTube|Skool|MyICOR|Mycro|Loom|Brain Fleet|LLM router|provider execution|Codex direct|Gemini video|Claude Code|OpenClaw adapter|Harlan[- ]auth|auth escalation|KB compiler|KB page|KB atom|Build Intel review|Build Intel extraction|CEO dashboard|operator intelligence)\b/i
const PROCESS_CARD_RE = /\b(cleanup|repair|split|migration|refactor|budget|gate|guard|verifier|parser|registry|route split|store split|module split|monolith split|preflight|hygiene|contract|boundary|readiness|freshness|status|payload|ledger|metrics|schedule|source maturity|harness|staging|smoke test|inventory|true-up|portability|validation|audit|eval|synthesis|reconcile|scoring|matrix|quality|review sprint|package ux|surface|identity|access request|sprint system|lessons learned|propagation)\b/i
const V1_RE = /\b(v1|V1)\b|-[0-9]{3}\b/
const CARD_ID_RE = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-[0-9]{3}\b/g

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function textBlock(...parts) {
  return parts.flatMap(part => Array.isArray(part) ? part : [part]).filter(Boolean).join('\n')
}

export function extractMentionedCardIds(text = '') {
  return Array.from(new Set(String(text || '').match(CARD_ID_RE) || []))
}

export function buildBacklogMap(backlogItems = []) {
  return new Map((Array.isArray(backlogItems) ? backlogItems : []).map(item => [item.id, item]))
}

export function findOpenContinuationCards({ card = {}, closeout = {}, backlogItems = [] } = {}) {
  const backlogMap = buildBacklogMap(backlogItems)
  const ownIds = new Set([card?.id, ...normalizeList(closeout?.backlogIds)])
  const text = textBlock(
    card?.nextAction,
    card?.statusNote,
    closeout?.reviewNext,
    closeout?.knownLimits,
    closeout?.mentionedBacklogIds,
  )
  const mentionedContinuations = extractMentionedCardIds(text)
    .filter(id => !ownIds.has(id))
    .map(id => backlogMap.get(id))
    .filter(item => item && item.lane !== 'done')
  return mentionedContinuations
}

export function evaluateCloseoutPromiseContinuation({ card = {}, closeout = {}, backlogItems = [] } = {}) {
  const promiseText = textBlock(card?.id, card?.title, card?.summary, card?.whyItMatters)
  const proofText = textBlock(
    closeout?.key,
    closeout?.whatChanged,
    closeout?.whatItDoes,
    closeout?.whyItMatters,
    closeout?.proofStatus,
    closeout?.knownLimits,
    closeout?.reviewNext,
    card?.nextAction,
    card?.statusNote,
  )
  const operationalLimitText = textBlock(
    closeout?.knownLimits,
    closeout?.reviewNext,
    card?.nextAction,
    card?.statusNote,
  )
  const isProcessCard = PROCESS_CARD_RE.test(textBlock(card?.id, card?.title, closeout?.key)) &&
    !HIGH_INTENT_PRODUCT_RE.test(promiseText)
  const needsContinuation = Boolean(
    !isProcessCard &&
      V1_RE.test(textBlock(closeout?.key, proofText, card?.id)) &&
      PRODUCT_CAPABILITY_RE.test(promiseText) &&
      LIMITATION_RE.test(textBlock(operationalLimitText, proofText)),
  )
  const continuations = findOpenContinuationCards({ card, closeout, backlogItems })
  return {
    ok: !needsContinuation || continuations.length > 0,
    needsContinuation,
    continuationIds: continuations.map(item => item.id),
    reason: needsContinuation
      ? continuations.length
        ? 'partial capability has open continuation card'
        : 'partial V1 capability closeout has no open continuation card'
      : 'closeout does not look like a limited V1 capability claim',
  }
}

export function buildPromiseToProofAudit({ backlogItems = [] } = {}) {
  const backlogMap = buildBacklogMap(backlogItems)
  const cards = PROMISE_TO_PROOF_CONTINUATION_CARDS.map(card => {
    const live = backlogMap.get(card.id) || null
    return {
      id: card.id,
      exists: Boolean(live),
      lane: live?.lane || null,
      priority: live?.priority || null,
      originCardIds: card.originCardIds || [],
    }
  })
  const originUpdates = PROMISE_TO_PROOF_ORIGIN_UPDATES.map(update => {
    const origin = backlogMap.get(update.originId) || null
    const continuation = backlogMap.get(update.continuationId) || null
    const originText = textBlock(origin?.nextAction, origin?.statusNote)
    return {
      ...update,
      originExists: Boolean(origin),
      continuationExists: Boolean(continuation),
      continuationOpen: Boolean(continuation && continuation.lane !== 'done'),
      originMentionsContinuation: originText.includes(update.continuationId),
    }
  })
  const missingCards = cards.filter(card => !card.exists)
  const closedContinuations = cards.filter(card =>
    card.id !== PROMISE_TO_PROOF_INTEGRITY_GATE_CARD_ID &&
      card.exists &&
      card.lane === 'done',
  )
  const missingOriginLinks = originUpdates.filter(update =>
    update.originExists &&
      update.continuationExists &&
      !update.originMentionsContinuation,
  )
  return {
    ok: missingCards.length === 0 && closedContinuations.length === 0 && missingOriginLinks.length === 0,
    cards,
    originUpdates,
    missingCards,
    closedContinuations,
    missingOriginLinks,
  }
}

export function buildPromiseToProofDogfoodProof() {
  const partialCard = {
    id: 'WEB-GODMODE-001',
    title: 'Build governed website GOD-mode extraction worker',
    summary: 'Build browser-capable extraction worker that can navigate like a human and watch videos.',
    nextAction: 'Closed under web-godmode-v1.',
    statusNote: 'V1 kernel proof only. No browser launched.',
  }
  const partialCloseout = {
    key: 'web-godmode-v1',
    backlogIds: ['WEB-GODMODE-001'],
    whatChanged: 'Added kernel.',
    whatItDoes: 'Synthetic fixture only.',
    knownLimits: ['No live browser launch, no extraction, no model call.'],
    reviewNext: 'Continue cleanup.',
  }
  const continuation = {
    id: 'WEB-GODMODE-LIVE-OPERATOR-002',
    lane: 'scoped',
  }
  const rejected = evaluateCloseoutPromiseContinuation({
    card: partialCard,
    closeout: partialCloseout,
    backlogItems: [partialCard],
  })
  const accepted = evaluateCloseoutPromiseContinuation({
    card: {
      ...partialCard,
      nextAction: 'Continue WEB-GODMODE-LIVE-OPERATOR-002.',
    },
    closeout: {
      ...partialCloseout,
      reviewNext: 'Continue WEB-GODMODE-LIVE-OPERATOR-002.',
    },
    backlogItems: [partialCard, continuation],
  })
  const clean = evaluateCloseoutPromiseContinuation({
    card: {
      id: 'FOUNDATION-CLEANUP-001',
      title: 'Split cleanup module',
      summary: 'Move helper code into a smaller file.',
    },
    closeout: {
      key: 'foundation-cleanup-v1',
      backlogIds: ['FOUNDATION-CLEANUP-001'],
      whatChanged: 'Moved helper code.',
      knownLimits: [],
      reviewNext: 'No continuation required.',
    },
    backlogItems: [],
  })
  const activeSelfIsNotContinuation = evaluateCloseoutPromiseContinuation({
    card: {
      ...partialCard,
      lane: 'executing',
    },
    closeout: partialCloseout,
    backlogItems: [{ ...partialCard, lane: 'executing' }],
  })
  const processGate = evaluateCloseoutPromiseContinuation({
    card: {
      id: 'RUNTIME-VERIFIER-SPLIT-001',
      title: 'Split runtime verifier module',
      summary: 'Move runtime verifier helper code into a smaller module and keep checks green.',
    },
    closeout: {
      key: 'runtime-verifier-split-v1',
      backlogIds: ['RUNTIME-VERIFIER-SPLIT-001'],
      whatChanged: 'Split verifier helpers.',
      proofStatus: 'Focused proof includes synthetic dogfood for verifier behavior.',
      knownLimits: ['This card does not execute live runtime jobs or mutate external systems.'],
      reviewNext: 'No continuation required.',
    },
    backlogItems: [],
  })
  return {
    ok: rejected.ok === false &&
      accepted.ok === true &&
      clean.ok === true &&
      activeSelfIsNotContinuation.ok === false &&
      processGate.ok === true,
    rejected,
    accepted,
    clean,
    activeSelfIsNotContinuation,
    processGate,
  }
}
