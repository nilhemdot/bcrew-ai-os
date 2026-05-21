#!/usr/bin/env node

import process from 'node:process'

import {
  closeFoundationDb,
  finishSourceCrawlTargetRun,
  getSourceCrawlItemsByExternalId,
  initFoundationDb,
  leaseSourceCrawlTarget,
  listSourceCrawlItems,
  recordIntelligenceAtomHit,
  upsertIntelligenceAtom,
  upsertIntelligenceReportArtifact,
  upsertSourceCrawlItem,
  upsertSourceCrawlTarget,
} from '../lib/foundation-db.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  buildYoutubeCreatorDailyWatchAtomInputs,
  buildYoutubeCreatorDailyWatchHitInputs,
  buildYoutubeCreatorDailyWatchPlan,
  buildYoutubeCreatorDailyWatchPoolItems,
  buildYoutubeCreatorDailyWatchReportArtifact,
  buildYoutubeCreatorDailyWatchTargetInput,
  runYoutubeCreatorDailyWatchDiscovery,
} from '../lib/youtube-creator-daily-watch.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return {
    json: args.json === true || args.json === 'true',
    apply: args.apply === true || args.apply === 'true',
    force: args.force === true || args.force === 'true',
    actor: String(args.actor || process.env.FOUNDATION_JOB_ACTOR || YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY).trim(),
    limitCreators: args.limitCreators ? Number(args.limitCreators) : null,
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function nextRunCursor({ plan, discoveries, poolItems, now, crawlRunId }) {
  return {
    youtubeCreatorDailyWatch: {
      lastRunAt: now,
      lastRunId: crawlRunId,
      baselineCompletedAt: now,
      creatorCount: plan.creators.length,
      markBaselineDepth: plan.markBaselineDepth,
      defaultBaselineDepth: plan.defaultBaselineDepth,
      maxBaselineDepth: YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH,
      discoveredVideoCount: list(discoveries).reduce((sum, discovery) => sum + Number(discovery.discoveredCount || 0), 0),
      storedItemCount: poolItems.length,
      latestByCreator: Object.fromEntries(list(discoveries).map(discovery => [
        discovery.creatorId,
        {
          creator: discovery.creator,
          channelUrl: discovery.channelUrl,
          discoveredCount: discovery.discoveredCount,
          latestVideoId: discovery.videos?.[0]?.videoId || null,
          latestTitle: discovery.videos?.[0]?.title || null,
          latestUrl: discovery.videos?.[0]?.url || null,
        },
      ])),
    },
  }
}

async function persistReportAndAtoms({ plan, discoveries, poolItems, crawlRunId, actor, now }) {
  let reportInput = buildYoutubeCreatorDailyWatchReportArtifact({
    plan,
    discoveries,
    poolItems,
    crawlRunId,
    foundationJobRunId: process.env.FOUNDATION_JOB_RUN_ID || '',
    now,
  })
  let report = await upsertIntelligenceReportArtifact(reportInput, actor)
  const atomInputs = buildYoutubeCreatorDailyWatchAtomInputs({
    poolItems,
    reportArtifactId: YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
    crawlRunId,
  })
  const atoms = []
  const hits = []
  for (const atomInput of atomInputs) {
    atoms.push(await upsertIntelligenceAtom(atomInput, actor))
  }
  const hitInputs = buildYoutubeCreatorDailyWatchHitInputs({
    atomInputs,
    poolItems,
    reportArtifactId: YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
    crawlRunId,
  })
  for (const hitInput of hitInputs) {
    hits.push(await recordIntelligenceAtomHit(hitInput, actor))
  }
  reportInput = {
    ...reportInput,
    inputAtomIds: atoms.map(atom => atom.atomId || atom.atom_id),
  }
  report = await upsertIntelligenceReportArtifact(reportInput, actor)
  return {
    report,
    atoms,
    hits,
  }
}

async function runDailyWatch({ apply, force, actor, limitCreators }) {
  const now = new Date().toISOString()
  const plan = buildYoutubeCreatorDailyWatchPlan()
  if (!plan.creators.length) throw new Error('No public YouTube creator channel refs are available for the daily watch.')

  if (!apply) {
    return {
      status: 'dry_run',
      ok: true,
      actor,
      plan: {
        creatorCount: plan.creators.length,
        creators: plan.creators.map(creator => ({
          creatorId: creator.creatorId,
          creator: creator.displayName,
          channelVideosUrl: creator.channelVideosUrl,
          baselineDepth: creator.baselineDepth,
        })),
        lookupGaps: plan.lookupGaps,
      },
      note: 'Pass --apply to run public YouTube discovery and write the Foundation research pool.',
    }
  }

  await upsertSourceCrawlTarget(buildYoutubeCreatorDailyWatchTargetInput({ plan, now }), actor)
  const existingAny = await listSourceCrawlItems({
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    limit: 1,
    order: 'desc',
  })
  const targetLease = await leaseSourceCrawlTarget(YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, {
    leaseOwner: actor,
    leaseSeconds: 1800,
    force,
  })
  const crawlRunId = targetLease.crawlRunId

  try {
    const discoveryResult = await runYoutubeCreatorDailyWatchDiscovery({
      creators: plan.creators,
      now,
      limitCreators,
    })
    const discoveries = discoveryResult.discoveries
    const discoveryFailures = [
      ...discoveryResult.failures,
    ]
    if (discoveryFailures.length) {
      throw new Error(`YouTube creator daily watch discovery failed: ${discoveryFailures.map(failure => `${failure.creatorId}:${failure.error}`).join('; ')}`)
    }

    const videoIds = [...new Set(discoveries.flatMap(discovery => list(discovery.videos).map(video => video.videoId)).filter(Boolean))]
    const existingItemsByExternalId = await getSourceCrawlItemsByExternalId({
      targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      externalIds: videoIds,
    })
    const poolItems = buildYoutubeCreatorDailyWatchPoolItems({
      discoveries,
      existingItemsByExternalId,
      crawlRunId,
      now,
      baselineCompleted: existingAny.length > 0,
    })
    if (!poolItems.length) {
      throw new Error('YouTube creator daily watch produced no research-pool rows.')
    }
    const savedItems = []
    for (const item of poolItems) {
      savedItems.push(await upsertSourceCrawlItem({
        ...item,
        sourceCrawlRunId: crawlRunId,
      }, actor))
    }
    const persisted = await persistReportAndAtoms({
      plan,
      discoveries,
      poolItems,
      crawlRunId,
      actor,
      now,
    })
    await finishSourceCrawlTargetRun(YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, {
      leaseOwner: actor,
      crawlRunId,
      lastRunAt: now,
      lastStatus: 'succeeded',
      inspectedDelta: poolItems.length,
      archivedDelta: savedItems.length,
      extractedDelta: 0,
      cursorState: nextRunCursor({ plan, discoveries, poolItems, now, crawlRunId }),
      metadata: {
        reportArtifactId: YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
        persistedItemCount: savedItems.length,
        atomCount: persisted.atoms.length,
        hitCount: persisted.hits.length,
      },
      disableRetirement: true,
    }, actor)

    return {
      status: 'succeeded',
      ok: true,
      actor,
      targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      crawlRunId,
      reportArtifactId: YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
      creatorCount: plan.creators.length,
      discoveredVideoCount: poolItems.length,
      savedItemCount: savedItems.length,
      atomCount: persisted.atoms.length,
      hitCount: persisted.hits.length,
      lookupGapCount: plan.lookupGaps.length,
      creatorSummaries: discoveries.map(discovery => ({
        creatorId: discovery.creatorId,
        creator: discovery.creator,
        channelUrl: discovery.channelUrl,
        baselineDepth: discovery.baselineDepth,
        discoveredCount: discovery.discoveredCount,
        latestVideoId: discovery.videos?.[0]?.videoId || null,
        latestTitle: discovery.videos?.[0]?.title || null,
      })),
    }
  } catch (error) {
    await finishSourceCrawlTargetRun(YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, {
      leaseOwner: actor,
      crawlRunId,
      lastRunAt: now,
      lastStatus: 'failed',
      lastError: error instanceof Error ? error.message : String(error),
      inspectedDelta: 0,
      archivedDelta: 0,
      extractedDelta: 0,
      cursorState: {
        youtubeCreatorDailyWatch: {
          lastFailedAt: now,
          lastFailedRunId: crawlRunId,
        },
      },
      disableRetirement: true,
    }, actor).catch(() => null)
    throw error
  }
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()
  try {
    const result = await runDailyWatch(args)
    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`YouTube creator daily watch: ${result.status}`)
      console.log(`Target: ${result.targetKey || YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY}`)
      if (result.creatorCount != null) console.log(`Creators: ${result.creatorCount}`)
      if (result.discoveredVideoCount != null) console.log(`Discovered videos: ${result.discoveredVideoCount}`)
    }
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('YouTube creator daily watch failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
