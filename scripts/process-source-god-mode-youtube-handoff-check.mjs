#!/usr/bin/env node

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
  buildSourceGodModeYoutubeHandoffCrawlItemInput,
  buildSourceGodModeYoutubeHandoffQueue,
  persistSourceGodModeYoutubeHandoffBatch,
  runSourceGodModeYoutubeHandoffBatch,
} from '../lib/source-god-mode-youtube-handoff.js'
import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const APPROVAL_REF = 'docs/process/approvals/SOURCE-BROWSER-AGENTIC-RUNTIME-001.json'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    headed: argv.includes('--headed') || argv.includes('--headed=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function page(title = '', body = '') {
  return `<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="description" content="${title} source handoff fixture">
      </head>
      <body>${body}</body>
    </html>`
}

async function startFixtureServer() {
  const hits = new Map()
  const pages = {
    '/resource': page('Public Resource', `
      <h1>Agentic source runtime resource</h1>
      <p>Public implementation notes for AIOS source extraction, browser hands, evidence capture, and daily source-stack monitoring.</p>
      <a href="/resource/details">Details</a>
      <a href="/checkout">Paid checkout</a>
    `),
    '/resource/details': page('Public Resource Details', `
      <h1>Resource details</h1>
      <p>Concrete workflow steps, API notes, and implementation details for agent browser verification.</p>
      <a href="/checkout">Paid implementation pack</a>
    `),
    '/demo/agent-runtime': page('Public Repo README', `
      <h1>course-video-manager README</h1>
      <p>Public GitHub-style repo with setup notes, agentic browser runtime, memory, evidence, tests, queue workers, and source provenance for a video course manager.</p>
      <a href="/demo/agent-runtime/blob/main/docs/architecture.md">Architecture docs</a>
      <a href="/demo/agent-runtime/tree/main/examples">Examples</a>
      <a href="/demo/agent-runtime/blob/main/LICENSE">License</a>
      <a href="/demo/agent-runtime/archive/refs/heads/main.zip">Download archive</a>
    `),
    '/demo/agent-runtime/blob/main/docs/architecture.md': page('Repo Architecture', `
      <h1>Architecture</h1>
      <p>The worker uses a scheduler, queue, retry checkpoint, source session broker, and audit readback so extraction can run without babysitting.</p>
    `),
    '/demo/agent-runtime/tree/main/examples': page('Repo Examples', `
      <h1>Examples</h1>
      <p>Code examples for browser navigation, API adapters, MCP tools, plugin skills, eval checks, and guarded implementation patterns.</p>
      <a href="/demo/agent-runtime/blob/main/examples/browser-agent.md">Browser agent example</a>
      <a href="/demo/agent-runtime/releases/download/v1/toolkit.zip">Release zip</a>
    `),
    '/demo/agent-runtime/blob/main/examples/browser-agent.md': page('Browser Agent Example', `
      <h1>Browser Agent Example</h1>
      <p>The browser agent clicks safe links, captures DOM evidence, records screenshots, and stops at payment or account mutation.</p>
    `),
    '/demo/agent-runtime/blob/main/LICENSE': page('MIT License', `
      <h1>MIT License</h1>
      <p>MIT license provenance for public read-only review.</p>
    `),
    '/newsletter': page('Creator Newsletter', `
      <h1>AI Hero Newsletter</h1>
      <p>Free weekly newsletter with AI agent workflows, code resources, and creator notes.</p>
      <form action="/newsletter/submit" method="post">
        <input type="email" name="email" placeholder="Email">
        <button type="submit">Subscribe</button>
      </form>
      <a href="/login">Member issue archive</a>
    `),
    '/chase-ai-community/about': page('Chase AI Community', `
      <h1>Chase AI Community</h1>
      <p>Free community for Claude Code, n8n AI agent templates, and AI systems.</p>
      <a href="/chase-ai-community/community">JOIN GROUP</a>
    `),
    '/chase-ai-community/community': page('Chase AI Community - Community', `
      <h1>Community</h1>
      <nav>
        <a href="/chase-ai-community/classroom">Classroom</a>
        <a href="/chase-ai-community/resources">Resources</a>
      </nav>
      <article data-kind="post" data-post-date="2026-05-24">
        <h2>Claude Code browser agent workflow</h2>
        <p>Post: use persistent source sessions, source-browser skills, and auth-needed escalation.</p>
        <div data-kind="comment" data-comment-date="2026-05-25">Comment: save selectors and rerun daily for source updates.</div>
      </article>
      <article data-kind="post" data-post-date="2026-05-10">
        <h2>n8n AI agent template pack</h2>
        <p>Post: free workflow template links and resource notes.</p>
      </article>
      <a href="https://github.com/example/free-agent-template">Free GitHub template</a>
      <a href="/chase-ai-community/new-post">Create post</a>
      <a href="/checkout">Upgrade to paid</a>
    `),
    '/chase-ai-community/classroom': page('Chase AI Community - Classroom', `
      <h1>Classroom</h1>
      <p>Free course notes about browser agents, source maps, and extraction SOPs.</p>
      <a href="/chase-ai-community/resources">Resources</a>
    `),
    '/chase-ai-community/resources': page('Chase AI Community - Resources', `
      <h1>Resources</h1>
      <p>Pinned resources: free Claude Code SOP, browser skill checklist, and source-stack template.</p>
      <a href="https://docs.browserbase.com/integrations/skills/introduction">Browserbase skills docs</a>
      <a href="/chase-ai-community/template.zip">Download zip</a>
    `),
    '/checkout': page('Checkout', '<h1>Checkout</h1><p>Payment required.</p>'),
    '/login': page('Login', '<h1>Login</h1><input type="password" name="password">'),
  }

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    hits.set(url.pathname, (hits.get(url.pathname) || 0) + 1)
    const body = pages[url.pathname] || page('Not Found', '<h1>Not found</h1>')
    response.writeHead(pages[url.pathname] ? 200 : 404, {
      'content-type': url.pathname.endsWith('.zip') ? 'application/zip' : 'text/html; charset=utf-8',
    })
    response.end(body)
  })

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    hits,
    close: () => new Promise(resolve => server.close(resolve)),
  }
}

function buildFixtureHandoffEvidence(baseUrl = '') {
  const item = (pathName, bucketId, sourceVideoId = 'fixture-video-1', creatorId = 'fixture-a-source', creator = 'Fixture A Source') => ({
    url: `${baseUrl}${pathName}`,
    host: '127.0.0.1',
    reportArtifactId: `report:${bucketId}`,
    sourceVideoId,
    creatorId,
    creator,
    sourceCreatorIds: [creatorId],
    sourceCreators: [creator],
    disposition: 'fixture_youtube_handoff',
  })
  const buckets = {
    'public-web-resources': {
      count: 2,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/resource', 'public-web-resources')],
      items: [
        item('/resource', 'public-web-resources'),
        item('/resource/details', 'public-web-resources', 'fixture-video-2', 'fixture-c-source', 'Fixture C Source'),
      ],
    },
    'public-code-repos': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/demo/agent-runtime', 'public-code-repos')],
      items: [item('/demo/agent-runtime', 'public-code-repos')],
    },
    'creator-newsletters': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/newsletter', 'creator-newsletters')],
      items: [item('/newsletter', 'creator-newsletters')],
    },
    'free-communities': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/chase-ai-community/about', 'free-communities')],
      items: [item('/chase-ai-community/about', 'free-communities')],
    },
    'products-tools-to-approve': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/checkout', 'products-tools-to-approve')],
      items: [item('/checkout', 'products-tools-to-approve')],
    },
    'paid-auth-gates': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/login', 'paid-auth-gates')],
      items: [item('/login', 'paid-auth-gates')],
    },
  }
  return {
    sourceRoute: 'fixture.youtube.fullWatchReports.resourceLinkSnapshot.scoperPacket',
    scannedReportCount: 42,
    buckets,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    moduleSource,
    devHubSource,
    approvalValidation,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-god-mode-youtube-handoff.js'),
    readRepoFile('lib/dev-team-hub.js'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: APPROVAL_REF,
      cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
    }),
  ])

  const fixture = await startFixtureServer()
  let queue = null
  let uncappedQueue = null
  let repoUpgradeQueue = null
  let repoHostBoundaryQueue = null
  let communityBoundaryQueue = null
  let publicWebBoundaryQueue = null
  let batch = null
  let persistence = null
  const persistenceWrites = []
  try {
    queue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence: buildFixtureHandoffEvidence(fixture.baseUrl),
      generatedAt: '2026-05-27T11:00:00.000-04:00',
      freeCommunitySessionBrokerReady: true,
      sourceValueGrader: {
        sourceGrades: [
          { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', devWatchRecommendation: 'watch_heavily', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
          { creatorId: 'fixture-c-source', creator: 'Fixture C Source', devBuildGrade: 'C', devWatchRecommendation: 'sample_only', laneScores: [{ laneId: 'aios_dev_build', grade: 'C', score: 38 }] },
        ],
      },
    })
    repoUpgradeQueue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence: buildFixtureHandoffEvidence(fixture.baseUrl),
      generatedAt: '2026-05-27T11:00:00.000-04:00',
      freeCommunitySessionBrokerReady: true,
      sourceValueGrader: {
        sourceGrades: [
          { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
        ],
      },
      runItems: [{
        itemKey: 'source-god-mode-youtube-handoff-runs:old-generic-repo-run',
        status: 'succeeded',
        processedAt: '2026-05-27T10:00:00.000-04:00',
        artifactId: '/tmp/old-generic-repo-read.json',
        metadata: {
          url: `${fixture.baseUrl}/demo/agent-runtime`,
          bucketId: 'public-code-repos',
          runner: 'source:god-mode',
          sourceType: 'github_docs_public_resources',
          status: 'source_god_mode_runtime_healthy',
          pagesRead: 1,
          sourceHandoffReadbackVersion: 2,
          sideEffects: {
            externalWrites: false,
            writesBacklog: false,
            submittedForm: false,
            downloadedFile: false,
            purchased: false,
            postedOrMessaged: false,
            mutatesCredentials: false,
            normalChromeProfileUsed: false,
          },
        },
      }],
    })
    repoHostBoundaryQueue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence: {
        sourceRoute: 'fixture.youtube.fullWatchReports.repoHostBoundary',
        scannedReportCount: 1,
        buckets: {
          'public-code-repos': {
            count: 2,
            itemLimit: 10,
            hasMore: false,
            sampleHosts: ['claude.ai', 'github.com'],
            samples: [{
              url: 'https://claude.ai/code',
              host: 'claude.ai',
              reportArtifactId: 'report:repo-host-boundary',
              sourceVideoId: 'fixture-video-repo-host-boundary',
              creatorId: 'fixture-a-source',
              creator: 'Fixture A Source',
              sourceCreatorIds: ['fixture-a-source'],
              sourceCreators: ['Fixture A Source'],
              disposition: 'fixture_youtube_handoff',
            }],
            items: [
              {
                url: 'https://claude.ai/code',
                host: 'claude.ai',
                reportArtifactId: 'report:repo-host-boundary',
                sourceVideoId: 'fixture-video-repo-host-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
                sourceCreatorIds: ['fixture-a-source'],
                sourceCreators: ['Fixture A Source'],
                disposition: 'fixture_youtube_handoff',
              },
              {
                url: 'https://github.com',
                host: 'github.com',
                reportArtifactId: 'report:repo-url-boundary',
                sourceVideoId: 'fixture-video-repo-url-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
                sourceCreatorIds: ['fixture-a-source'],
                sourceCreators: ['Fixture A Source'],
                disposition: 'fixture_youtube_handoff',
              },
            ],
          },
        },
      },
      generatedAt: '2026-05-27T11:00:00.000-04:00',
      sourceValueGrader: {
        sourceGrades: [
          { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
        ],
      },
    })
    const uncappedItem = (pathName, sourceVideoId = 'fixture-video-1') => ({
      url: `${fixture.baseUrl}${pathName}`,
      host: '127.0.0.1',
      reportArtifactId: 'report:uncapped-public-web-resources',
      sourceVideoId,
      creatorId: 'fixture-a-source',
      creator: 'Fixture A Source',
      sourceCreatorIds: ['fixture-a-source'],
      sourceCreators: ['Fixture A Source'],
      disposition: 'fixture_youtube_handoff',
    })
    uncappedQueue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence: {
        sourceRoute: 'fixture.youtube.fullWatchReports.uncappedPublicRows',
        scannedReportCount: 300,
        buckets: {
          'public-web-resources': {
            count: 300,
            itemLimit: 300,
            hasMore: false,
            sampleHosts: ['127.0.0.1'],
            samples: [uncappedItem('/resource?item=0')],
            items: Array.from({ length: 300 }, (_, index) =>
              uncappedItem(`/resource?item=${index}`, `fixture-video-${index}`)
            ),
          },
        },
      },
      generatedAt: '2026-05-27T11:00:00.000-04:00',
      sourceValueGrader: {
        sourceGrades: [
          { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
        ],
      },
    })
    communityBoundaryQueue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence: {
        sourceRoute: 'fixture.youtube.fullWatchReports.communityBoundary',
        scannedReportCount: 2,
        buckets: {
          'free-communities': {
            count: 2,
            itemLimit: 250,
            hasMore: false,
            sampleHosts: ['community.youreverydayai.com', 'skool.com'],
            items: [
              {
                url: 'https://community.youreverydayai.com/sign_up?request_host=community.youreverydayai.com',
                host: 'community.youreverydayai.com',
                reportArtifactId: 'report:bad-free-community',
                sourceVideoId: 'fixture-video-community-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
              },
              {
                url: 'https://www.skool.com/chase-ai-community/about',
                host: 'skool.com',
                reportArtifactId: 'report:good-free-community',
                sourceVideoId: 'fixture-video-community-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
              },
            ],
          },
        },
      },
      generatedAt: '2026-05-27T11:00:00.000-04:00',
      sourceValueGrader: {
        sourceGrades: [
          { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
        ],
      },
    })
    publicWebBoundaryQueue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence: {
        sourceRoute: 'fixture.youtube.fullWatchReports.publicWebBoundary',
        scannedReportCount: 3,
        buckets: {
          'public-web-resources': {
            count: 4,
            itemLimit: 250,
            hasMore: false,
            sampleHosts: ['instagram.com', 'link.example.com', 'n8n.io', 'forms.clickup.com'],
            items: [
              {
                url: 'https://www.instagram.com/source_creator',
                host: 'instagram.com',
                reportArtifactId: 'report:social-profile',
                sourceVideoId: 'fixture-video-public-web-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
              },
              {
                url: 'https://link.example.com/tool-short',
                host: 'link.example.com',
                reportArtifactId: 'report:link-bridge',
                sourceVideoId: 'fixture-video-public-web-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
              },
              {
                url: 'https://n8n.io/?ps_partner_key=abc&gspk=def',
                host: 'n8n.io',
                reportArtifactId: 'report:affiliate-homepage',
                sourceVideoId: 'fixture-video-public-web-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
              },
              {
                url: 'https://forms.clickup.com/90131327433/f/example',
                host: 'forms.clickup.com',
                reportArtifactId: 'report:form-surface',
                sourceVideoId: 'fixture-video-public-web-boundary',
                creatorId: 'fixture-a-source',
                creator: 'Fixture A Source',
              },
            ],
          },
        },
      },
      generatedAt: '2026-05-27T11:00:00.000-04:00',
      sourceValueGrader: {
        sourceGrades: [
          { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
        ],
      },
    })
    batch = await runSourceGodModeYoutubeHandoffBatch({
      queue,
      maxRuns: 5,
      headed: args.headed,
      allowLocalFixture: true,
      rootDir: '.openclaw/test-source-god-mode-youtube-handoff',
      now: '2026-05-27T11:00:00.000-04:00',
    })
    persistence = await persistSourceGodModeYoutubeHandoffBatch(batch, {
      actor: 'synthetic-source-youtube-handoff-proof',
      upsertSourceCrawlTarget: async (input, actor) => {
        persistenceWrites.push({ type: 'target', input, actor })
        return { ...input, updatedBy: actor }
      },
      upsertSourceCrawlItem: async (input, actor) => {
        persistenceWrites.push({ type: 'item', input, actor })
        return { itemKey: input.itemKey, targetKey: input.targetKey, status: input.status, artifactId: input.artifactId, metadata: input.metadata, updatedBy: actor }
      },
      upsertIntelligenceReportArtifact: async (input, actor) => {
        persistenceWrites.push({ type: 'report', input, actor })
        return { reportArtifactId: input.reportArtifactId, status: input.status, sourceIds: input.sourceIds, updatedBy: actor }
      },
    })
  } finally {
    await fixture.close()
  }

  const rows = list(queue.rows)
  const repoUpgradeRow = list(repoUpgradeQueue?.rows).find(row => row.bucketId === 'public-code-repos') || null
  const repoHostBoundaryRow = list(repoHostBoundaryQueue?.rows).find(row => row.url === 'https://claude.ai/code') || null
  const repoRootBoundaryRow = list(repoHostBoundaryQueue?.rows).find(row => row.url === 'https://github.com') || null
  const results = list(batch.results)
  const byBucket = Object.fromEntries(results.map(result => [result.bucketId, result]))
  const skipped = list(batch.skippedRows)
  const parkedSkipped = skipped.filter(row => ['products-tools-to-approve', 'paid-auth-gates'].includes(row.bucketId))

  addCheck(
    checks,
    packageJson.scripts?.['process:source-god-mode-youtube-handoff-check'] === `node --env-file-if-exists=.env ${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH}`,
    'package exposes focused YouTube source handoff proof',
    packageJson.scripts?.['process:source-god-mode-youtube-handoff-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source:youtube-handoff'] === 'node --env-file-if-exists=.env scripts/run-source-god-mode-youtube-handoff.mjs',
    'package exposes production YouTube source handoff runner',
    packageJson.scripts?.['source:youtube-handoff'] || 'missing',
  )
  addCheck(
    checks,
    approvalValidation.ok === true,
    'source-browser handoff plan approval validates',
    APPROVAL_REF,
  )
  addCheck(
    checks,
    moduleSource.includes('buildSourceGodModeYoutubeHandoffQueue') &&
      moduleSource.includes('buildSourceSessionPrepQueue') &&
      moduleSource.includes('runSourceGodModeYoutubeHandoffBatch') &&
      moduleSource.includes('runSourceGodModeExtractor') &&
      moduleSource.includes('runSkoolFreeCommunityGodMode'),
    'handoff module owns queue building and source-specific runners',
    'lib/source-god-mode-youtube-handoff.js',
  )
  addCheck(
    checks,
    devHubSource.includes('buildSourceGodModeYoutubeHandoffQueue') &&
      devHubSource.includes('sourceGodModeHandoffQueue') &&
      devHubSource.includes('items: rows,') &&
      !devHubSource.includes('items: rows.slice(0, itemLimit)'),
    'Dev Hub read model exposes runnable source handoff queue from full evidence buckets',
    'lib/dev-team-hub.js',
  )
  addCheck(
    checks,
    queue.status === 'ready' &&
      queue.scannedReportCount === 42 &&
      queue.counts.totalRows === 7 &&
      queue.counts.runnableRows === 5 &&
      queue.counts.parkedRows === 2 &&
      queue.bucketCounts['public-web-resources'].queuedRows === 2 &&
      queue.bucketCounts['public-web-resources'].hasMore === false,
    'queue converts YouTube handoff evidence into runnable and parked rows with disclosed limits',
    JSON.stringify(queue.counts),
  )
  addCheck(
    checks,
    uncappedQueue?.counts?.totalRows === 300 &&
      uncappedQueue?.bucketCounts?.['public-web-resources']?.queuedRows === 300 &&
      uncappedQueue?.bucketCounts?.['public-web-resources']?.hasMore === false,
    'queue does not silently cap source handoff evidence at 250 rows',
    JSON.stringify(uncappedQueue?.bucketCounts?.['public-web-resources'] || {}),
  )
  addCheck(
    checks,
      rows.some(row => row.bucketId === 'public-web-resources' && row.runner === 'source:god-mode') &&
      rows.some(row => row.bucketId === 'public-code-repos' && row.runner === 'repo:deep-review' && row.sourceType === 'github_docs_public_resources') &&
      rows.some(row => row.bucketId === 'creator-newsletters' && row.sourceType === 'creator_newsletter') &&
      rows.some(row =>
        row.bucketId === 'free-communities' &&
        row.runner === 'skool:free-god-mode' &&
        row.sourceSessionBroker?.status === 'session_ready'
      ) &&
      rows.filter(row => row.runnable).every(row => text(row.runCommand)),
    'public/free/resource/newsletter/community rows get concrete runner commands when the session broker says ready',
    rows.map(row => `${row.bucketId}:${row.runner}:${row.runnable}`).join(', '),
  )
  addCheck(
    checks,
    rows.filter(row => ['products-tools-to-approve', 'paid-auth-gates'].includes(row.bucketId))
      .every(row => row.runnable === false && row.parked === true && !row.runCommand),
    'paid/auth/product rows are parked and not runnable',
    rows.filter(row => !row.runnable).map(row => `${row.bucketId}:${row.status}`).join(', '),
  )
  addCheck(
    checks,
    repoUpgradeRow?.status === 'repo_deep_review_upgrade_needed' &&
      repoUpgradeRow?.runnable === true &&
      repoUpgradeRow?.runner === 'repo:deep-review' &&
      /repo:deep-review/.test(repoUpgradeRow?.runCommand || '') &&
      repoUpgradeRow?.existingRunRunner === 'source:god-mode',
    'old generic repo source-browser reads do not satisfy the repo deep-review lane',
    JSON.stringify({
      status: repoUpgradeRow?.status,
      runner: repoUpgradeRow?.runner,
      existingRunRunner: repoUpgradeRow?.existingRunRunner,
      runnable: repoUpgradeRow?.runnable,
    }),
  )
  addCheck(
    checks,
    repoHostBoundaryRow?.status === 'blocked_not_public_repo_deep_review_host' &&
      repoHostBoundaryRow?.runnable === false &&
      repoHostBoundaryRow?.parked === true &&
      repoHostBoundaryRow?.runner === 'repo:deep-review' &&
      !repoHostBoundaryRow?.runCommand,
    'non-repo product/tool hosts in the public-code bucket do not run through repo:deep-review',
    JSON.stringify({
      url: repoHostBoundaryRow?.url,
      status: repoHostBoundaryRow?.status,
      runnable: repoHostBoundaryRow?.runnable,
      runCommand: repoHostBoundaryRow?.runCommand,
    }),
  )
  addCheck(
    checks,
    repoRootBoundaryRow?.status === 'blocked_not_public_repo_deep_review_url' &&
      repoRootBoundaryRow?.runnable === false &&
      repoRootBoundaryRow?.parked === true &&
      repoRootBoundaryRow?.runner === 'repo:deep-review' &&
      !repoRootBoundaryRow?.runCommand,
    'repo host roots in the public-code bucket do not run through repo:deep-review',
    JSON.stringify({
      url: repoRootBoundaryRow?.url,
      status: repoRootBoundaryRow?.status,
      runnable: repoRootBoundaryRow?.runnable,
      runCommand: repoRootBoundaryRow?.runCommand,
    }),
  )
  addCheck(
    checks,
    list(communityBoundaryQueue?.rows).some(row =>
      row.url.includes('community.youreverydayai.com/sign_up') &&
      row.status === 'blocked_non_skool_community_bridge' &&
      row.runnable === false &&
      row.parked === true &&
      !row.runCommand
    ) &&
      list(communityBoundaryQueue?.rows).some(row =>
        row.url.includes('skool.com/chase-ai-community/about') &&
        row.status === 'blocked_free_community_session_broker_required' &&
        row.sourceSessionBroker?.status === 'free_account_creation_allowed' &&
        row.sourceSessionBroker?.account === 'ai@bensoncrew.ca' &&
        row.sourceSessionBroker?.rawSecretPrinted === false &&
        row.runnable === false &&
        !row.runCommand
      ),
    'free-community queue parks Skool/community rows behind Source Session Broker decisions and parks signup bridge pages',
    list(communityBoundaryQueue?.rows).map(row => `${row.url}:${row.status}:${row.runnable}`).join(', '),
  )
  const readyPrepReadinessChecks = list(queue.sourceSessionPrepQueue?.actionGroups)
    .flatMap(group => list(group.readiness?.checks))
  const parkedPrepReadinessChecks = list(communityBoundaryQueue?.sourceSessionPrepQueue?.actionGroups)
    .flatMap(group => list(group.readiness?.checks))
  addCheck(
    checks,
    queue.sourceSessionPrepQueue?.status === 'session_ready_rows_available' &&
      queue.sourceSessionPrepQueue?.counts?.freeCommunityRows === 1 &&
      queue.sourceSessionPrepQueue?.counts?.newsletterSignupRows === 1 &&
      queue.sourceSessionPrepQueue?.counts?.paidAuthRows === 1 &&
      queue.sourceSessionPrepQueue?.counts?.clusterCount === 3 &&
      queue.sourceSessionPrepQueue?.counts?.previewClusters === 3 &&
      queue.sourceSessionPrepQueue?.counts?.actionGroupCount === 3 &&
      queue.sourceSessionPrepQueue?.counts?.readinessCheckCount === readyPrepReadinessChecks.length &&
      queue.sourceSessionPrepQueue?.counts?.credentialReadinessCheckCount >= 1 &&
      queue.sourceSessionPrepQueue?.counts?.runAllowedNowRows === 1 &&
      queue.sourceSessionPrepQueue?.counts?.rawSecretPrintedRows === 0 &&
      queue.sourceSessionPrepQueue?.phaseCounts?.free_skool_session_ready === 1 &&
      queue.sourceSessionPrepQueue?.phaseCounts?.newsletter_signup_lane_needed === 1 &&
      queue.sourceSessionPrepQueue?.phaseCounts?.paid_or_auth_packet_needed === 1 &&
      list(queue.sourceSessionPrepQueue?.clusters).length === 3 &&
      list(queue.sourceSessionPrepQueue?.clusters).every(cluster => Number(cluster.totalRows || 0) >= 1 && Number(cluster.rawSecretPrintedRows || 0) === 0) &&
      list(queue.sourceSessionPrepQueue?.actionGroups).length === 3 &&
      list(queue.sourceSessionPrepQueue?.actionGroups).every(group => Number(group.totalRows || 0) >= 1 && Number(group.rawSecretPrintedRows || 0) === 0 && group.nextAction) &&
      list(queue.sourceSessionPrepQueue?.actionGroups).some(group => group.phase === 'free_skool_session_ready' && group.rowsWithRunAfterSessionCommand === 1) &&
      readyPrepReadinessChecks.some(check => /newsletter:intake/.test(check.statusCommand || '')) &&
      readyPrepReadinessChecks.some(check => /myicor:mcp-preflight/.test(check.statusCommand || '')) &&
      readyPrepReadinessChecks.every(check => check.rawSecretPrinted === false && check.externalActionStarted === false) &&
      list(queue.sourceSessionPrepQueue?.rows).some(row => row.phase === 'free_skool_session_ready' && row.runAfterSessionCommand) &&
      list(queue.sourceSessionPrepQueue?.clusters).some(cluster => cluster.phase === 'free_skool_session_ready' && cluster.rowsWithRunAfterSessionCommand === 1 && /chase-ai-community/.test(cluster.label || '')) &&
      list(communityBoundaryQueue?.sourceSessionPrepQueue?.rows).some(row => row.phase === 'free_source_identity_session_needed') &&
      list(communityBoundaryQueue?.sourceSessionPrepQueue?.rows).some(row => row.phase === 'community_runner_needed') &&
      list(communityBoundaryQueue?.sourceSessionPrepQueue?.clusters).some(cluster => cluster.phase === 'free_source_identity_session_needed' && cluster.host === 'skool.com') &&
      list(communityBoundaryQueue?.sourceSessionPrepQueue?.clusters).some(cluster => cluster.phase === 'community_runner_needed' && cluster.host === 'community.youreverydayai.com') &&
      list(communityBoundaryQueue?.sourceSessionPrepQueue?.actionGroups).some(group => group.phase === 'free_source_identity_session_needed' && group.nextAction?.includes('ai@bensoncrew.ca')) &&
      list(communityBoundaryQueue?.sourceSessionPrepQueue?.actionGroups).some(group => group.phase === 'community_runner_needed') &&
      parkedPrepReadinessChecks.some(check => /credentials:vault -- source:status/.test(check.statusCommand || '')) &&
      parkedPrepReadinessChecks.every(check => check.rawSecretPrinted === false && check.externalActionStarted === false),
    'source session prep queue exposes clustered action groups and readiness commands without starting auth/session work',
    JSON.stringify({
      readyPrep: queue.sourceSessionPrepQueue?.counts,
      parkedPrep: communityBoundaryQueue?.sourceSessionPrepQueue?.counts,
    }),
  )
  addCheck(
    checks,
    list(publicWebBoundaryQueue?.rows).some(row =>
      row.url.includes('instagram.com') &&
      row.status === 'blocked_social_profile_lane_needed' &&
      row.runnable === false
    ) &&
      list(publicWebBoundaryQueue?.rows).some(row =>
        row.url.includes('link.example.com') &&
        row.status === 'blocked_link_bridge_resolution_needed' &&
        row.runnable === false
      ) &&
      list(publicWebBoundaryQueue?.rows).some(row =>
        row.url.includes('ps_partner_key') &&
        row.status === 'blocked_product_or_affiliate_tracking_surface' &&
        row.runnable === false
      ) &&
      list(publicWebBoundaryQueue?.rows).some(row =>
        row.url.includes('forms.clickup.com') &&
        row.status === 'blocked_form_auth_booking_or_download_surface' &&
        row.runnable === false
      ),
    'public-web queue parks social profiles, link bridges, affiliate product homepages, and form/action surfaces',
    list(publicWebBoundaryQueue?.rows).map(row => `${row.url}:${row.status}:${row.runnable}`).join(', '),
  )
  addCheck(
    checks,
    queue.devLanePriorityPreview?.status === 'priority_preview' &&
      queue.devLanePriorityPreview.gradeBuckets.A >= 1 &&
      queue.devLanePriorityPreview.gradeBuckets.C === 1 &&
      queue.devLanePriorityPreview.topRows.some(row => list(row.sourceGrades).some(source => source.creatorId === 'fixture-a-source')) &&
      rows.some(row => row.creatorId === 'fixture-c-source' && row.devLanePriority?.priorityBand === 'later_signal') &&
      queue.devLanePriorityPreview.sideEffects.externalWrites === false,
    'Dev source-link priority ranks S/A/B/C/D rows without deleting or suppressing evidence',
    JSON.stringify(queue.devLanePriorityPreview || {}),
  )
  addCheck(
    checks,
    batch.status === 'completed' &&
      batch.ok === true &&
      results.length === 5 &&
      parkedSkipped.length === 2,
    'batch runs only runnable public/free rows and skips parked approval-bound rows',
    `results=${results.length}; skipped=${skipped.length}; status=${batch.status}`,
  )
  addCheck(
    checks,
    byBucket['creator-newsletters']?.newsletterCandidates >= 1 &&
      byBucket['creator-newsletters']?.sideEffects?.submittedForm === false,
    'newsletter handoff detects signup without submitting',
    JSON.stringify(byBucket['creator-newsletters'] || {}),
  )
  addCheck(
    checks,
    byBucket['free-communities']?.status === 'free_skool_community_god_mode_completed' &&
      byBucket['free-communities']?.sopCompletion?.lookbackDays === 20 &&
      byBucket['free-communities']?.sopCompletion?.counts?.recentActivityItems >= 2,
    'free community handoff runs the 20-day community/course/resource SOP',
    JSON.stringify(byBucket['free-communities']?.sopCompletion || {}),
  )
  addCheck(
    checks,
    byBucket['public-code-repos']?.runner === 'repo:deep-review' &&
      byBucket['public-code-repos']?.status === 'public_repo_deep_review_completed' &&
      byBucket['public-code-repos']?.sopCompletion?.docsSeen === true &&
      byBucket['public-code-repos']?.sopCompletion?.examplesSeen === true &&
      byBucket['public-code-repos']?.sopCompletion?.licenseSeen === true &&
      byBucket['public-code-repos']?.sopCompletion?.implementationPatternCount >= 3 &&
      byBucket['public-code-repos']?.sideEffects?.cloneStarted === false &&
      byBucket['public-code-repos']?.sideEffects?.installStarted === false &&
      byBucket['public-code-repos']?.sideEffects?.codeImported === false,
    'public code repo handoff uses repo:deep-review and extracts cited implementation patterns without clone/install/import',
    JSON.stringify(byBucket['public-code-repos']?.sopCompletion || {}),
  )
  addCheck(
    checks,
    results.filter(result => result.runner === 'source:god-mode').every(result =>
      result.ok === true &&
      result.pagesRead >= 1 &&
      result.sideEffects?.externalWrites === false &&
      result.sideEffects?.writesBacklog === false &&
      result.sideEffects?.normalChromeProfileUsed === false
    ),
    'source:god-mode handoff runs produce local evidence without external/backlog/profile side effects',
    results.map(result => `${result.bucketId}:${result.status}:${result.pagesRead}`).join(', '),
  )
  addCheck(
    checks,
    persistence?.ok === true &&
      persistence.target?.targetKey === SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY &&
      persistence.sourceCrawlItems?.length === results.length &&
      persistence.reportArtifact?.reportArtifactId &&
      persistenceWrites.some(write => write.type === 'target') &&
      persistenceWrites.filter(write => write.type === 'item').length === results.length &&
      persistenceWrites.some(write => write.type === 'report'),
    'handoff batch persists source-run readback and report artifact',
    JSON.stringify({
      status: persistence?.status,
      targetKey: persistence?.target?.targetKey,
      itemCount: persistence?.sourceCrawlItems?.length || 0,
      reportArtifactId: persistence?.reportArtifact?.reportArtifactId || '',
      writeTypes: persistenceWrites.map(write => write.type),
    }),
  )
  const authNeededCrawlInput = buildSourceGodModeYoutubeHandoffCrawlItemInput({
    rowId: 'youtube-handoff:free-communities:https:-www-skool-com-auth-needed',
    bucketId: 'free-communities',
    runner: 'skool:free-god-mode',
    sourceType: 'skool_free_community',
    url: 'https://www.skool.com/auth-needed',
    status: 'auth_needed',
    ok: false,
    pagesRead: 1,
    handsEvents: 0,
    authNeeded: { reason: 'login_join_or_verification_surface_visible' },
    artifacts: { reportPath: '/tmp/auth-needed-report.json' },
  }, {
    batch: { capturedAt: '2026-05-27T11:00:00.000-04:00' },
  })
  addCheck(
    checks,
    authNeededCrawlInput.status === 'failed' &&
      authNeededCrawlInput.lastError.includes('blocked_auth_needed') &&
      authNeededCrawlInput.metadata.status === 'auth_needed',
    'auth-needed source runs use valid crawl-item status while preserving source-specific blocker metadata',
    JSON.stringify({
      status: authNeededCrawlInput.status,
      lastError: authNeededCrawlInput.lastError,
      metadataStatus: authNeededCrawlInput.metadata.status,
    }),
  )
  const failedReadRepairInput = buildSourceGodModeYoutubeHandoffCrawlItemInput({
    rowId: 'youtube-handoff:public-web-resources:http:-127-0-0-1-failed-form-only',
    bucketId: 'public-web-resources',
    runner: 'source:god-mode',
    sourceType: 'public_or_free_source',
    url: `${fixture.baseUrl}/resource`,
    status: 'source_god_mode_runtime_needs_repair',
    ok: false,
    pagesRead: 1,
    handsEvents: 0,
    blockers: [{ type: 'form_or_submit_action_detected', reason: 'form_controls_visible_but_not_submitted' }],
    sideEffects: { externalWrites: false, writesBacklog: false, submittedForm: false, downloadedFile: false, purchased: false, postedOrMessaged: false, mutatesCredentials: false, normalChromeProfileUsed: false },
    artifacts: { reportPath: '/tmp/failed-form-only-report.json' },
  }, {
    batch: { capturedAt: '2026-05-27T11:00:00.000-04:00' },
  })
  const legacyFailedReadRepairMetadata = { ...failedReadRepairInput.metadata }
  delete legacyFailedReadRepairMetadata.sourceHandoffReadbackVersion
  const failedReadRepairQueue = buildSourceGodModeYoutubeHandoffQueue({
    handoffEvidence: buildFixtureHandoffEvidence(fixture.baseUrl),
    generatedAt: '2026-05-27T11:05:00.000-04:00',
    sourceValueGrader: {
      sourceGrades: [
        { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
      ],
    },
    runItems: [{ ...failedReadRepairInput, status: 'failed', metadata: legacyFailedReadRepairMetadata }],
  })
  const currentFailedReadRepairQueue = buildSourceGodModeYoutubeHandoffQueue({
    handoffEvidence: buildFixtureHandoffEvidence(fixture.baseUrl),
    generatedAt: '2026-05-27T11:05:00.000-04:00',
    sourceValueGrader: {
      sourceGrades: [
        { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
      ],
    },
    runItems: [{ ...failedReadRepairInput, status: 'failed', metadata: failedReadRepairInput.metadata }],
  })
  addCheck(
    checks,
    list(failedReadRepairQueue.rows).some(row =>
      row.url === `${fixture.baseUrl}/resource` &&
      row.status === 'retry_previous_source_read_action_blocker' &&
      row.runnable === true &&
      text(row.runCommand)
    ) &&
      failedReadRepairQueue.counts.alreadyRunRows === 0,
    'failed read/action-blocker runs stay retryable and are not hidden as completed evidence',
    JSON.stringify(failedReadRepairQueue.rows.find(row => row.url === `${fixture.baseUrl}/resource`) || {}),
  )
  addCheck(
    checks,
    list(currentFailedReadRepairQueue.rows).some(row =>
      row.url === `${fixture.baseUrl}/resource` &&
      row.status === 'previous_source_run_failed_needs_review' &&
      row.runnable === false &&
      !text(row.runCommand)
    ),
    'current-version failed read repairs park for review instead of looping forever',
    JSON.stringify(currentFailedReadRepairQueue.rows.find(row => row.url === `${fixture.baseUrl}/resource`) || {}),
  )
  const queueAfterRun = buildSourceGodModeYoutubeHandoffQueue({
    handoffEvidence: buildFixtureHandoffEvidence(fixture.baseUrl),
    generatedAt: '2026-05-27T11:05:00.000-04:00',
    sourceValueGrader: {
      sourceGrades: [
        { creatorId: 'fixture-a-source', creator: 'Fixture A Source', devBuildGrade: 'A', laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 76 }] },
      ],
    },
    runItems: persistence.sourceCrawlItems,
  })
  addCheck(
    checks,
    queueAfterRun.counts.alreadyRunRows >= 1 &&
      queueAfterRun.rows.some(row => row.status === 'already_run_source_evidence_saved' && row.runnable === false),
    'queue readback marks exact rows already run after persistence',
    JSON.stringify(queueAfterRun.counts),
  )
  const queueAfterRunBuckets = queueAfterRun.bucketCounts || {}
  const persistedRuntimeBuckets = [
    'public-web-resources',
    'public-code-repos',
    'creator-newsletters',
    'free-communities',
  ]
  addCheck(
    checks,
    persistedRuntimeBuckets.every(bucketId =>
      queueAfterRunBuckets[bucketId]?.runnable === false &&
      queueAfterRunBuckets[bucketId]?.runnableRows === 0 &&
      queueAfterRunBuckets[bucketId]?.rowsWithRunCommand === 0 &&
      queueAfterRunBuckets[bucketId]?.alreadyRunRows > 0 &&
      queueAfterRunBuckets[bucketId]?.status === 'already_run_source_evidence_saved',
    ),
    'bucket readback does not keep persisted source-browser rows falsely ready',
    JSON.stringify(Object.fromEntries(persistedRuntimeBuckets.map(bucketId => [bucketId, queueAfterRunBuckets[bucketId]]))),
  )
  addCheck(
    checks,
    batch.sideEffects?.externalWrites === false &&
      batch.sideEffects?.writesBacklog === false &&
      batch.sideEffects?.startsScoperPromotion === false &&
      batch.sideEffects?.submittedForm === false &&
      batch.sideEffects?.downloadedFile === false &&
      batch.sideEffects?.purchased === false &&
      batch.sideEffects?.postedOrMessaged === false &&
      batch.sideEffects?.mutatesCredentials === false &&
      batch.sideEffects?.normalChromeProfileUsed === false,
    'handoff batch has no Scoper/backlog/external/action side effects',
    JSON.stringify(batch.sideEffects || {}),
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
    reportOnly: true,
    queue: {
      status: queue.status,
      counts: queue.counts,
      bucketCounts: queue.bucketCounts,
    },
    batch: {
      status: batch.status,
      ok: batch.ok,
      selectedRows: batch.selectedRows,
      skippedRows: batch.skippedRows,
      resultSummary: results.map(result => ({
        bucketId: result.bucketId,
        runner: result.runner,
        status: result.status,
        ok: result.ok,
        pagesRead: result.pagesRead,
      })),
      sideEffects: batch.sideEffects,
    },
    persistence: {
      status: persistence?.status || '',
      ok: persistence?.ok === true,
      targetKey: persistence?.target?.targetKey || '',
      sourceCrawlItemCount: persistence?.sourceCrawlItems?.length || 0,
      reportArtifactId: persistence?.reportArtifact?.reportArtifactId || '',
      writeTypes: persistenceWrites.map(write => write.type),
    },
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`${output.status}: ${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
