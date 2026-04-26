import { clickUpGet, normalizeClickUpKey, setClickUpTaskCustomFieldValue } from './clickup.js'
import { CLICKUP_AGENT_ROSTER_LIST_ID } from './agent-roster-review.js'

const RESULT_FIELD_BY_MILESTONE = {
  30: {
    status: 'Onboarding NPS 30 Status',
    score: 'Onboarding NPS 30 Score',
    feedback: 'Onboarding NPS 30 Feedback',
  },
  60: {
    status: 'Onboarding NPS 60 Status',
    score: 'Onboarding NPS 60 Score',
    feedback: 'Onboarding NPS 60 Feedback',
  },
  90: {
    status: 'Onboarding NPS 90 Status',
    score: 'Onboarding NPS 90 Score',
    feedback: 'Onboarding NPS 90 Feedback',
  },
}

function fieldMap(fields) {
  return new Map(fields.map(field => [normalizeClickUpKey(field.name), field]))
}

function findField(fieldsByName, name) {
  return fieldsByName.get(normalizeClickUpKey(name)) || null
}

function findDropdownOption(field, name) {
  const options = field && field.type_config && Array.isArray(field.type_config.options)
    ? field.type_config.options
    : []
  const expected = normalizeClickUpKey(name)
  return options.find(option => normalizeClickUpKey(option.name) === expected) || null
}

async function getAgentRosterFields() {
  const payload = await clickUpGet(`/list/${CLICKUP_AGENT_ROSTER_LIST_ID}/field`)
  return Array.isArray(payload && payload.fields) ? payload.fields : []
}

export async function writeAgentFeedbackToClickUp(input) {
  const milestoneDay = Number(input.milestoneDay)
  const config = RESULT_FIELD_BY_MILESTONE[milestoneDay]
  if (!config) throw new Error('Invalid feedback milestone.')

  const fields = await getAgentRosterFields()
  const fieldsByName = fieldMap(fields)
  const statusField = findField(fieldsByName, config.status)
  const scoreField = findField(fieldsByName, config.score)
  const feedbackField = findField(fieldsByName, config.feedback)
  const missingFields = [
    statusField ? '' : config.status,
    scoreField ? '' : config.score,
    feedbackField ? '' : config.feedback,
  ].filter(Boolean)

  if (missingFields.length) {
    throw new Error('Missing ClickUp Agent Roster feedback fields: ' + missingFields.join(', '))
  }

  const completedOption = findDropdownOption(statusField, 'Completed')
  if (!completedOption) throw new Error(config.status + ' is missing the Completed option.')

  const taskId = String(input.taskId || '').trim()
  if (!taskId) throw new Error('ClickUp task id is required.')

  await setClickUpTaskCustomFieldValue(taskId, statusField.id, completedOption.id)
  await setClickUpTaskCustomFieldValue(taskId, scoreField.id, Number(input.score))
  await setClickUpTaskCustomFieldValue(taskId, feedbackField.id, String(input.improvementFeedback || '').trim())

  return {
    taskId,
    milestoneDay,
    statusField: statusField.name,
    scoreField: scoreField.name,
    feedbackField: feedbackField.name,
  }
}
