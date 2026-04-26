function getNextPath() {
  var params = new URLSearchParams(window.location.search)
  var next = params.get('next') || ''
  if (!next || next.charAt(0) !== '/' || next.indexOf('//') === 0) return ''
  if (/^\/(?:login|api\/auth)/.test(next)) return ''
  return next
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

document.addEventListener('DOMContentLoaded', function() {
  fetch('/api/auth/session', { cache: 'no-store' }).then(function(response) {
    return response.json()
  }).then(function(session) {
    if (session.authenticated) {
      redirectTo(getNextPath() || session.defaultRoute || '/')
    }
  }).catch(function() {
    // Let the form handle the next request.
  })

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
})
