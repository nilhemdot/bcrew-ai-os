#!/usr/bin/env node

import {
  closeFoundationDb,
  getActionRouterSnapshot,
  initFoundationDb,
  proposeActionRoutes,
} from '../lib/foundation-db.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
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

  const snapshot = await getActionRouterSnapshot({ limit: 40 })
  console.log(JSON.stringify({
    run: proposal.run,
    selectedItems: proposal.selectedItems.length,
    routesProposed: proposal.routes.length,
    snapshot,
  }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
