#!/usr/bin/env node

import process from 'node:process'

import {
  sendHarlanBuilderEventNotification,
} from '../lib/harlan-auth-live-delivery.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    dryRun: false,
    eventType: 'builder_event',
    card: 'unknown-card',
    status: 'unknown',
    summary: '',
    runId: '',
    json: true,
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--dry-run' || arg === '--dryRun=true' || arg === '--dry-run=true') args.dryRun = true
    if (arg === '--json=false') args.json = false
    if (arg.startsWith('--eventType=')) args.eventType = arg.slice('--eventType='.length)
    if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
    if (arg.startsWith('--status=')) args.status = arg.slice('--status='.length)
    if (arg.startsWith('--summary=')) args.summary = arg.slice('--summary='.length)
    if (arg.startsWith('--runId=')) args.runId = arg.slice('--runId='.length)
  }
  return args
}

const args = parseArgs()
const result = await sendHarlanBuilderEventNotification({
  dryRun: args.dryRun,
  event: {
    eventType: args.eventType,
    cardId: args.card,
    status: args.status,
    summary: args.summary,
    runId: args.runId,
  },
})

const publicResult = {
  ok: result.ok,
  status: result.status,
  externalSent: result.externalSent,
  sendsMessageNow: result.sendsMessageNow,
  reason: result.reason,
  messageId: result.messageId || null,
  event: result.event ? {
    eventId: result.event.eventId,
    eventType: result.event.eventType,
    cardId: result.event.cardId,
    status: result.event.status,
  } : null,
}

if (args.json) console.log(JSON.stringify(publicResult, null, 2))
else console.log(`${publicResult.status}: ${publicResult.event?.cardId || args.card}`)

if (!result.ok) process.exitCode = 1
