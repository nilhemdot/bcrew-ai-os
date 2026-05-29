import crypto from 'node:crypto'

import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} from './source-session-broker.js'

export const CREATOR_NEWSLETTER_INTAKE_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const CREATOR_NEWSLETTER_INTAKE_SCRIPT_PATH = 'scripts/process-creator-newsletter-intake-runner-check.mjs'
export const CREATOR_NEWSLETTER_INTAKE_CLI_PATH = 'scripts/run-creator-newsletter-intake.mjs'
export const CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL = 'AIOS Sources/Newsletters'
export const CREATOR_NEWSLETTER_APPROVED_SOURCE_ACCOUNTS = Object.freeze([
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  'crewbert@bensoncrew.ca',
])
export const CREATOR_NEWSLETTER_LIVE_SIGNUP_REQUIRED_FLAGS = Object.freeze([
  '--apply',
  '--allow-external-signup',
  '--standing-policy-approved',
  '--confirmation-readback-required',
])

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  externalSignupSubmitted: false,
  localFixtureFormSubmitted: false,
  submittedForm: false,
  confirmationEmailRead: false,
  mailboxLabelMutated: false,
  paymentStarted: false,
  phoneSubmitted: false,
  profileMutated: false,
  credentialMutated: false,
  downloadedFile: false,
  purchased: false,
  postedOrMessaged: false,
  backlogWritten: false,
  providerCallStarted: false,
  rawSecretPrinted: false,
})

const UNSAFE_URL_RE = /(?:^|[/?#&=._-])(checkout|payment|billing|purchase|buy|cart|login|signin|sign-in|account|settings|profile|password|mfa|2fa|phone|sms|download|unsubscribe)(?:[/?#&=._-]|$)/i
const NEWSLETTER_RE = /\b(newsletter|subscribe|subscription|signup|sign-up|optin|opt-in|updates|weekly|mailing list|email list)\b/i
const SAFE_NAME_RE = /^(email|e-mail|mail|first[_ -]?name|last[_ -]?name|name|full[_ -]?name|fname|lname|submit|button|hidden|csrf|token|utm|source|ref)$/i
const UNSAFE_FIELD_RE = /\b(phone|mobile|sms|password|passcode|credit|card|cc-|cvc|cvv|billing|address|street|city|zip|postal|company|role|title|website|linkedin|twitter|x_profile|profile|username|handle|payment|checkout|coupon)\b/i

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function parsedUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function hostOf(value = '') {
  return parsedUrl(value)?.hostname.replace(/^www\./, '').toLowerCase() || ''
}

function localFixtureUrl(url = '') {
  const host = hostOf(url)
  return host === '127.0.0.1' || host === 'localhost'
}

function stripHtml(value = '') {
  return text(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle(html = '') {
  return stripHtml(
    String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
      '',
  ).slice(0, 160)
}

function attr(source = '', name = '') {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const quoted = String(source || '').match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
  if (quoted != null) return text(quoted)
  const bare = String(source || '').match(new RegExp(`\\b${escaped}\\s*=\\s*([^\\s>]+)`, 'i'))?.[1]
  if (bare != null) return text(bare)
  return ''
}

function hasAttr(source = '', name = '') {
  return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(String(source || ''))
}

function fieldLabel(field = {}) {
  return [
    field.type,
    field.name,
    field.id,
    field.placeholder,
    field.ariaLabel,
    field.text,
  ].map(text).filter(Boolean).join(' ')
}

function fieldIsEmail(field = {}) {
  return field.type === 'email' || /\be-?mail\b/i.test(fieldLabel(field))
}

function fieldIsSafeNewsletterField(field = {}) {
  const type = text(field.type || 'text').toLowerCase()
  if (['submit', 'button', 'hidden'].includes(type)) return true
  if (fieldIsEmail(field)) return true
  const label = fieldLabel(field)
  const key = text(field.name || field.id || field.placeholder || type)
  return SAFE_NAME_RE.test(key) && !UNSAFE_FIELD_RE.test(label)
}

function fieldBlockers(fields = []) {
  return list(fields)
    .map(field => {
      const label = fieldLabel(field)
      const type = text(field.type).toLowerCase()
      if (type === 'password' || /\bpassword|passcode|mfa|2fa\b/i.test(label)) {
        return { type: 'credential_or_auth_field', field: field.name || field.id || field.placeholder || type }
      }
      if (type === 'tel' || /\b(phone|mobile|sms)\b/i.test(label)) {
        return { type: 'phone_required', field: field.name || field.id || field.placeholder || type }
      }
      if (/\b(credit|card|cc-|cvc|cvv|billing|payment|checkout)\b/i.test(label)) {
        return { type: 'payment_or_billing_field', field: field.name || field.id || field.placeholder || type }
      }
      if (!fieldIsSafeNewsletterField(field)) {
        return { type: 'non_newsletter_profile_field', field: field.name || field.id || field.placeholder || type }
      }
      return null
    })
    .filter(Boolean)
}

function extractFields(formHtml = '') {
  const fields = []
  const inputRe = /<(input|textarea|select|button)\b([^>]*)>([\s\S]*?)<\/\1>|<(input)\b([^>]*)\/?>/gi
  let match = null
  while ((match = inputRe.exec(String(formHtml || '')))) {
    const tag = text(match[1] || match[4]).toLowerCase()
    const attrs = match[2] || match[5] || ''
    const inner = match[3] || ''
    fields.push({
      tag,
      type: text(attr(attrs, 'type') || (tag === 'button' ? 'submit' : 'text')).toLowerCase(),
      name: attr(attrs, 'name'),
      id: attr(attrs, 'id'),
      placeholder: attr(attrs, 'placeholder'),
      ariaLabel: attr(attrs, 'aria-label'),
      required: hasAttr(attrs, 'required'),
      text: stripHtml(inner).slice(0, 120),
    })
  }
  return fields
}

function formMethod(attrs = '') {
  const method = text(attr(attrs, 'method') || 'get').toUpperCase()
  return method === 'POST' ? 'POST' : 'GET'
}

function actionUrl(attrs = '', baseUrl = '') {
  const action = attr(attrs, 'action') || baseUrl
  try {
    return new URL(action, baseUrl).toString()
  } catch {
    return ''
  }
}

function extractForms(html = '', baseUrl = '') {
  const forms = []
  const re = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi
  let match = null
  while ((match = re.exec(String(html || '')))) {
    const attrs = match[1] || ''
    const body = match[2] || ''
    const fields = extractFields(body)
    const blockers = fieldBlockers(fields)
    forms.push({
      formIndex: forms.length,
      actionUrl: actionUrl(attrs, baseUrl),
      method: formMethod(attrs),
      hasEmailInput: fields.some(fieldIsEmail),
      safeForNewsletterSignup: fields.some(fieldIsEmail) && blockers.length === 0,
      blockers,
      fields: fields.map(field => ({
        tag: field.tag,
        type: field.type,
        name: field.name,
        placeholder: field.placeholder,
        required: field.required,
        safeNewsletterField: fieldIsSafeNewsletterField(field),
      })),
      submitLabels: fields
        .filter(field => field.type === 'submit' || field.tag === 'button')
        .map(field => field.text || field.name || field.placeholder || 'submit')
        .filter(Boolean)
        .slice(0, 5),
    })
  }

  if (!forms.length && /<input\b/i.test(String(html || ''))) {
    const fields = extractFields(html)
    const blockers = fieldBlockers(fields)
    forms.push({
      formIndex: 0,
      actionUrl: baseUrl,
      method: 'GET',
      hasEmailInput: fields.some(fieldIsEmail),
      safeForNewsletterSignup: fields.some(fieldIsEmail) && blockers.length === 0,
      blockers,
      fields: fields.map(field => ({
        tag: field.tag,
        type: field.type,
        name: field.name,
        placeholder: field.placeholder,
        required: field.required,
        safeNewsletterField: fieldIsSafeNewsletterField(field),
      })),
      submitLabels: [],
    })
  }

  return forms
}

function pageBlockers({ url = '', title = '', htmlText = '', forms = [] } = {}) {
  const blockers = []
  const surface = `${url} ${title} ${htmlText.slice(0, 900)}`
  if (UNSAFE_URL_RE.test(url)) {
    blockers.push({ type: 'unsafe_start_url', reason: 'The URL looks like login, profile, payment, checkout, account, download, or unsubscribe flow.' })
  }
  if (/\b(price|checkout|payment|credit card|billing|upgrade|paid plan|buy now)\b/i.test(surface)) {
    blockers.push({ type: 'payment_or_upgrade_surface', reason: 'Page appears to include payment, checkout, upgrade, or billing language.' })
  }
  if (/\b(log in|login|sign in|password|2fa|mfa|private account)\b/i.test(surface)) {
    blockers.push({ type: 'auth_or_private_surface', reason: 'Page appears to require login, password, MFA, or private-account access.' })
  }
  for (const form of list(forms)) {
    for (const blocker of list(form.blockers)) blockers.push({ ...blocker, formIndex: form.formIndex })
  }
  return blockers
}

function pickNewsletterForm(forms = []) {
  return list(forms).find(form => form.safeForNewsletterSignup && form.hasEmailInput) || null
}

function sourceIdentity(account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT) {
  return {
    account,
    inboxLabel: CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL,
    mailboxRoute: `${account} -> ${CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL}`,
    confirmationPolicy: 'Read confirmation email from the source inbox before claiming subscribed status.',
  }
}

function approvedSourceAccount(account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT) {
  const normalized = text(account).toLowerCase()
  return CREATOR_NEWSLETTER_APPROVED_SOURCE_ACCOUNTS.some(candidate => candidate.toLowerCase() === normalized)
}

function formSubmissionBody({
  form = {},
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
} = {}) {
  const body = new URLSearchParams()
  const fields = list(form.fields)
  const emailField = fields.find(field => field.type === 'email' || /\be-?mail\b/i.test(`${field.name} ${field.placeholder}`))
  body.set(emailField?.name || 'email', account)
  for (const field of fields) {
    const name = text(field.name)
    if (!name || body.has(name)) continue
    if (/first/i.test(name)) body.set(name, 'AIOS')
    if (/last/i.test(name)) body.set(name, 'Sources')
    if (/^name$/i.test(name)) body.set(name, 'AIOS Sources')
  }
  return body
}

function externalActionBlockers(form = {}) {
  const blockers = []
  const action = parsedUrl(form.actionUrl)
  if (!action || !/^https?:$/.test(action.protocol)) {
    blockers.push({ type: 'invalid_form_action', reason: 'Newsletter signup form action must be an http(s) URL.' })
  } else if (UNSAFE_URL_RE.test(action.toString())) {
    blockers.push({ type: 'unsafe_form_action_url', reason: 'Newsletter signup form action looks like login, account, payment, checkout, download, or unsubscribe.' })
  }
  if (!['GET', 'POST'].includes(form.method)) {
    blockers.push({ type: 'unsupported_form_method', reason: 'Newsletter signup form must use GET or POST.' })
  }
  return blockers
}

function buildSignupPacket({ report = {}, form = null } = {}) {
  const pendingConfirmation = report.status === 'external_newsletter_signup_submitted_waiting_confirmation'
  return {
    packetId: report.runId || `creator-newsletter-intake:${stableHash(report.url || 'newsletter').slice(0, 12)}`,
    cardId: CREATOR_NEWSLETTER_INTAKE_CARD_ID,
    sourceUrl: report.url || '',
    sourceHost: hostOf(report.url || ''),
    sourceTitle: report.title || '',
    status: report.status || 'unknown',
    account: report.sourceIdentity?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    inboxLabel: CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL,
    submitAllowedNow: report.submitAllowedNow === true,
    selectedForm: form
      ? {
          actionUrl: form.actionUrl,
          method: form.method,
          fieldCount: list(form.fields).length,
          submitLabels: list(form.submitLabels),
        }
      : null,
    blockers: list(report.blockers),
    subscribedStatus: pendingConfirmation ? 'pending_confirmation' : 'not_claimed',
    requiresConfirmationReadback: true,
    confirmationReadback: {
      required: true,
      sourceId: 'SRC-GMAIL-001',
      account: report.sourceIdentity?.account || SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
      inboxLabel: CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL,
      status: pendingConfirmation ? 'pending_confirmation_email' : 'not_started',
      plainEnglish: pendingConfirmation
        ? 'The signup submit succeeded, but the system must read the confirmation email before claiming subscribed status.'
        : 'Do not claim this newsletter is subscribed until a confirmation email is read from the source mailbox.',
    },
    issueExtractionPlan: {
      status: pendingConfirmation ? 'waiting_for_confirmation' : 'not_started',
      destination: 'Foundation intelligence pool after confirmed source issue readback',
      extracts: [
        'creator/source identity',
        'issue title and date',
        'implementation ideas',
        'resource links',
        'paid/product gates',
        'unsubscribe or park signal',
      ],
    },
    unsubscribeOrParkPolicy: 'If confirmed newsletter issues are low-value, route an unsubscribe/park recommendation before recurring monitoring continues.',
    sideEffects: { ...DEFAULT_SIDE_EFFECTS, ...(report.sideEffects || {}) },
    nextAction: report.submitAllowedNow
      ? 'Signup has permission to submit through the source identity lane, then confirmation email must be read back before claiming subscribed status.'
      : 'Keep this as a dry-run source packet until the signup lane is explicitly allowed to submit.',
  }
}

function unsafeSideEffectList(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

async function submitLocalFixtureForm({
  form = {},
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  fetchImpl = globalThis.fetch,
} = {}) {
  const body = formSubmissionBody({ form, account })
  const method = form.method === 'POST' ? 'POST' : 'GET'
  const url = method === 'GET'
    ? `${form.actionUrl}${form.actionUrl.includes('?') ? '&' : '?'}${body.toString()}`
    : form.actionUrl
  const response = await fetchImpl(url, {
    method,
    headers: method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : undefined,
    body: method === 'POST' ? body.toString() : undefined,
  })
  return {
    ok: response.ok,
    status: response.status,
    actionUrl: form.actionUrl,
    method,
  }
}

async function submitExternalNewsletterForm({
  form = {},
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  fetchImpl = globalThis.fetch,
} = {}) {
  const body = formSubmissionBody({ form, account })
  const method = form.method === 'POST' ? 'POST' : 'GET'
  const url = method === 'GET'
    ? `${form.actionUrl}${form.actionUrl.includes('?') ? '&' : '?'}${body.toString()}`
    : form.actionUrl
  const response = await fetchImpl(url, {
    method,
    redirect: 'follow',
    headers: method === 'POST'
      ? {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'text/html,text/plain;q=0.9,*/*;q=0.1',
          'user-agent': 'bcrew-ai-os-creator-newsletter-intake/1.0',
        }
      : {
          accept: 'text/html,text/plain;q=0.9,*/*;q=0.1',
          'user-agent': 'bcrew-ai-os-creator-newsletter-intake/1.0',
        },
    body: method === 'POST' ? body.toString() : undefined,
  })
  return {
    ok: response.ok,
    status: response.status,
    actionUrl: form.actionUrl,
    method,
  }
}

export async function runCreatorNewsletterIntake({
  url = '',
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  apply = false,
  allowLocalFixture = false,
  allowExternalSignup = false,
  standingPolicyApproved = false,
  confirmationReadbackRequired = false,
  maxBytes = 180000,
  fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
} = {}) {
  const sideEffects = { ...DEFAULT_SIDE_EFFECTS }
  const target = parsedUrl(url)
  if (!target || !/^https?:$/.test(target.protocol)) {
    return {
      ok: false,
      status: 'blocked',
      reason: 'invalid_newsletter_url',
      url,
      sourceIdentity: sourceIdentity(account),
      blockers: [{ type: 'invalid_url', reason: 'Newsletter intake requires an http(s) URL.' }],
      forms: [],
      sideEffects,
    }
  }
  if (typeof fetchImpl !== 'function') throw new Error('runCreatorNewsletterIntake requires fetchImpl or global fetch.')

  let response = null
  try {
    response = await fetchImpl(target.toString(), {
      redirect: 'follow',
      headers: {
        accept: 'text/html,text/plain;q=0.9,*/*;q=0.1',
        'user-agent': 'bcrew-ai-os-creator-newsletter-intake/1.0',
      },
    })
  } catch (error) {
    return {
      ok: false,
      status: 'blocked',
      reason: 'newsletter_page_fetch_failed',
      url: target.toString(),
      sourceIdentity: sourceIdentity(account),
      blockers: [{ type: 'fetch_failed', reason: error instanceof Error ? error.message : String(error) }],
      forms: [],
      sideEffects,
    }
  }

  const contentType = text(response.headers?.get?.('content-type')).toLowerCase()
  if (!response.ok || (contentType && !/text\/html|text\/plain|application\/xhtml/.test(contentType))) {
    return {
      ok: false,
      status: 'blocked',
      reason: 'newsletter_page_not_public_html',
      url: target.toString(),
      httpStatus: response.status,
      contentType,
      sourceIdentity: sourceIdentity(account),
      blockers: [{ type: 'not_public_html', reason: 'Newsletter intake only reads public HTML/text pages.' }],
      forms: [],
      sideEffects,
    }
  }

  const html = (await response.text()).slice(0, Number(maxBytes) || 180000)
  const title = extractTitle(html) || target.toString()
  const htmlText = stripHtml(html)
  const forms = extractForms(html, target.toString())
  const selectedForm = pickNewsletterForm(forms)
  const blockers = pageBlockers({ url: target.toString(), title, htmlText, forms })
  const newsletterSignals = NEWSLETTER_RE.test(`${target.toString()} ${title} ${htmlText.slice(0, 1400)}`)
  const runId = `creator-newsletter-intake:${stableHash(`${target.toString()}:${now}`).slice(0, 12)}`

  const base = {
    ok: Boolean(selectedForm) && blockers.length === 0,
    status: '',
    cardId: CREATOR_NEWSLETTER_INTAKE_CARD_ID,
    runId,
    capturedAt: now,
    url: target.toString(),
    host: hostOf(target.toString()),
    title,
    sourceIdentity: sourceIdentity(account),
    newsletterSignals,
    formCount: forms.length,
    selectedForm: selectedForm ? {
      actionUrl: selectedForm.actionUrl,
      method: selectedForm.method,
      fieldCount: list(selectedForm.fields).length,
      submitLabels: list(selectedForm.submitLabels),
    } : null,
    forms,
    blockers,
    submitAllowedNow: false,
    submissionResult: null,
    sideEffects,
  }

  if (blockers.length) {
    return {
      ...base,
      ok: false,
      status: 'blocked',
      reason: blockers[0]?.type || 'newsletter_page_blocked',
      plainEnglish: 'Newsletter intake stopped because the page/form includes payment, auth, phone, profile, unsafe URL, or non-newsletter fields.',
      signupPacket: buildSignupPacket({ report: { ...base, status: 'blocked' }, form: selectedForm }),
    }
  }

  if (!selectedForm) {
    return {
      ...base,
      ok: false,
      status: newsletterSignals ? 'newsletter_page_read_no_signup_form' : 'not_a_newsletter_signup_page',
      reason: newsletterSignals ? 'no_signup_form_detected' : 'no_newsletter_signal_or_email_form',
      plainEnglish: newsletterSignals
        ? 'Public newsletter-like page was read, but no safe email signup form was detected.'
        : 'Public page was read, but it does not look like a newsletter signup.',
      signupPacket: buildSignupPacket({ report: { ...base, status: newsletterSignals ? 'newsletter_page_read_no_signup_form' : 'not_a_newsletter_signup_page' }, form: selectedForm }),
    }
  }

  if (!apply) {
    const report = {
      ...base,
      ok: true,
      status: 'newsletter_intake_ready_dry_run',
      reason: 'safe_newsletter_signup_form_detected',
      plainEnglish: 'Newsletter intake found a safe public email signup form and produced the source-inbox packet. It did not submit anything.',
    }
    return {
      ...report,
      signupPacket: buildSignupPacket({ report, form: selectedForm }),
    }
  }

  const actionIsLocal = localFixtureUrl(selectedForm.actionUrl)
  if (actionIsLocal && allowLocalFixture) {
    const submissionResult = await submitLocalFixtureForm({ form: selectedForm, account, fetchImpl })
    sideEffects.submittedForm = true
    sideEffects.localFixtureFormSubmitted = true
    const report = {
      ...base,
      ok: submissionResult.ok === true,
      status: submissionResult.ok ? 'local_fixture_newsletter_signup_submitted' : 'blocked',
      reason: submissionResult.ok ? 'local_fixture_signup_only' : 'local_fixture_submit_failed',
      submitAllowedNow: true,
      submissionResult,
      sideEffects,
      plainEnglish: submissionResult.ok
        ? 'Local fixture newsletter signup was submitted to prove mechanics only. No external signup was submitted.'
        : 'Local fixture newsletter signup failed; no external signup was submitted.',
    }
    return {
      ...report,
      signupPacket: buildSignupPacket({ report, form: selectedForm }),
    }
  }

  if (!allowExternalSignup) {
    const report = {
      ...base,
      ok: false,
      status: 'blocked',
      reason: 'external_newsletter_signup_disabled',
      plainEnglish: 'External newsletter signup is disabled for this run. Use dry-run packet review or explicit operator approval before any live submit.',
    }
    return {
      ...report,
      signupPacket: buildSignupPacket({ report, form: selectedForm }),
    }
  }

  const liveBlockers = [
    ...(standingPolicyApproved ? [] : [{ type: 'standing_newsletter_policy_not_approved_for_run', reason: 'Live newsletter signup requires the explicit standing policy flag for this run.' }]),
    ...(confirmationReadbackRequired ? [] : [{ type: 'confirmation_readback_not_required_for_run', reason: 'Live newsletter signup requires an explicit confirmation-readback requirement before submit.' }]),
    ...(approvedSourceAccount(account) ? [] : [{ type: 'unapproved_newsletter_source_account', reason: 'Live newsletter signup can only use an approved AIOS newsletter source account.' }]),
    ...externalActionBlockers(selectedForm),
  ]
  if (liveBlockers.length) {
    const report = {
      ...base,
      ok: false,
      status: 'blocked',
      reason: liveBlockers[0]?.type || 'live_newsletter_signup_blocked',
      blockers: liveBlockers,
      plainEnglish: `External newsletter signup is still blocked. Required flags: ${CREATOR_NEWSLETTER_LIVE_SIGNUP_REQUIRED_FLAGS.join(' ')}.`,
    }
    return {
      ...report,
      signupPacket: buildSignupPacket({ report, form: selectedForm }),
    }
  }

  const submissionResult = await submitExternalNewsletterForm({ form: selectedForm, account, fetchImpl })
  sideEffects.submittedForm = true
  sideEffects.externalSignupSubmitted = true
  const report = {
    ...base,
    ok: submissionResult.ok === true,
    status: submissionResult.ok ? 'external_newsletter_signup_submitted_waiting_confirmation' : 'blocked',
    reason: submissionResult.ok ? 'external_signup_submitted_confirmation_required' : 'external_signup_submit_failed',
    submitAllowedNow: true,
    submissionResult,
    sideEffects,
    plainEnglish: submissionResult.ok
      ? 'External newsletter signup was submitted through the approved source identity. Do not claim subscribed status until the confirmation email is read back.'
      : 'External newsletter signup submit failed; no subscribed status is claimed.',
  }
  return {
    ...report,
    signupPacket: buildSignupPacket({ report, form: selectedForm }),
  }
}

export function buildCreatorNewsletterIntakePacket(report = {}) {
  return buildSignupPacket({ report, form: report.selectedForm })
}

export function evaluateCreatorNewsletterIntakeReport(report = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const sideEffectViolations = unsafeSideEffectList(report.sideEffects || {})
  add(report.status === 'newsletter_intake_ready_dry_run' && report.ok === true, 'dry_run_detects_safe_newsletter_form', report.status || 'missing')
  add(report.submitAllowedNow === false, 'dry_run_does_not_allow_submit_now', String(report.submitAllowedNow))
  add(report.sourceIdentity?.account === SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT, 'default_source_identity_account_visible', report.sourceIdentity?.account || 'missing')
  add(report.sourceIdentity?.inboxLabel === CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL, 'newsletter_inbox_label_visible', report.sourceIdentity?.inboxLabel || 'missing')
  add(report.signupPacket?.inboxLabel === CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL, 'signup_packet_routes_to_newsletter_inbox', report.signupPacket?.inboxLabel || 'missing')
  add(sideEffectViolations.length === 0, 'dry_run_has_no_external_or_local_side_effects', sideEffectViolations.join(', ') || 'none')
  add(list(report.forms).some(form => form.hasEmailInput && form.safeForNewsletterSignup), 'safe_email_form_recorded', `${list(report.forms).length} form(s)`)
  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
