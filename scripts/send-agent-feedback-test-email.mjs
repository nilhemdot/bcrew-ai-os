#!/usr/bin/env node

import process from 'node:process'
import { buildAgentFeedbackEmail } from '../lib/agent-feedback-email.js'
import { buildAgentFeedbackUrl } from '../lib/agent-feedback.js'
import { sendGmailMessage } from '../lib/google-delegated.js'

function argValue(name, fallback = '') {
  const prefix = `--${name}=`
  const item = process.argv.find(arg => arg.startsWith(prefix))
  return item ? item.slice(prefix.length) : fallback
}

async function main() {
  const to = argValue('to', 'steve.zahnd@bensoncrew.ca')
  const agentName = argValue('agentName', 'Steve Zahnd')
  const taskId = argValue('taskId', '868hre82n')
  const milestoneDay = Number(argValue('milestoneDay', '30'))
  const from = argValue('from', 'ai@bensoncrew.ca')

  const feedbackUrl = buildAgentFeedbackUrl({ taskId, agentName, milestoneDay })
  const email = buildAgentFeedbackEmail({ agentName, milestoneDay, feedbackUrl })
  const result = await sendGmailMessage(from, {
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    fromName: 'Benson Crew',
  })

  console.log(JSON.stringify({
    ok: true,
    from,
    to,
    subject: email.subject,
    feedbackUrl,
    messageId: result.id || '',
    threadId: result.threadId || '',
  }, null, 2))
}

main().catch(error => {
  console.error('Failed to send agent feedback test email.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
