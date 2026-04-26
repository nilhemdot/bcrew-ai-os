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
