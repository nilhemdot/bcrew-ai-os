import { getClickUpFieldMap, normalizeClickUpKey } from './clickup.js'

export const CLICKUP_AGENT_ROSTER_LIST_ID = process.env.CLICKUP_AGENT_ROSTER_LIST_ID || '901113292355'
export const CLICKUP_AGENT_ROSTER_VIEW_URL = 'https://app.clickup.com/9011334502/v/l/6-901113292355-1'

const ACCOUNTABLE_STATUSES = new Set(['active agent', 'non-producing agent', 'onboarding'])
const MISSING_FIELD_SAMPLE_LIMIT = 8

function normalize(value) {
  return value == null ? '' : String(value).trim()
}

function statusOf(task) {
  return normalize(task.status && task.status.status).toLowerCase()
}

function isAccountableRosterTask(task) {
  return ACCOUNTABLE_STATUSES.has(statusOf(task))
}

function joinNames(tasks) {
  return tasks.map(task => task.name).filter(Boolean).slice(0, MISSING_FIELD_SAMPLE_LIMIT).join(', ')
}

function makeRosterItem(id, title, findingsPreview, options = {}) {
  return {
    queue: 'agentRoster',
    id,
    title,
    subtitle: options.subtitle || 'Agent Roster',
    owner: options.owner || 'Roster accountability',
    rosterStatus: options.rosterStatus || '',
    dueDate: options.dueDate || '',
    reviewStatus: options.reviewStatus || 'Needs Source Cleanup',
    reviewAction: options.reviewAction || 'Needs Fixing',
    queuedForReview: Boolean(options.queuedForReview),
    needsFixing: options.needsFixing !== false,
    findingsPreview,
    clickUpUrl: options.clickUpUrl || CLICKUP_AGENT_ROSTER_VIEW_URL,
  }
}

function getFieldStats(tasks, fieldName) {
  const missing = tasks.filter(task => {
    const fields = getClickUpFieldMap(task)
    return !fields.get(fieldName)
  })
  return { fieldName, missing, missingCount: missing.length }
}

export function buildAgentRosterReviewQueue(snapshot) {
  const tasks = snapshot && Array.isArray(snapshot.tasks) ? snapshot.tasks : []
  const fields = snapshot && Array.isArray(snapshot.fields) ? snapshot.fields : []
  const fieldNames = new Set(fields.map(field => normalizeClickUpKey(field.name)))
  const accountableTasks = tasks.filter(isAccountableRosterTask)
  const items = []

  accountableTasks.forEach(task => {
    const taskFields = getClickUpFieldMap(task)
    const contractLink = taskFields.get('Contract Link')
    if (!contractLink) {
      items.push(makeRosterItem(
        'agent-roster-contract-link:' + task.id,
        task.name || 'Roster agent',
        'Active/onboarding roster record is missing Contract Link. Add the governed contract package link so split and membership proof is traceable.',
        {
          subtitle: task.name || 'Agent',
          owner: 'Contract link',
          rosterStatus: task.status && task.status.status ? task.status.status : '',
          reviewStatus: 'Missing Contract Link',
          clickUpUrl: task.url || CLICKUP_AGENT_ROSTER_VIEW_URL,
        }
      ))
    }
  })

  const baselineFields = ['Recruited By', 'Real Start Date', 'Team / Legacy Origin']
  const baselineStats = baselineFields.map(fieldName => getFieldStats(accountableTasks, fieldName))
  const missingBaseline = baselineStats.filter(stat => stat.missingCount > 0)
  if (missingBaseline.length) {
    const parts = missingBaseline.map(stat => `${stat.fieldName}: ${stat.missingCount}`)
    const sampleTasks = missingBaseline[0].missing
    items.push(makeRosterItem(
      'agent-roster-baseline-fields',
      'Roster baseline fields need backfill',
      'Backfill roster source fields before this replaces the Freedom workaround layer. Missing counts: ' + parts.join(' · ') + '. Sample: ' + joinNames(sampleTasks) + '.',
      {
        subtitle: accountableTasks.length + ' active/onboarding/non-producing roster records',
        owner: 'Agent Roster',
        reviewStatus: 'Backfill Required',
      }
    ))
  }

  const recommendedFields = ['Contract Status', 'Membership Status', 'Production Roster Status', 'Onboarding Stage']
  const missingRecommended = recommendedFields.filter(fieldName => !fieldNames.has(normalizeClickUpKey(fieldName)))
  if (missingRecommended.length) {
    items.push(makeRosterItem(
      'agent-roster-source-contract-fields',
      'Roster source-contract fields are not fully mapped',
      'Missing recommended governed fields: ' + missingRecommended.join(', ') + '. Use existing fields where they already cover the meaning; add only the unmapped fields after Steve/Carson/Clare confirm the final roster shape.',
      {
        subtitle: 'Source contract',
        owner: 'ClickUp schema',
        reviewStatus: 'Mapping Needed',
      }
    ))
  }

  const npsFields = [
    'Onboarding NPS 30 Status',
    'Onboarding NPS 30 Due Date',
    'Onboarding NPS 60 Status',
    'Onboarding NPS 60 Due Date',
    'Onboarding NPS 90 Status',
    'Onboarding NPS 90 Due Date',
    'Onboarding NPS Owner',
  ]
  const missingNpsStats = npsFields.map(fieldName => getFieldStats(accountableTasks, fieldName))
  const missingNps = missingNpsStats.filter(stat => stat.missingCount > 0)
  if (missingNps.length) {
    const realStartMissing = getFieldStats(accountableTasks, 'Real Start Date').missingCount
    items.push(makeRosterItem(
      'agent-roster-onboarding-nps-not-initialized',
      'Agent onboarding NPS schedule is not initialized',
      'The 30/60/90 agent onboarding feedback system exists as fields, but due dates/status/owner are blank across the roster. Real Start Date is missing on ' + realStartMissing + ' records, so AIOS cannot reliably schedule day-30/day-60/day-90 checks yet.',
      {
        subtitle: accountableTasks.length + ' accountable roster records',
        owner: 'Onboarding feedback',
        reviewStatus: 'Schedule Blocked',
      }
    ))
  }

  const contactStats = getFieldStats(accountableTasks, 'Personal Email')
  if (contactStats.missingCount > 0) {
    items.push(makeRosterItem(
      'agent-roster-personal-email-missing',
      'Roster personal email coverage is incomplete',
      'Personal Email is missing on ' + contactStats.missingCount + ' accountable roster records. This matters for future private onboarding feedback requests that should not route through the onboarding team.',
      {
        subtitle: 'Agent contact profile',
        owner: 'Agent Roster',
        reviewStatus: 'Backfill Required',
      }
    ))
  }

  return {
    sourceId: 'SRC-CLICKUP-001',
    listId: CLICKUP_AGENT_ROSTER_LIST_ID,
    listName: snapshot && snapshot.list ? snapshot.list.name : 'Agent Roster',
    totalTrackedRows: accountableTasks.length,
    openItems: items.length,
    queuedReview: items.filter(item => item.queuedForReview).length,
    needsFixing: items.filter(item => item.needsFixing).length,
    items,
    stats: {
      totalTasks: tasks.length,
      accountableTasks: accountableTasks.length,
      contractLinkMissing: items.filter(item => item.id.indexOf('agent-roster-contract-link:') === 0).length,
      missingRecommendedFields: missingRecommended,
    },
  }
}
