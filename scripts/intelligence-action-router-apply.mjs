#!/usr/bin/env node

import {
  approveActionRoute,
  applyApprovedActionRoute,
  closeFoundationDb,
  getActionRoute,
  getActionRouterSnapshot,
  initFoundationDb,
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

function pickPendingRoute(snapshot) {
  const pendingRoutes = (snapshot.recentRoutes || []).filter(route => route.approvalStatus === 'pending')
  return pendingRoutes.find(route => route.destinationTable === 'backlog_items') ||
    pendingRoutes.find(route => route.destinationTable === 'open_questions') ||
    pendingRoutes.find(route => route.destinationTable === 'decisions') ||
    pendingRoutes[0]
}

async function main() {
  const args = parseArgs()
  const approvedBy = String(args.approvedBy || args.approved_by || process.env.BCREW_ACTION_ROUTE_APPROVER || 'steve').trim()
  const actor = String(args.actor || 'action-router-apply-cli').trim()
  const force = args.force === 'true'

  await initFoundationDb()

  const beforeSnapshot = await getActionRouterSnapshot({ limit: 100 })
  if (!args.routeId && !args.route_id && !force && beforeSnapshot.appliedRoutesWithDestinationRecord >= 1) {
    console.log(JSON.stringify({
      skipped: true,
      reason: 'action_route_closure_already_proved',
      snapshot: beforeSnapshot,
    }, null, 2))
    return
  }

  const routeId = String(args.routeId || args.route_id || pickPendingRoute(beforeSnapshot)?.routeId || '').trim()
  if (!routeId) throw new Error('No pending action route is available to approve/apply.')

  let route = await getActionRoute(routeId)
  if (!route) throw new Error(`Action route not found: ${routeId}`)

  let approved = null
  if (route.approvalStatus === 'pending') {
    approved = await approveActionRoute(routeId, {
      approvedBy,
      approvalNote: args.approvalNote || args.approval_note || 'Closure proof: human-approved route application.',
    }, actor)
    route = approved
  }

  let applied = null
  if (route.approvalStatus === 'approved') {
    applied = await applyApprovedActionRoute(routeId, {}, approvedBy)
    route = applied
  }

  if (route.approvalStatus !== 'applied' || !route.destinationRecordId) {
    throw new Error(`Action route did not apply into a destination record: ${routeId}`)
  }

  const afterSnapshot = await getActionRouterSnapshot({ limit: 100 })
  if (afterSnapshot.appliedRoutesWithDestinationRecord < 1) {
    throw new Error('Action Router closure proof requires at least one applied route with a live destination record.')
  }

  console.log(JSON.stringify({
    routeId,
    approved,
    applied: applied || route,
    snapshot: afterSnapshot,
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
