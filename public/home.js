/* ── Status Bar ────────────────────────────────────────────────── */

function populateStatusBar(systemStatus) {
  var connected = 0
  var pending = 0

  systemStatus.forEach(function(item) {
    if (item.status === 'connected') connected++
    if (item.status === 'pending') pending++
  })

  var sourcesEl = document.getElementById('home-sources')
  var pendingEl = document.getElementById('home-pending')

  if (sourcesEl) sourcesEl.textContent = connected + ' sources connected'
  if (pendingEl) pendingEl.textContent = pending + ' pending'
}

/* ── Harlan Chat ──────────────────────────────────────────────── */

var harlanPanelReady = false
var harlanResponseIndex = 0

var harlanCannedResponses = [
  "I hear you. The agent infrastructure isn't wired up yet, but the Foundation data is live and waiting.",
  "Good question. Once the backend is connected, I'll be able to pull live data from strategy docs, backlog, and decisions.",
  "Noted. Right now I'm a preview of what's coming — full conversational access to everything in Foundation.",
]

function buildHarlanPanel() {
  var panel = document.getElementById('harlan-panel')
  if (!panel) return

  panel.innerHTML = ''

  var header = document.createElement('div')
  header.className = 'harlan-header'

  var headerInfo = document.createElement('div')
  headerInfo.className = 'harlan-header-info'

  var h4 = document.createElement('h4')
  h4.textContent = 'Harlan'
  headerInfo.appendChild(h4)

  var subtitle = document.createElement('p')
  subtitle.textContent = 'Strategic Assistant'
  headerInfo.appendChild(subtitle)

  var pills = document.createElement('div')
  pills.className = 'harlan-status-pills'

  var pillData = [
    { text: 'Claude Opus', color: 'blue' },
    { text: 'Memory Connected', color: 'green' },
    { text: '5 Sources Live', color: 'green' },
  ]

  pillData.forEach(function(item) {
    var pill = document.createElement('span')
    pill.className = 'harlan-pill harlan-pill-' + item.color

    var dot = document.createElement('span')
    dot.className = 'harlan-pill-dot'
    pill.appendChild(dot)
    pill.appendChild(document.createTextNode(' ' + item.text))

    pills.appendChild(pill)
  })

  headerInfo.appendChild(pills)
  header.appendChild(headerInfo)

  var closeBtn = document.createElement('button')
  closeBtn.className = 'harlan-close'
  closeBtn.id = 'harlan-close'
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  header.appendChild(closeBtn)

  panel.appendChild(header)

  var body = document.createElement('div')
  body.className = 'harlan-body'

  var messages = document.createElement('div')
  messages.className = 'harlan-messages'
  messages.id = 'harlan-messages'
  body.appendChild(messages)

  panel.appendChild(body)

  var inputRow = document.createElement('div')
  inputRow.className = 'harlan-input-row'

  var input = document.createElement('input')
  input.className = 'harlan-input'
  input.id = 'harlan-input'
  input.type = 'text'
  input.placeholder = 'Ask Harlan anything...'
  input.autocomplete = 'off'
  inputRow.appendChild(input)

  var sendBtn = document.createElement('button')
  sendBtn.className = 'harlan-send'
  sendBtn.id = 'harlan-send'
  sendBtn.disabled = true
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>'
  inputRow.appendChild(sendBtn)

  panel.appendChild(inputRow)

  closeBtn.addEventListener('click', closeHarlan)
  input.addEventListener('input', handleHarlanInputChange)
  input.addEventListener('keydown', handleHarlanKeydown)
  sendBtn.addEventListener('click', sendHarlanMessage)
}

function addHarlanMessage(text, role) {
  var messages = document.getElementById('harlan-messages')
  if (!messages) return

  var msg = document.createElement('div')
  msg.className = 'harlan-msg harlan-msg-' + role
  msg.textContent = text
  messages.appendChild(msg)

  messages.scrollTop = messages.scrollHeight
}

function showTypingIndicator() {
  var messages = document.getElementById('harlan-messages')
  if (!messages) return

  var typing = document.createElement('div')
  typing.className = 'harlan-typing'
  typing.id = 'harlan-typing'

  for (var i = 0; i < 3; i++) {
    var dot = document.createElement('div')
    dot.className = 'harlan-typing-dot'
    typing.appendChild(dot)
  }

  messages.appendChild(typing)
  messages.scrollTop = messages.scrollHeight
}

function removeTypingIndicator() {
  var typing = document.getElementById('harlan-typing')
  if (typing) typing.parentNode.removeChild(typing)
}

function openHarlan() {
  var panel = document.getElementById('harlan-panel')
  var toggle = document.getElementById('harlan-toggle')
  if (!panel) return

  if (!harlanPanelReady) {
    buildHarlanPanel()
    harlanPanelReady = true
    addHarlanMessage(
      "Hey Steve. I'm connected to Foundation — strategy docs, business memory, backlog, and decisions are all live. What do you want to dig into?",
      'harlan'
    )
  }

  panel.classList.remove('harlan-hidden')
  if (toggle) toggle.style.display = 'none'

  var input = document.getElementById('harlan-input')
  if (input) input.focus()
}

function closeHarlan() {
  var panel = document.getElementById('harlan-panel')
  var toggle = document.getElementById('harlan-toggle')
  if (!panel) return

  panel.classList.add('harlan-hidden')
  if (toggle) toggle.style.display = ''
}

function handleHarlanInputChange() {
  var input = document.getElementById('harlan-input')
  var sendBtn = document.getElementById('harlan-send')
  if (!input || !sendBtn) return

  sendBtn.disabled = input.value.trim() === ''
}

function handleHarlanKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    sendHarlanMessage()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    closeHarlan()
  }
}

function sendHarlanMessage() {
  var input = document.getElementById('harlan-input')
  var sendBtn = document.getElementById('harlan-send')
  if (!input || !sendBtn) return

  var text = input.value.trim()
  if (!text) return

  addHarlanMessage(text, 'user')

  input.value = ''
  sendBtn.disabled = true

  showTypingIndicator()

  setTimeout(function() {
    removeTypingIndicator()
    var response = harlanCannedResponses[harlanResponseIndex % harlanCannedResponses.length]
    harlanResponseIndex++
    addHarlanMessage(response, 'harlan')
  }, 800)
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape') {
    var panel = document.getElementById('harlan-panel')
    if (panel && !panel.classList.contains('harlan-hidden')) {
      closeHarlan()
    }
  }
}

/* ── Init ─────────────────────────────────────────────────────── */

;(function init() {
  fetch('/api/source-of-truth')
    .then(function(res) {
      if (!res.ok) throw new Error('Status bar fetch failed.')
      return res.json()
    })
    .then(function(data) {
      if (data.systemStatus) populateStatusBar(data.systemStatus)
    })
    .catch(function() {
      /* status bar stays at default text */
    })

  var toggle = document.getElementById('harlan-toggle')
  if (toggle) toggle.addEventListener('click', openHarlan)

  document.addEventListener('keydown', handleGlobalKeydown)
})()
