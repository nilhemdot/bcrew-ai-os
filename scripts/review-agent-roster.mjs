#!/usr/bin/env node

import process from 'node:process'
import { buildAgentRosterReviewQueue, CLICKUP_AGENT_ROSTER_LIST_ID } from '../lib/agent-roster-review.js'
import { getClickUpListSnapshot } from '../lib/clickup.js'

async function main() {
  const snapshot = await getClickUpListSnapshot(CLICKUP_AGENT_ROSTER_LIST_ID)
  const queue = buildAgentRosterReviewQueue(snapshot)

  console.log('Agent roster review')
  console.log(`List: ${queue.listName} (${queue.listId})`)
  console.log(`Tracked roster records: ${queue.totalTrackedRows}`)
  console.log(`Open items: ${queue.openItems}`)
  console.log(`Needs fixing: ${queue.needsFixing}`)
  console.log('')
  ;(queue.items || []).forEach(item => {
    console.log(`- ${item.title} :: ${item.reviewStatus} / ${item.reviewAction}`)
    console.log(`  ${item.findingsPreview}`)
    if (item.clickUpUrl) console.log(`  ${item.clickUpUrl}`)
  })
}

main().catch(error => {
  console.error('Agent roster review failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
