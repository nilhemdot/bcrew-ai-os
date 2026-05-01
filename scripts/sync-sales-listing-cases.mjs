#!/usr/bin/env node
import { buildSalesListingInventory } from '../lib/sales-listing-inventory.js'
import { syncSalesListingCasesFromInventory } from '../lib/sales-listing-cases.js'

const report = await buildSalesListingInventory()
const sync = await syncSalesListingCasesFromInventory(report, {
  actor: 'sales:listings-sync-cases',
})

console.log(JSON.stringify({
  status: sync.status,
  today: sync.today,
  activeListings: report.summary.activeListings,
  staleActiveListings: report.summary.staleActiveListings,
  staleCasesCreatedOrUpdated: sync.staleCasesCreatedOrUpdated,
  existingCasesRefreshed: sync.existingCasesRefreshed,
  totalTouched: sync.totalTouched,
}, null, 2))
