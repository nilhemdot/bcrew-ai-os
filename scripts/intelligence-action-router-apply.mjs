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

function argValue(args, ...keys) {
  for (const key of keys) {
    const value = String(args[key] || '').trim()
    if (value) return value
  }
  return ''
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function assertApplyConfirmed({ args, routeId }) {
  const confirmation = argValue(args, 'confirmApprovedRouteApply', 'confirm_approved_route_apply')
  if (!routeId || confirmation !== routeId) {
    const error = new Error('Action Router apply requires --routeId=<id> and --confirmApprovedRouteApply=<same id>.')
    error.code = 'action_route_apply_confirmation_required'
    throw error
  }
  if (!argValue(args, 'approvedBy', 'approved_by')) {
    const error = new Error('Action Router apply requires an explicit --approvedBy operator.')
    error.code = 'action_route_apply_approver_required'
    throw error
  }
}

async function main() {
  const args = parseArgs()
  const dryRun = boolArg(args.dryRun || args.dry_run || args.check)
  const approvedBy = argValue(args, 'approvedBy', 'approved_by')
  const actor = String(args.actor || 'action-router-apply-cli').trim()

  await initFoundationDb()

  const beforeSnapshot = await getActionRouterSnapshot({ limit: 100 })
  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      pendingRouteCount: (beforeSnapshot.recentRoutes || []).filter(route => route.approvalStatus === 'pending').length,
      snapshot: beforeSnapshot,
    }, null, 2))
    return
  }

  const routeId = argValue(args, 'routeId', 'route_id')
  assertApplyConfirmed({ args, routeId })

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
