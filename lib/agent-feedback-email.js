function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(agentName) {
  return String(agentName || 'there').trim().split(/\s+/)[0] || 'there'
}

export function buildAgentFeedbackEmail(input) {
  const agentName = String(input.agentName || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  const feedbackUrl = String(input.feedbackUrl || '').trim()
  if (!agentName) throw new Error('Agent feedback email requires an agent name.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Agent feedback email requires a 30/60/90 milestone.')
  if (!feedbackUrl) throw new Error('Agent feedback email requires a feedback URL.')

  const greetingName = firstName(agentName)
  const subject = 'Your ' + milestoneDay + '-day Benson Crew check-in'
  const escapedName = escapeHtml(greetingName)
  const escapedUrl = escapeHtml(feedbackUrl)

  const text = [
    greetingName + ' — quick ' + milestoneDay + '-day check-in.',
    '',
    'We want honest feedback on what is working, what feels confusing, and what would make the Benson Crew onboarding experience stronger.',
    '',
    'It takes about 2 minutes:',
    feedbackUrl,
    '',
    'Your answers go to Steve so we can improve the experience.',
    '',
    'Thanks,',
    'Benson Crew',
  ].join('\n')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#EBEBEB;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EBEBEB;margin:0;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #d9dde3;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:26px 30px;border-bottom:5px solid #0084C9;">
                <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Benson Crew</div>
                <div style="margin-top:8px;color:#b8c2cc;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;">${milestoneDay}-day onboarding check-in</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 32px;">
                <h1 style="margin:0 0 18px;font-size:28px;line-height:1.18;color:#111111;">How have your first ${milestoneDay} days felt?</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#30343b;">
                  ${escapedName}, we want honest feedback on what is working, what feels confusing, and what would make the Benson Crew onboarding experience stronger.
                </p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#30343b;">
                  Two quick questions. It takes about 2 minutes.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:6px;background:#0084C9;">
                      <a href="${escapedUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;">Start check-in</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0;padding:14px 16px;background:#f7f8fa;border-left:4px solid #0084C9;font-size:14px;line-height:1.55;color:#4b5563;">
                  Your answers go to Steve so we can improve the experience. Be direct.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 30px;background:#111111;color:#cfd5dd;font-size:12px;line-height:1.5;">
                Benson Crew · Onboarding feedback
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}

export function buildAgentFeedbackReminderEmail(input) {
  const agentName = String(input.agentName || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  const feedbackUrl = String(input.feedbackUrl || '').trim()
  const reminderSlot = String(input.reminderSlot || '').trim()
  if (!agentName) throw new Error('Agent feedback reminder requires an agent name.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Agent feedback reminder requires a 30/60/90 milestone.')
  if (!feedbackUrl) throw new Error('Agent feedback reminder requires a feedback URL.')

  const greetingName = firstName(agentName)
  const slotLine = reminderSlot ? 'Reminder: ' + reminderSlot : 'Reminder'
  const subject = 'Reminder: your ' + milestoneDay + '-day Benson Crew check-in'
  const escapedName = escapeHtml(greetingName)
  const escapedUrl = escapeHtml(feedbackUrl)
  const escapedSlotLine = escapeHtml(slotLine)

  const text = [
    greetingName + ' — quick reminder on your ' + milestoneDay + '-day check-in.',
    '',
    'The feedback link is still open. It takes about 2 minutes:',
    feedbackUrl,
    '',
    'Your answers help us improve onboarding for the next person.',
    '',
    'Thanks,',
    'Benson Crew',
  ].join('\n')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#EBEBEB;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EBEBEB;margin:0;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #d9dde3;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:24px 30px;border-bottom:5px solid #0084C9;">
                <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Benson Crew</div>
                <div style="margin-top:8px;color:#b8c2cc;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;">${escapedSlotLine}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 30px;">
                <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;color:#111111;">Still open: your day ${milestoneDay} check-in</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#30343b;">
                  ${escapedName}, this is a quick reminder to share your ${milestoneDay}-day onboarding feedback.
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#30343b;">
                  It takes about 2 minutes and helps us improve the onboarding experience.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:6px;background:#0084C9;">
                      <a href="${escapedUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;">Open check-in</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 30px;background:#111111;color:#cfd5dd;font-size:12px;line-height:1.5;">
                Benson Crew · Onboarding feedback reminder
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}

export function buildAgentFeedbackResponseNotificationEmail(input) {
  const agentName = String(input.agentName || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  const score = Number(input.score)
  const improvementFeedback = String(input.improvementFeedback || '').trim()
  const submittedAt = String(input.submittedAt || '').trim()
  const clickUpTaskRef = String(input.clickUpTaskRef || '').trim()
  const clickUpWritebackStatus = String(input.clickUpWritebackStatus || '').trim()
  const clickUpRepairStatus = String(input.clickUpRepairStatus || '').trim()

  if (!agentName) throw new Error('Response notification requires an agent name.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Response notification requires a 30/60/90 milestone.')
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new Error('Response notification requires a score from 1 to 10.')
  if (!submittedAt) throw new Error('Response notification requires a submitted timestamp.')
  if (!clickUpTaskRef) throw new Error('Response notification requires a ClickUp task/source reference.')

  const subject = 'Agent onboarding feedback submitted: day ' + milestoneDay + ' - ' + agentName
  const writebackLine = clickUpRepairStatus
    ? clickUpWritebackStatus + ' (' + clickUpRepairStatus + ')'
    : clickUpWritebackStatus

  const text = [
    'Agent onboarding feedback was submitted.',
    '',
    'Agent: ' + agentName,
    'Milestone: day ' + milestoneDay,
    'Score: ' + score,
    'Submitted: ' + submittedAt,
    'ClickUp source: ' + clickUpTaskRef,
    'ClickUp writeback: ' + writebackLine,
    '',
    'Feedback:',
    improvementFeedback || '(blank)',
  ].join('\n')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f5f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f7;margin:0;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #d9dde3;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:22px 28px;border-bottom:5px solid #0084C9;">
                <div style="color:#ffffff;font-size:18px;font-weight:800;">Agent onboarding feedback</div>
                <div style="margin-top:6px;color:#c8d0d9;font-size:13px;font-weight:700;">Day ${milestoneDay} response notification</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr><td style="padding:7px 0;font-weight:700;width:160px;">Agent</td><td style="padding:7px 0;">${escapeHtml(agentName)}</td></tr>
                  <tr><td style="padding:7px 0;font-weight:700;">Milestone</td><td style="padding:7px 0;">Day ${milestoneDay}</td></tr>
                  <tr><td style="padding:7px 0;font-weight:700;">Score</td><td style="padding:7px 0;">${score}</td></tr>
                  <tr><td style="padding:7px 0;font-weight:700;">Submitted</td><td style="padding:7px 0;">${escapeHtml(submittedAt)}</td></tr>
                  <tr><td style="padding:7px 0;font-weight:700;">ClickUp source</td><td style="padding:7px 0;">${escapeHtml(clickUpTaskRef)}</td></tr>
                  <tr><td style="padding:7px 0;font-weight:700;">ClickUp writeback</td><td style="padding:7px 0;">${escapeHtml(writebackLine)}</td></tr>
                </table>
                <h2 style="margin:24px 0 10px;font-size:16px;line-height:1.35;">Feedback text</h2>
                <div style="white-space:pre-wrap;background:#f7f8fa;border-left:4px solid #0084C9;padding:14px 16px;font-size:14px;line-height:1.55;color:#30343b;">${escapeHtml(improvementFeedback || '(blank)')}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}
