#!/usr/bin/env node

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActionRouterSnapshot,
  proposeActionRoutes,
} from '../lib/foundation-intelligence-db.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function numberArg(args, fallback, ...keys) {
  for (const key of keys) {
    const value = Number(args[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  return fallback
}

function summarizeRun(run = null) {
  if (!run) return null
  return {
    runId: run.runId || null,
    runType: run.runType || null,
    status: run.status || null,
    routeCount: Number(run.routeCount || 0),
    selectedItemCount: Number(run.selectedItemCount || 0),
    startedAt: run.startedAt || null,
    finishedAt: run.finishedAt || null,
  }
}

function countRoutesByApprovalStatus(routes = []) {
  return routes.reduce((counts, route) => {
    const status = String(route?.approvalStatus || 'unknown').trim() || 'unknown'
    counts[status] = Number(counts[status] || 0) + 1
    return counts
  }, {})
}

function compactCountRows(rows = [], keyName) {
  if (!Array.isArray(rows)) return []
  return rows.map(row => ({
    [keyName]: row?.[keyName] || row?.routeType || row?.destinationTable || null,
    count: Number(row?.count || 0),
  }))
}

function buildCompactActionRouterSnapshot(snapshot = {}) {
  const recentRoutes = Array.isArray(snapshot.recentRoutes) ? snapshot.recentRoutes : []
  const strategyRecentRoutes = Array.isArray(snapshot.strategyRecentRoutes) ? snapshot.strategyRecentRoutes : []

  return {
    generatedAt: snapshot.generatedAt || null,
    totalRoutes: Number(snapshot.totalRoutes || 0),
    pendingRoutes: Number(snapshot.pendingRoutes || 0),
    approvedRoutes: Number(snapshot.approvedRoutes || 0),
    appliedRoutes: Number(snapshot.appliedRoutes || 0),
    strategyRoutes: Number(snapshot.strategyRoutes || 0),
    pendingStrategyRoutes: Number(snapshot.pendingStrategyRoutes || 0),
    routesRequiringApproval: Number(snapshot.routesRequiringApproval || 0),
    routesWithOwner: Number(snapshot.routesWithOwner || 0),
    routesWithSourceProvenance: Number(snapshot.routesWithSourceProvenance || 0),
    tierOneRoutes: Number(snapshot.tierOneRoutes || 0),
    verifiedSynthesisRoutes: Number(snapshot.verifiedSynthesisRoutes || 0),
    unverifiedDecisionGradeRoutes: Number(snapshot.unverifiedDecisionGradeRoutes || 0),
    distinctSynthesizedItems: Number(snapshot.distinctSynthesizedItems || 0),
    latestRun: summarizeRun(snapshot.latestRun),
    latestProofRun: summarizeRun(snapshot.latestProofRun),
    guardedRoutes: Number(snapshot.guardedRoutes || 0),
    routesWithActiveSynthesizedItems: Number(snapshot.routesWithActiveSynthesizedItems || 0),
    routesWithActiveFactRefs: Number(snapshot.routesWithActiveFactRefs || 0),
    routesWithActiveEvidenceRefs: Number(snapshot.routesWithActiveEvidenceRefs || 0),
    routesWithActiveEvidenceChunkRefs: Number(snapshot.routesWithActiveEvidenceChunkRefs || 0),
    appliedRoutesChecked: Number(snapshot.appliedRoutesChecked || 0),
    appliedRoutesWithDestinationRecord: Number(snapshot.appliedRoutesWithDestinationRecord || 0),
    activeClusteredItems: Number(snapshot.activeClusteredItems || 0),
    itemsVisibleToRouter: Number(snapshot.itemsVisibleToRouter || 0),
    strategyItemsVisibleToRouter: Number(snapshot.strategyItemsVisibleToRouter || 0),
    unclusteredItemsVisibleToRouter: Number(snapshot.unclusteredItemsVisibleToRouter || 0),
    legacyProtectedItemsVisibleToRouter: Number(snapshot.legacyProtectedItemsVisibleToRouter || 0),
    recentRouteCount: recentRoutes.length,
    recentRouteApprovalStatusCounts: countRoutesByApprovalStatus(recentRoutes),
    strategyRecentRouteCount: strategyRecentRoutes.length,
    strategyRecentRouteApprovalStatusCounts: countRoutesByApprovalStatus(strategyRecentRoutes),
    routesByType: compactCountRows(snapshot.routesByType, 'routeType'),
    routesByDestination: compactCountRows(snapshot.routesByDestination, 'destinationTable'),
  }
}

function buildActionRouterProposalOutput({ proposal, snapshot, fullSnapshot = false }) {
  const output = {
    run: proposal.run,
    selectedItems: proposal.selectedItems.length,
    routesProposed: proposal.routes.length,
  }

  if (fullSnapshot) {
    output.snapshot = snapshot
  } else {
    output.snapshotSummary = buildCompactActionRouterSnapshot(snapshot)
  }

  return output
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()

  const runId = String(args.runId || args.run_id || `action-router-proposals-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`).trim()
  const proposal = await proposeActionRoutes({
    runId,
    runType: 'route_proposal',
    requestedBy: args.requestedBy || args.requested_by || 'intelligence-action-router-proposals',
    maxTier: Number(args.maxTier || args.max_tier || 1),
    routeLimit: Number(args.limit || args.routeLimit || args.route_limit || 20),
    routeScope: args.routeScope || args.route_scope || null,
    metadata: {
      scheduledCommand: 'npm run intelligence:action-router-proposals',
      approvalBoundary: 'human_required_before_destination_write',
      routeScopeFilter: args.routeScope || args.route_scope || null,
    },
  }, 'intelligence-action-router-proposals')

  const snapshot = await getActionRouterSnapshot({ limit: numberArg(args, 40, 'snapshotLimit', 'snapshot_limit') })
  const fullSnapshot = boolArg(args.fullSnapshot || args.full_snapshot || args.verbose)
  console.log(JSON.stringify(buildActionRouterProposalOutput({ proposal, snapshot, fullSnapshot }), null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
