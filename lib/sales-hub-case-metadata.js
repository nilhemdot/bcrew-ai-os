export function hasSalesHubSnoozeInput(body = {}) {
  return Object.prototype.hasOwnProperty.call(body, 'snoozeUntil') ||
    Object.prototype.hasOwnProperty.call(body, 'snoozeReason') ||
    Object.prototype.hasOwnProperty.call(body, 'clearSnooze')
}

export function buildSalesHubCaseMetadata(baseMetadata = {}, body = {}, actor = {}) {
  const metadata = { ...baseMetadata }
  if (!hasSalesHubSnoozeInput(body)) return metadata

  const clearSnooze = body.clearSnooze === true || String(body.clearSnooze || '').toLowerCase() === 'true'
  const until = String(body.snoozeUntil || '').trim()
  if (clearSnooze || !until) {
    metadata.glsSnooze = null
    return metadata
  }

  metadata.glsSnooze = {
    until,
    reason: String(body.snoozeReason || '').trim().slice(0, 240),
    snoozedAt: new Date().toISOString(),
    snoozedBy: actor.email || actor.name || 'Sales Hub user',
  }
  return metadata
}
