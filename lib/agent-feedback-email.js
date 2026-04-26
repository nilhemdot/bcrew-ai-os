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
  const subject = 'Quick ' + milestoneDay + '-day check-in'
  const preheader = 'A quick private check-in about your first ' + milestoneDay + ' days with Benson Crew.'
  const escapedName = escapeHtml(greetingName)
  const escapedUrl = escapeHtml(feedbackUrl)
  const escapedPreheader = escapeHtml(preheader)

  const text = [
    'Hey ' + greetingName + ',',
    '',
    'You are around your first ' + milestoneDay + ' days with Benson Crew, and Steve would love your quick private feedback.',
    '',
    'It takes less than 2 minutes:',
    feedbackUrl,
    '',
    'Thanks,',
    'Benson Crew',
  ].join('\n')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapedPreheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;margin:0;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111827;padding:18px 24px;">
                <div style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Benson Crew</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 30px;">
                <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#111827;">Hey ${escapedName},</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#374151;">
                  You are around your first ${milestoneDay} days with Benson Crew, and Steve would love your quick private feedback.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4b5563;">
                  It takes less than 2 minutes.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:6px;background:#0084C9;">
                      <a href="${escapedUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Share feedback</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
                  Your response goes to Steve so we can improve the onboarding experience.
                </p>
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
