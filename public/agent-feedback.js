function getToken() {
  var params = new URLSearchParams(window.location.search)
  return params.get('token') || ''
}

function setPanelMessage(title, message) {
  var panel = document.getElementById('feedback-panel')
  panel.innerHTML = ''

  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Benson Crew Feedback'
  panel.appendChild(eyebrow)

  var heading = document.createElement('h1')
  heading.textContent = title
  panel.appendChild(heading)

  var copy = document.createElement('p')
  copy.className = 'feedback-intro'
  copy.textContent = message
  panel.appendChild(copy)
}

function createScoreButtons() {
  var grid = document.getElementById('score-grid')
  for (var score = 1; score <= 10; score += 1) {
    var label = document.createElement('label')
    label.className = 'feedback-score-option'

    var input = document.createElement('input')
    input.type = 'radio'
    input.name = 'score'
    input.value = String(score)
    input.required = true

    var text = document.createElement('span')
    text.textContent = String(score)

    label.appendChild(input)
    label.appendChild(text)
    grid.appendChild(label)
  }
}

function selectedScore(form) {
  var selected = form.querySelector('input[name="score"]:checked')
  return selected ? Number(selected.value) : null
}

function loadSession(token) {
  return fetch('/api/agent-feedback/session?token=' + encodeURIComponent(token), {
    cache: 'no-store',
  }).then(function(response) {
    return response.json().then(function(payload) {
      if (!response.ok) {
        throw new Error(payload && payload.error && payload.error.message
          ? payload.error.message
          : 'This feedback link is not valid.')
      }
      return payload
    })
  })
}

function submitFeedback(token, payload) {
  return fetch('/api/agent-feedback/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token,
      score: payload.score,
      improvementFeedback: payload.improvementFeedback,
    }),
  }).then(function(response) {
    return response.json().then(function(payload) {
      if (!response.ok) {
        throw new Error(payload && payload.error && payload.error.message
          ? payload.error.message
          : 'Feedback could not be submitted.')
      }
      return payload
    })
  })
}

document.addEventListener('DOMContentLoaded', function() {
  var token = getToken()
  if (!token) {
    setPanelMessage('Feedback link missing', 'Open the private feedback link from your onboarding check-in request.')
    return
  }

  createScoreButtons()

  loadSession(token).then(function(session) {
    document.getElementById('feedback-intro').textContent =
      'This takes less than 5 minutes. Your feedback helps Steve improve the first ' +
      session.milestoneDay +
      ' days on the team.'
    document.getElementById('score-question').textContent = session.scoreQuestion
    document.getElementById('improvement-question').textContent = session.improvementQuestion
    document.getElementById('privacy-note').textContent = session.privacyNote
    document.getElementById('agent-feedback-form').hidden = false
  }).catch(function(error) {
    setPanelMessage('Feedback link unavailable', error.message)
  })

  var form = document.getElementById('agent-feedback-form')
  form.addEventListener('submit', function(event) {
    event.preventDefault()
    var button = form.querySelector('button[type="submit"]')
    button.disabled = true
    button.textContent = 'Submitting...'

    submitFeedback(token, {
      score: selectedScore(form),
      improvementFeedback: document.getElementById('improvement-feedback').value,
    }).then(function() {
      setPanelMessage('Thank you', 'Your feedback was submitted.')
    }).catch(function(error) {
      button.disabled = false
      button.textContent = 'Submit feedback'
      window.alert(error.message)
    })
  })
})
