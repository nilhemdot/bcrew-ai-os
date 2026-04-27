#!/usr/bin/env node

import {
  closeFoundationDb,
  getActionRouterSnapshot,
  initFoundationDb,
  proposeActionRoutes,
  updateBacklogItem,
} from '../lib/foundation-db.js'

function countBy(rows, keyName, value) {
  return Number((rows || []).find(row => row[keyName] === value)?.count || 0)
}

async function main() {
  await initFoundationDb()

  const runId = `action-router-proof-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
  const proof = await proposeActionRoutes({
    runId,
    runType: 'router_proof',
    requestedBy: 'action-router-proof',
    maxTier: 1,
    routeLimit: 20,
    metadata: {
      backlogCardId: 'ACTION-ROUTER-001',
      proofCommand: 'npm run intelligence:action-router-proof',
      approvalBoundary: 'human_required_before_destination_write',
    },
  }, 'action-router-proof')

  const snapshot = await getActionRouterSnapshot({ limit: 40 })
  const requiredDestinationTables = [
    'backlog_items',
    'decisions',
    'open_questions',
    'intelligence_synthesized_items',
  ]
  const missingDestination = requiredDestinationTables.find(table =>
    countBy(snapshot.routesByDestination, 'destinationTable', table) < 1
  )
  if (missingDestination) {
    throw new Error(`ACTION-ROUTER-001 proof needs at least one pending route for destination ledger ${missingDestination}.`)
  }

  if (!snapshot.latestRun?.runId || snapshot.latestRun.runId !== proof.run.runId) {
    throw new Error('ACTION-ROUTER-001 latest run did not persist.')
  }
  if (snapshot.totalRoutes < 1 || snapshot.pendingRoutes < 1) {
    throw new Error('ACTION-ROUTER-001 requires pending action routes.')
  }
  if (snapshot.routesWithSourceProvenance < snapshot.totalRoutes) {
    throw new Error('ACTION-ROUTER-001 routes must preserve source fact/evidence/chunk provenance.')
  }
  if (snapshot.routesWithOwner < snapshot.totalRoutes) {
    throw new Error('ACTION-ROUTER-001 routes must carry explicit owner or needs-owner-decision queue.')
  }
  if (snapshot.routesRequiringApproval < snapshot.totalRoutes) {
    throw new Error('ACTION-ROUTER-001 routes must require human approval before destination writes.')
  }
  if (snapshot.tierOneRoutes < snapshot.totalRoutes) {
    throw new Error('ACTION-ROUTER-001 proof routes must respect maxTier <= 1.')
  }

  const updatedActionRouterCard = await updateBacklogItem('ACTION-ROUTER-001', {
    lane: 'done',
    nextAction: 'Keep Action Router v1 operating as the approval gate from synthesized items into decisions, backlog, open questions, ignore/snooze, and owner-bound actions. Resume Strategy Hub v2 only on top of this routed loop.',
    statusNote: 'Done v1 on 2026-04-27. Action Router creates pending, human-approval-required routes from governed synthesized items into existing operating ledgers with fact/evidence/chunk provenance, explicit owner or needs-owner queue, and no autopilot destination writes.',
  }, 'action-router-proof')

  const updatedStrategyCard = await updateBacklogItem('STRATEGY-004', {
    lane: 'scoped',
    priority: 'P0',
    nextAction: 'Resume Strategy Hub v2 from deterministic source-to-gap snapshots and the completed intelligence spine. Do not revive old advisor/recommendation UI; build review/promote on top of routed Action Router records.',
    statusNote: 'Unblocked after Action Router v1 proof. Strategy Hub v2 can resume only as a source-to-gap operating dashboard consuming source-backed facts, synthesized items, and pending action routes.',
  }, 'action-router-proof')

  console.log(JSON.stringify({
    proof: {
      run: proof.run,
      newRoutes: proof.routes.length,
      selectedItems: proof.selectedItems.length,
    },
    snapshot,
    cards: {
      actionRouter: updatedActionRouterCard,
      strategy: updatedStrategyCard,
    },
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
