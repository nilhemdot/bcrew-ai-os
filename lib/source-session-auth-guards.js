import {
  SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
} from './source-session-broker.js'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function surfaceText(authState = {}) {
  return [
    authState.url,
    authState.title,
    authState.bodyTextPreview,
    ...list(authState.loginButtons),
  ].map(value => text(value).toLowerCase()).filter(Boolean).join(' ')
}

export function detectMyicorWrongSignupBranch(authState = {}) {
  const surface = surfaceText(authState)
  const url = text(authState.url).toLowerCase()
  const title = text(authState.title).toLowerCase()
  const explicitLoginSurface = /\/login|\/sign-in|\/signin/.test(url) ||
    /\blog ?in\b|\bsign ?in\b/.test(title)
  const explicitSignupUrl = /\/signup|\/register|\/start-free/.test(url)
  const explicitSignupSurface = explicitSignupUrl || (
    !explicitLoginSurface &&
    /start free|create (your )?(free )?(account|profile)|set up (your )?profile|complete your profile|onboard|onboarding|new account/.test(surface)
  )
  const signupPrimary = /\bsign up\b|signup/.test(surface) && !explicitLoginSurface
  if (explicitSignupSurface || signupPrimary) {
    return 'myicor_wrong_signup_branch_existing_google_sso_required'
  }
  return ''
}

export function detectMyicorHumanVerification(authState = {}) {
  const surface = surfaceText(authState)
  const url = text(authState.url).toLowerCase()
  if (/accounts\.google\.com.*challenge\/pwd/.test(url) && (authState.hasPasswordInput || /enter your password|show password/.test(surface))) {
    return ''
  }
  if (/accounts\.google\.com.*(challenge|signin\/v2\/challenge)|\b(mfa|2fa|passkey|verify|number match|phone approval|authenticator|check your phone|approve.*phone)\b/.test(surface)) {
    return 'myicor_google_sso_mfa_or_human_verification_required'
  }
  return ''
}

export function evaluateMyicorBrowserAuthSurface({
  authState = {},
  account = '',
} = {}) {
  const normalizedAccount = text(account)
  if (normalizedAccount && normalizedAccount !== SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT) {
    return {
      ok: false,
      status: 'auth_needed',
      reason: 'myicor_google_sso_account_mismatch',
      authMethodRequired: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
      expectedAccount: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
    }
  }

  const wrongBranch = detectMyicorWrongSignupBranch(authState)
  if (wrongBranch) {
    return {
      ok: false,
      status: 'auth_needed',
      reason: wrongBranch,
      authMethodRequired: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
      expectedAccount: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
    }
  }

  const humanVerification = detectMyicorHumanVerification(authState)
  if (humanVerification) {
    return {
      ok: false,
      status: 'auth_needed',
      reason: humanVerification,
      authMethodRequired: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
      expectedAccount: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
    }
  }

  const surface = surfaceText(authState)
  const appUrlVisible = /app\.myicor\.com/i.test(authState.url || '')
  const loginSurface = Boolean(
    authState.hasEmailInput ||
    authState.hasPasswordInput ||
    /\/login|\/sign-in|\/signin|oauth|authenticate|log in|login|sign in|continue with google|password/.test(surface),
  )
  if (appUrlVisible && !loginSurface) {
    return {
      ok: true,
      status: 'session_ready',
      reason: 'myicor_existing_google_sso_session_visible',
      authMethodRequired: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
      expectedAccount: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
    }
  }

  return {
    ok: false,
    status: 'auth_needed',
    reason: 'myicor_existing_google_sso_session_missing',
    authMethodRequired: SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
    expectedAccount: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
  }
}

export function buildMyicorAuthGuardDogfoodProof() {
  const cases = [
    {
      name: 'existing_google_sso_session_passes',
      result: evaluateMyicorBrowserAuthSurface({
        account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
        authState: {
          url: 'https://app.myicor.com/workstreams',
          title: 'myICOR',
          bodyTextPreview: 'Workstreams Growth Assignments Tool Stack Lessons',
        },
      }),
      expectedReason: 'myicor_existing_google_sso_session_visible',
      expectedOk: true,
    },
    {
      name: 'start_free_signup_branch_fails_closed',
      result: evaluateMyicorBrowserAuthSurface({
        account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
        authState: {
          url: 'https://app.myicor.com/signup',
          title: 'Start Free',
          bodyTextPreview: 'Create your free account and complete your profile',
        },
      }),
      expectedReason: 'myicor_wrong_signup_branch_existing_google_sso_required',
      expectedOk: false,
    },
    {
      name: 'google_number_match_emits_auth_needed',
      result: evaluateMyicorBrowserAuthSurface({
        account: SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
        authState: {
          url: 'https://accounts.google.com/signin/v2/challenge',
          title: 'Verify it is you',
          bodyTextPreview: 'Check your phone and tap Yes. Number match 82.',
        },
      }),
      expectedReason: 'myicor_google_sso_mfa_or_human_verification_required',
      expectedOk: false,
    },
    {
      name: 'wrong_google_account_fails_closed',
      result: evaluateMyicorBrowserAuthSurface({
        account: 'ai@bensoncrew.ca',
        authState: {
          url: 'https://app.myicor.com/login',
          title: 'Log in',
          bodyTextPreview: 'Log in with Google',
        },
      }),
      expectedReason: 'myicor_google_sso_account_mismatch',
      expectedOk: false,
    },
  ]

  return {
    ok: cases.every(testCase => testCase.result.ok === testCase.expectedOk && testCase.result.reason === testCase.expectedReason),
    cases,
  }
}
