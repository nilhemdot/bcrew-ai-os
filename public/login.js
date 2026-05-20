var sessionState = null

function getNextPath() {
  var params = new URLSearchParams(window.location.search)
  var next = params.get('next') || ''
  if (!next || next.charAt(0) !== '/' || next.indexOf('//') === 0) return ''
  if (/^\/(?:login|api\/auth)/.test(next)) return ''
  return next
}

function getRouteLabel(path) {
  if (!path || path === '/') return 'Command Center'
  if (path.indexOf('/foundation') === 0) return 'Foundation'
  if (path.indexOf('/strategic-execution') === 0) return 'Strategic Execution'
  if (path.indexOf('/sales') === 0) return 'Sales Hub'
  if (path.indexOf('/ops') === 0) return 'Ops Hub'
  return 'Requested workspace'
}

function renderNextPath() {
  var next = getNextPath()
  var el = document.getElementById('login-next')
  if (!el || !next) return
  el.textContent = 'Continue to ' + getRouteLabel(next)
  el.hidden = false
}

function showError(message) {
  var error = document.getElementById('login-error')
  if (!error) return
  error.textContent = message || 'Login failed.'
  error.hidden = false
}

function hideError() {
  var error = document.getElementById('login-error')
  if (error) error.hidden = true
}

function setBusy(busy) {
  var button = document.getElementById('login-submit')
  if (!button) return
  button.disabled = busy
  button.textContent = busy ? 'Logging in...' : 'Log in'
}

function redirectTo(path) {
  window.location.assign(path || '/')
}

function showPasswordFallback() {
  var form = document.getElementById('login-form')
  if (form) form.hidden = false
}

function shouldShowPasswordFallback() {
  return new URLSearchParams(window.location.search).get('password') === '1'
}

function submitGoogleCredential(credential) {
  hideError()
  return fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: credential,
      next: getNextPath(),
    }),
  }).then(function(response) {
    return response.json().catch(function() { return null }).then(function(payload) {
      if (!response.ok) {
        throw new Error(payload && payload.error && payload.error.message ? payload.error.message : 'Google login failed.')
      }
      redirectTo(payload.redirectTo || '/')
    })
  }).catch(function(error) {
    showError(error.message)
  })
}

function renderGoogleButton() {
  if (!sessionState || !sessionState.googleConfigured || !sessionState.googleClientId) {
    showError('Google login is not configured yet.')
    showPasswordFallback()
    return
  }

  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    window.setTimeout(renderGoogleButton, 120)
    return
  }

  window.google.accounts.id.initialize({
    client_id: sessionState.googleClientId,
    callback: function(response) {
      submitGoogleCredential(response.credential)
    },
  })

  window.google.accounts.id.renderButton(
    document.getElementById('google-login-button'),
    {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 360,
    }
  )
}

function setupPasswordFallback() {
  if (shouldShowPasswordFallback()) showPasswordFallback()

  var form = document.getElementById('login-form')
  if (!form) return

  form.addEventListener('submit', function(event) {
    event.preventDefault()
    hideError()
    setBusy(true)

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
        next: getNextPath(),
      }),
    }).then(function(response) {
      return response.json().catch(function() { return null }).then(function(payload) {
        if (!response.ok) {
          throw new Error(payload && payload.error && payload.error.message ? payload.error.message : 'Login failed.')
        }
        redirectTo(payload.redirectTo || '/')
      })
    }).catch(function(error) {
      showError(error.message)
      setBusy(false)
    })
  })
}

document.addEventListener('DOMContentLoaded', function() {
  renderNextPath()
  setupPasswordFallback()

  fetch('/api/auth/session', { cache: 'no-store' }).then(function(response) {
    return response.json()
  }).then(function(session) {
    sessionState = session
    if (session.authenticated) {
      redirectTo(getNextPath() || session.defaultRoute || '/')
      return
    }
    renderGoogleButton()
  }).catch(function() {
    showError('Login is not available right now.')
    showPasswordFallback()
  })
})
