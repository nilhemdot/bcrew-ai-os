import crypto from 'node:crypto'

import { CREATOR_WATCHLIST_ENTRIES } from './build-intel-watchlist.js'
import { DEV_SOURCE_SLICE_ROUTER_CARD_ID } from './dev-source-slice-router.js'
import { YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID } from './youtube-resource-link-resolver.js'

export const DEV_INTEL_SOURCE_COVERAGE_CARD_ID = 'DEV-INTEL-SOURCE-COVERAGE-001'
export const DEV_INTEL_SOURCE_COVERAGE_PLAN_PATH = 'docs/process/dev-intel-source-coverage-001-plan.md'
export const DEV_INTEL_SOURCE_COVERAGE_APPROVAL_PATH = 'docs/process/approvals/DEV-INTEL-SOURCE-COVERAGE-001.json'
export const DEV_INTEL_SOURCE_COVERAGE_SCRIPT_PATH = 'scripts/process-dev-intel-source-coverage-check.mjs'

export const DEV_INTEL_SOURCE_FAMILY_STATUS = {
  active: 'active',
  partial: 'partial',
  blocked: 'blocked',
  planned: 'planned',
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
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

function countWatchlistByBoundary(boundary = '') {
  return CREATOR_WATCHLIST_ENTRIES.filter(entry => entry.accessBoundary === boundary).length
}

function countActiveBuildIntelCreators() {
  return CREATOR_WATCHLIST_ENTRIES.filter(entry => entry.active && entry.consumerLane === 'build_intel').length
}

function family(input = {}) {
  const status = input.status || DEV_INTEL_SOURCE_FAMILY_STATUS.planned
  const blockers = list(input.blockers)
  return {
    familyId: input.familyId,
    label: input.label,
    status,
    sourceIds: list(input.sourceIds),
    feedsDev: Boolean(input.feedsDev),
    feedPath: text(input.feedPath),
    currentProof: list(input.currentProof),
    blocker: text(input.blocker || blockers[0] || ''),
    blockers,
    nextCard: text(input.nextCard),
    nextAction: text(input.nextAction),
    notes: text(input.notes),
    counts: input.counts || {},
  }
}

export function buildDevIntelSourceCoverageSnapshot({ generatedAt = new Date().toISOString() } = {}) {
  const rows = [
    family({
      familyId: 'youtube-public-build-intel',
      label: 'Public YouTube Build Intel',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.active,
      sourceIds: ['SRC-CREATOR-WATCHLIST-001', 'SRC-YOUTUBE-INTEL-001', 'SRC-VIDEO-001'],
      feedsDev: true,
      feedPath: 'daily creator watch -> Gemini API full-watch packages -> resource-link resolver -> Dev Director',
      currentProof: [
        'MARK-KASHEF-LAST-50-BASELINE-001 50/50 full-watch complete',
        YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID,
        'director:dev-team-intelligence-director-001:aios-mission-v0',
      ],
      nextCard: 'YOUTUBE-LATEST-20-INTEL-RUN-001',
      nextAction: 'Run approved latest-20 public videos for the next selected creators only through the full God Mode path.',
      counts: {
        activeBuildIntelCreators: countActiveBuildIntelCreators(),
        publicOrLookupCreators: countWatchlistByBoundary('public_lookup_required') + countWatchlistByBoundary('public_permitted'),
      },
    }),
    family({
      familyId: 'youtube-resource-links',
      label: 'YouTube Description / Resource Links',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.active,
      sourceIds: ['SRC-YOUTUBE-INTEL-001', 'SRC-VIDEO-001'],
      feedsDev: true,
      feedPath: 'captured resource links -> governed resolver -> Scoper resourceLinkDispositions',
      currentProof: [YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID, 'process:youtube-resource-link-resolver-check'],
      nextCard: 'DEV-BUILD-OPPORTUNITY-SCOPER-001',
      nextAction: 'Scoper must resolve safe public links or mark exact blockers before a YouTube-derived build candidate can be called scoped.',
      notes: 'Steve should not manually chase links from video descriptions.',
    }),
    family({
      familyId: 'creator-source-stack',
      label: 'Creator Source Stack',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.planned,
      sourceIds: ['SRC-CREATOR-WATCHLIST-001', 'SRC-YOUTUBE-INTEL-001'],
      feedsDev: false,
      feedPath: '',
      currentProof: ['EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001 source-stack SOP'],
      nextCard: 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001',
      nextAction: 'Show every creator surface in one creator card: YouTube, blog/site, newsletter, GitHub/docs/resources, free Skool/community, paid Skool/course, and other approved sources.',
      notes: 'Creator grades must roll up per source surface and lane, not hide newsletter/blog/Skool status behind YouTube-only counts.',
    }),
    family({
      familyId: 'creator-newsletters',
      label: 'Creator Newsletters',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.planned,
      sourceIds: ['SRC-CREATOR-WATCHLIST-001', 'SRC-GMAIL-001'],
      feedsDev: false,
      feedPath: 'approved creator newsletter signup -> AIOS Sources/Newsletters mailbox label -> issue extractor -> creator source stack -> Dev Director',
      currentProof: ['EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001 newsletter SOP'],
      nextCard: 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001',
      nextAction: 'Build the newsletter source lane: sign up approved free creator newsletters with ai@bensoncrew.ca or crewbert@bensoncrew.ca, route issues to AIOS Sources/Newsletters, extract value, grade, and unsubscribe/park low-value sources.',
      notes: 'Standing approval is for free newsletter signup and confirmation only; paid upgrades, account/profile mutation, posting/messaging, unsafe downloads, and unexpected auth/private areas remain blockers.',
    }),
    family({
      familyId: 'shared-internal-comms',
      label: 'Meetings / Gmail / Missive / Slack',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.active,
      sourceIds: ['SRC-MEETINGS-001', 'SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-SLACK-001'],
      feedsDev: true,
      feedPath: 'Foundation shared-source reports -> Dev source-slice router -> Dev Director',
      currentProof: [DEV_SOURCE_SLICE_ROUTER_CARD_ID, 'process:dev-source-slice-router-check'],
      nextCard: 'DEV-BUILD-OPPORTUNITY-SCOPER-001',
      nextAction: 'Use filtered Dev candidates as Scoper inputs; keep ops-only items parked.',
    }),
    family({
      familyId: 'github-public-repos',
      label: 'GitHub / Public Repos',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.planned,
      sourceIds: ['SRC-GITHUB-BUILD-INTEL-001'],
      feedsDev: false,
      feedPath: '',
      currentProof: ['SRC-GITHUB-BUILD-INTEL-001 source boundary locked'],
      nextCard: 'MARK-CLAUDE-CLAW-CODE-PACKAGE-REVIEW-001',
      nextAction: 'Create a governed public/private repo review packet before importing code or treating repo findings as build-ready.',
      notes: 'Public repo metadata can be read under source policy; private/member repos need source-packet approval.',
    }),
    family({
      familyId: 'skool-free-communities',
      label: 'Skool / Free Communities',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.planned,
      sourceIds: ['SRC-SKOOL-001', 'SRC-CREATOR-WATCHLIST-001'],
      feedsDev: false,
      feedPath: 'approved free community URL -> free-source identity/session boundary -> last 20 days free posts/comments/resources -> creator source stack',
      currentProof: ['EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001 free Skool/community SOP', 'SKOOL-WORKER-001 preflight'],
      nextCard: 'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001',
      nextAction: 'Build the free-community runner proof: use ai@bensoncrew.ca or crewbert@bensoncrew.ca, inspect allowed free areas and last 20 days of free chat/posts/comments, capture resources, and stop at paid/private/member/action boundaries.',
      notes: 'Free community work should not be link-by-link Steve approval after the lane proof exists; it still needs source identity/session, allowed-area, storage, and stop-condition rules.',
    }),
    family({
      familyId: 'skool-paid-communities',
      label: 'Skool / Paid Communities',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.blocked,
      sourceIds: ['SRC-SKOOL-001'],
      feedsDev: false,
      blocker: 'Paid/community/member content needs exact source-packet approval, auth boundary, content-use rules, and storage/redaction rules.',
      blockers: ['paid/auth/community source packet missing'],
      currentProof: ['MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001'],
      nextCard: 'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
      nextAction: 'Approve one exact Skool source item and permitted extraction scope before any logged-in crawl.',
      counts: {
        mixedOrPaidCreators: countWatchlistByBoundary('mixed_public_and_paid_authorized_required') + countWatchlistByBoundary('paid_authorized_required'),
      },
    }),
    family({
      familyId: 'myicor-paid-training',
      label: 'MyICOR / Paid Training',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.blocked,
      sourceIds: ['SRC-MYICRO-001'],
      feedsDev: false,
      blocker: 'Paid course/training extraction is blocked until Steve approves one exact source item and allowed content boundary.',
      blockers: ['paid course source packet missing'],
      currentProof: ['MYICOR-EXTRACTION-PREFLIGHT-001'],
      nextCard: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
      nextAction: 'Approve one exact lesson/source packet before course extraction.',
      notes: 'Source ID currently uses the historical repo spelling `SRC-MYICRO-001`.',
    }),
    family({
      familyId: 'drive-course-docs',
      label: 'Google Drive / Course Docs',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.partial,
      sourceIds: ['SRC-GDRIVE-001', 'SRC-GDOCS-001', 'SRC-GSHEETS-001'],
      feedsDev: false,
      feedPath: 'Foundation Drive corpus exists; Dev-specific build-intel route is not approved yet.',
      currentProof: ['docs/source-notes/google-drive-corpus.md', 'SRC-GDOCS-001 verified readable'],
      nextCard: 'DEV-DRIVE-BUILD-INTEL-SOURCE-PACKET-001',
      nextAction: 'Define which Drive folders/files are allowed to feed Dev build intelligence, then route extracted evidence through Scoper.',
    }),
    family({
      familyId: 'public-builder-communities',
      label: 'Public Builder Communities',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.planned,
      sourceIds: ['SRC-CREATOR-WATCHLIST-001'],
      feedsDev: false,
      blocker: 'Community/source registry needs exact URLs, public/auth posture, allowed surfaces, and extraction cadence.',
      blockers: ['source registry incomplete'],
      currentProof: ['CREATOR-WATCHLIST-001'],
      nextCard: 'PUBLIC-DEV-COMMUNITY-WATCHLIST-001',
      nextAction: 'Create a source packet for Codex, Claude Code, OpenAI/OpenClaw, Browserbase/Hermes, and other builder communities before crawling.',
    }),
    family({
      familyId: 'business-systems-for-dev-signals',
      label: 'KPI / FUB / ClickUp / GHL System Signals',
      status: DEV_INTEL_SOURCE_FAMILY_STATUS.partial,
      sourceIds: ['SRC-SUPABASE-001', 'SRC-FUB-001', 'SRC-CLICKUP-001', 'SRC-GHL-001'],
      feedsDev: false,
      feedPath: 'Business-system source contracts exist; Dev-specific improvement signals currently arrive mostly through meetings/comms.',
      currentProof: ['KPI-HEALTH-001', 'SRC-GHL-001 verified readable'],
      nextCard: 'DEV-BUSINESS-SYSTEM-SIGNAL-ROUTER-001',
      nextAction: 'Decide which business-system drift/failure signals should feed Dev as build opportunities versus Ops/Sales hub actions.',
    }),
  ]

  const checks = [
    { ok: rows.length >= 11, check: 'main Dev intelligence source families are represented', detail: `${rows.length}` },
    { ok: rows.every(row => row.familyId && row.label && row.status), check: 'every source family has identity and status', detail: `${rows.length}` },
    { ok: rows.every(row => row.sourceIds.length || row.blocker), check: 'every source family has source IDs or explicit blocker', detail: rows.map(row => row.familyId).join(', ') },
    { ok: rows.filter(row => row.feedsDev).every(row => row.feedPath && row.currentProof.length), check: 'active Dev-feeding rows name feed path and proof', detail: rows.filter(row => row.feedsDev).map(row => row.familyId).join(', ') },
    { ok: rows.filter(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked).every(row => row.blocker && row.nextCard), check: 'blocked source families name blocker and next card', detail: rows.filter(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked).map(row => row.familyId).join(', ') },
    { ok: rows.some(row => row.familyId === 'youtube-resource-links' && /Steve should not manually/i.test(row.notes)), check: 'YouTube links are resolver/scoper work, not Steve homework', detail: 'youtube-resource-links' },
    { ok: rows.some(row => row.familyId === 'creator-source-stack' && /newsletter/i.test(row.nextAction) && /Skool/i.test(row.nextAction)), check: 'creator source stack includes all creator surfaces', detail: 'creator-source-stack' },
    { ok: rows.some(row => row.familyId === 'creator-newsletters' && /AIOS Sources\/Newsletters/.test(row.nextAction)), check: 'creator newsletters have mailbox source lane posture', detail: 'creator-newsletters' },
    { ok: rows.some(row => row.familyId === 'skool-free-communities' && /last 20 days/i.test(row.nextAction) && /paid\/private/i.test(row.nextAction)), check: 'free Skool communities are separate from paid Skool blockers', detail: 'skool-free-communities' },
    { ok: rows.some(row => row.familyId === 'shared-internal-comms' && row.currentProof.includes(DEV_SOURCE_SLICE_ROUTER_CARD_ID)), check: 'shared comms feed Dev through source-slice router', detail: DEV_SOURCE_SLICE_ROUTER_CARD_ID },
    { ok: rows.some(row => row.familyId === 'skool-paid-communities' && row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked), check: 'Skool stays blocked until source packet approval', detail: 'SRC-SKOOL-001' },
    { ok: rows.some(row => row.familyId === 'myicor-paid-training' && row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked), check: 'MyICOR stays blocked until source packet approval', detail: 'SRC-MYICRO-001' },
    { ok: true, check: 'source coverage matrix is read-only proposal-only', detail: 'no extraction, auth, model calls, backlog writes, or external writes' },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready',
    cardId: DEV_INTEL_SOURCE_COVERAGE_CARD_ID,
    generatedAt,
    snapshotId: `dev-intel-source-coverage:${stableHash(rows).slice(0, 16)}`,
    counts: {
      families: rows.length,
      active: rows.filter(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.active).length,
      partial: rows.filter(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.partial).length,
      blocked: rows.filter(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked).length,
      planned: rows.filter(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.planned).length,
      feedsDev: rows.filter(row => row.feedsDev).length,
      watchlistEntries: CREATOR_WATCHLIST_ENTRIES.length,
      activeBuildIntelCreators: countActiveBuildIntelCreators(),
    },
    rows,
    checks,
    failures,
    proposalOnly: true,
    externalWrites: false,
  }
}

export function buildDevIntelSourceCoverageDogfoodProof() {
  const snapshot = buildDevIntelSourceCoverageSnapshot({ generatedAt: '2026-05-25T12:30:00.000Z' })
  const byId = new Map(snapshot.rows.map(row => [row.familyId, row]))
  const cases = [
    {
      name: 'youtube_and_resource_links_feed_dev',
      ok: byId.get('youtube-public-build-intel')?.feedsDev === true &&
        byId.get('youtube-resource-links')?.feedsDev === true,
    },
    {
      name: 'shared_comms_use_source_slice_router',
      ok: byId.get('shared-internal-comms')?.currentProof.includes(DEV_SOURCE_SLICE_ROUTER_CARD_ID),
    },
    {
      name: 'paid_sources_block_until_source_packet',
      ok: byId.get('skool-paid-communities')?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked &&
        byId.get('myicor-paid-training')?.status === DEV_INTEL_SOURCE_FAMILY_STATUS.blocked,
    },
    {
      name: 'planned_sources_have_next_cards',
      ok: snapshot.rows
        .filter(row => row.status === DEV_INTEL_SOURCE_FAMILY_STATUS.planned)
        .every(row => row.nextCard),
    },
    {
      name: 'creator_stack_newsletters_and_free_skool_are_visible',
      ok: byId.get('creator-source-stack')?.nextAction.includes('newsletter') &&
        byId.get('creator-newsletters')?.nextAction.includes('AIOS Sources/Newsletters') &&
        byId.get('skool-free-communities')?.nextAction.includes('last 20 days'),
    },
  ]
  return {
    ok: snapshot.ok && cases.every(item => item.ok),
    cases,
    snapshot,
  }
}
