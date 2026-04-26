import { getClickUpFieldMap, normalizeClickUpKey } from './clickup.js'
import { buildAgentFeedbackUrl } from './agent-feedback.js'

export const CLICKUP_AGENT_ROSTER_LIST_ID = process.env.CLICKUP_AGENT_ROSTER_LIST_ID || '901113292355'
export const CLICKUP_AGENT_ROSTER_VIEW_URL = 'https://app.clickup.com/9011334502/v/l/6-901113292355-1'

const ACCOUNTABLE_STATUSES = new Set(['active agent', 'non-producing agent', 'onboarding'])
const MISSING_FIELD_SAMPLE_LIMIT = 8
const NPS_MILESTONES = [
  {
    day: 30,
    label: '30',
    statusField: 'Onboarding NPS 30 Status',
    scoreField: 'Onboarding NPS 30 Score',
    feedbackField: 'Onboarding NPS 30 Feedback',
  },
  {
    day: 60,
    label: '60',
    statusField: 'Onboarding NPS 60 Status',
    scoreField: 'Onboarding NPS 60 Score',
    feedbackField: 'Onboarding NPS 60 Feedback',
  },
  {
    day: 90,
    label: '90',
    statusField: 'Onboarding NPS 90 Status',
    scoreField: 'Onboarding NPS 90 Score',
    feedbackField: 'Onboarding NPS 90 Feedback',
  },
]

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
    feedbackUrl: options.feedbackUrl || '',
  }
}

function getFieldStats(tasks, fieldName) {
  const missing = tasks.filter(task => {
    const fields = getClickUpFieldMap(task)
    return !fields.get(fieldName)
  })
  return { fieldName, missing, missingCount: missing.length }
}

function parseDate(value) {
  const text = normalize(value)
  if (!text) return null
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function normalizeStatus(value) {
  return normalize(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function isClosedNpsStatus(value) {
  const status = normalizeStatus(value)
  return status === 'completed' || status === 'skipped' || status === 'blocked' || status === 'not eligible'
}

function isRequestedStatus(value) {
  return normalizeStatus(value) === 'requested'
}

function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000)
}

function hasOpenNpsStatuses(fields) {
  return NPS_MILESTONES.some(milestone => !isClosedNpsStatus(fields.get(milestone.statusField)))
}

function shouldMarkHistoricalNpsSkipped(fields, today) {
  const realStart = parseDate(fields.get('Real Start Date'))
  if (!realStart) return false
  return daysBetween(realStart, today) > 90 && hasOpenNpsStatuses(fields)
}

function buildAgentNpsItems(task, fields, today) {
  const items = []
  const realStart = parseDate(fields.get('Real Start Date'))
  if (!realStart) return items

  NPS_MILESTONES.forEach(milestone => {
    const currentStatus = fields.get(milestone.statusField)
    if (isClosedNpsStatus(currentStatus)) return

    const expectedDue = addDays(realStart, milestone.day)
    if (today < expectedDue) return

    if (!currentStatus || normalizeStatus(currentStatus) === 'not started') {
      items.push(makeRosterItem(
        'agent-roster-nps-due:' + task.id + ':' + milestone.label,
        task.name || 'Roster agent',
        'Day-' + milestone.label + ' onboarding feedback is due. Use the private AIOS feedback link; when submitted, AIOS stores the response and writes the status, score, and feedback back to ClickUp.',
        {
          subtitle: 'Day-' + milestone.label + ' onboarding feedback',
          owner: 'Onboarding feedback',
          rosterStatus: task.status && task.status.status ? task.status.status : '',
          dueDate: formatDate(expectedDue),
          reviewStatus: 'Feedback Due',
          feedbackUrl: buildAgentFeedbackUrl({ taskId: task.id, agentName: task.name || 'Roster agent', milestoneDay: milestone.day }),
          clickUpUrl: task.url || CLICKUP_AGENT_ROSTER_VIEW_URL,
        }
      ))
      return
    }

    if (isRequestedStatus(currentStatus)) {
      items.push(makeRosterItem(
        'agent-roster-nps-reminder:' + task.id + ':' + milestone.label,
        task.name || 'Roster agent',
        'Day-' + milestone.label + ' onboarding feedback is marked Requested but not Completed. Follow up until the private feedback form is submitted, then AIOS will write Completed, score, and feedback to ClickUp.',
        {
          subtitle: 'Day-' + milestone.label + ' onboarding feedback',
          owner: 'Onboarding feedback',
          rosterStatus: task.status && task.status.status ? task.status.status : '',
          dueDate: formatDate(expectedDue),
          reviewStatus: 'Reminder Due',
          feedbackUrl: buildAgentFeedbackUrl({ taskId: task.id, agentName: task.name || 'Roster agent', milestoneDay: milestone.day }),
          clickUpUrl: task.url || CLICKUP_AGENT_ROSTER_VIEW_URL,
        }
      ))
    }
  })

  return items
}

export function buildAgentRosterReviewQueue(snapshot) {
  const tasks = snapshot && Array.isArray(snapshot.tasks) ? snapshot.tasks : []
  const fields = snapshot && Array.isArray(snapshot.fields) ? snapshot.fields : []
  const fieldNames = new Set(fields.map(field => normalizeClickUpKey(field.name)))
  const accountableTasks = tasks.filter(isAccountableRosterTask)
  const items = []
  const today = new Date()
  const historicalNpsSkipTasks = []

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
    if (shouldMarkHistoricalNpsSkipped(taskFields, today)) {
      historicalNpsSkipTasks.push(task)
    } else {
      items.push(...buildAgentNpsItems(task, taskFields, today))
    }
  })

  if (historicalNpsSkipTasks.length) {
    items.push(makeRosterItem(
      'agent-roster-historical-nps-skip',
      'Historical onboarding NPS statuses need cleanup',
      historicalNpsSkipTasks.length + ' roster record' + (historicalNpsSkipTasks.length === 1 ? ' has' : 's have') + ' a Real Start Date more than 90 days old with open 30/60/90 NPS statuses. Do not send retroactive requests; set the 30/60/90 onboarding NPS statuses to Skipped unless Steve explicitly asks for a catch-up survey. Sample: ' + joinNames(historicalNpsSkipTasks) + '.',
      {
        subtitle: 'Historical roster cleanup',
        owner: 'Onboarding feedback',
        reviewStatus: 'Mark Skipped',
      }
    ))
  }

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
    'Onboarding NPS 30 Score',
    'Onboarding NPS 30 Feedback',
    'Onboarding NPS 60 Status',
    'Onboarding NPS 60 Score',
    'Onboarding NPS 60 Feedback',
    'Onboarding NPS 90 Status',
    'Onboarding NPS 90 Score',
    'Onboarding NPS 90 Feedback',
  ]
  const missingNps = npsFields.filter(fieldName => !fieldNames.has(normalizeClickUpKey(fieldName)))
  if (missingNps.length) {
    const realStartMissing = getFieldStats(accountableTasks, 'Real Start Date').missingCount
    items.push(makeRosterItem(
      'agent-roster-onboarding-nps-not-initialized',
      'Agent onboarding NPS schedule is not initialized',
      'The 30/60/90 agent onboarding feedback result fields are not fully available: ' + missingNps.join(', ') + '. Real Start Date is missing on ' + realStartMissing + ' records, so AIOS cannot reliably schedule day-30/day-60/day-90 checks yet.',
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
