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
    'Hey ' + greetingName + ',',
    '',
    'You are at your ' + milestoneDay + '-day Benson Crew check-in.',
    '',
    'We are looking for honest feedback on what is working, what feels confusing, and what would make the onboarding experience stronger.',
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
              <td style="background:#111111;padding:22px 26px;border-bottom:4px solid #0084C9;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Benson Crew</div>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="display:inline-block;color:#ffffff;background:#0084C9;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:800;letter-spacing:.04em;">${milestoneDay}-DAY CHECK-IN</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 32px;">
                <p style="margin:0 0 10px;color:#0084C9;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Private feedback</p>
                <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#111111;">How have your first ${milestoneDay} days felt?</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#30343b;">
                  Hey ${escapedName}, we are looking for honest feedback on what is working, what feels confusing, and what would make the onboarding experience stronger.
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
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;background:#f7f8fa;border-left:4px solid #0084C9;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0;font-size:14px;line-height:1.55;color:#4b5563;">
                        Your answers go to Steve so we can improve the experience. Be direct.
                      </p>
                    </td>
                  </tr>
                </table>
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
