/* Foundation owner-only user access admin renderer. */

function renderUserAccessPill(label, tone) {
  var pill = document.createElement('span')
  pill.className = 'foundation-system-pill build-log-status-pill build-log-status-' + String(tone || 'pending').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  pill.textContent = label
  return pill
}

function renderFoundationUserSummary(snapshot) {
  return renderOverviewStatusPanel([
    {
      label: 'Active Humans',
      status: 'connected',
      detail: String(snapshot.summary.activeHumanCount || 0),
    },
    {
      label: 'Google Ready',
      status: 'connected',
      detail: String(snapshot.summary.googleLoginReadyCount || 0),
    },
    {
      label: 'Password Fallbacks',
      status: snapshot.summary.passwordFallbackCount ? 'pending' : 'standby',
      detail: String(snapshot.summary.passwordFallbackCount || 0),
    },
    {
      label: 'Audit Events',
      status: snapshot.summary.auditEventCount ? 'connected' : 'standby',
      detail: String(snapshot.summary.auditEventCount || 0),
    },
  ], {
    eyebrow: 'Owner Access',
    title: 'User Access Summary',
    intro: 'Manage login eligibility from the Foundation users table. Secret material is never rendered here.',
  })
}

function buildFoundationUserPayload(form) {
  return {
    email: form.querySelector('[name="email"]').value,
    name: form.querySelector('[name="name"]').value,
    role: form.querySelector('[name="role"]').value,
    tier: Number(form.querySelector('[name="tier"]').value),
    userType: form.querySelector('[name="userType"]').value,
    meetingSyncEnabled: form.querySelector('[name="meetingSyncEnabled"]').checked,
    password: form.querySelector('[name="password"]').value,
    accessReason: form.querySelector('[name="accessReason"]').value,
  }
}

function submitFoundationUserForm(form, status) {
  setFormStatus(status, 'Saving user access...', '')
  foundationRead('/api/foundation/users/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildFoundationUserPayload(form)),
  }).then(function(res) {
    if (!res.ok) {
      return res.json().catch(function() { return null }).then(function(payload) {
        throw parseApiErrorPayload(payload, 'User access save failed.')
      })
    }
    return res.json()
  }).then(function() {
    form.reset()
    cache.foundationUsersAdmin = null
    setFormStatus(status, 'User access saved.', 'success')
    renderFoundationUserAccessAdmin()
  }).catch(function(error) {
    setFormStatus(status, error.message || 'User access save failed.', 'error')
  })
}

function renderFoundationUserForm() {
  var panel = document.createElement('section')
  panel.className = 'panel memory-panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Access Control'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Add or Update User'
  left.appendChild(title)
  var intro = document.createElement('p')
  intro.className = 'section-intro'
  intro.textContent = 'Create an allow-listed user, set the role and tier, and optionally set a temporary password fallback.'
  left.appendChild(intro)
  header.appendChild(left)
  panel.appendChild(header)

  var form = document.createElement('form')
  form.className = 'memory-form-grid'

  var email = buildInput('email', 'name@example.com')
  email.name = 'email'
  email.required = true
  form.appendChild(buildField('Email', email))

  var name = buildInput('text', 'Display name')
  name.name = 'name'
  name.required = true
  form.appendChild(buildField('Name', name))

  var role = buildSelect([
    { value: 'owner', label: 'Owner' },
    { value: 'ops', label: 'Ops' },
    { value: 'sales', label: 'Sales' },
  ])
  role.name = 'role'
  form.appendChild(buildField('Role', role))

  var tier = buildSelect([
    { value: '1', label: 'Tier 1' },
    { value: '2', label: 'Tier 2' },
    { value: '3', label: 'Tier 3', selected: true },
  ])
  tier.name = 'tier'
  form.appendChild(buildField('Tier', tier))

  var userType = buildSelect([
    { value: 'human', label: 'Human' },
    { value: 'system', label: 'System' },
  ])
  userType.name = 'userType'
  form.appendChild(buildField('User Type', userType))

  var password = buildInput('password', 'Optional temporary fallback')
  password.name = 'password'
  form.appendChild(buildField('Password Fallback', password))

  var reason = buildInput('text', 'Approval or reason')
  reason.name = 'accessReason'
  form.appendChild(buildField('Access Reason', reason))

  var syncLabel = document.createElement('label')
  syncLabel.className = 'memory-field memory-checkbox-field'
  var sync = document.createElement('input')
  sync.type = 'checkbox'
  sync.name = 'meetingSyncEnabled'
  syncLabel.appendChild(sync)
  var syncText = document.createElement('span')
  syncText.textContent = 'Meeting sync enabled'
  syncLabel.appendChild(syncText)
  form.appendChild(syncLabel)

  var actions = document.createElement('div')
  actions.className = 'memory-form-actions'
  var submit = document.createElement('button')
  submit.className = 'memory-button'
  submit.type = 'submit'
  submit.textContent = 'Save User'
  actions.appendChild(submit)
  form.appendChild(actions)

  var status = document.createElement('p')
  status.className = 'form-status'
  form.addEventListener('submit', function(event) {
    event.preventDefault()
    submitFoundationUserForm(form, status)
  })

  panel.appendChild(form)
  panel.appendChild(status)
  return panel
}

function toggleFoundationUser(user, active, status) {
  setFormStatus(status, (active ? 'Enabling ' : 'Disabling ') + user.email + '...', '')
  foundationRead('/api/foundation/users/admin/' + encodeURIComponent(user.email), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: active }),
  }).then(function(res) {
    if (!res.ok) {
      return res.json().catch(function() { return null }).then(function(payload) {
        throw parseApiErrorPayload(payload, 'User update failed.')
      })
    }
    return res.json()
  }).then(function() {
    cache.foundationUsersAdmin = null
    renderFoundationUserAccessAdmin()
  }).catch(function(error) {
    setFormStatus(status, error.message || 'User update failed.', 'error')
  })
}

function renderFoundationUserTable(snapshot) {
  var panel = document.createElement('section')
  panel.className = 'panel'

  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Allowed Users'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Foundation Users'
  left.appendChild(title)
  header.appendChild(left)
  panel.appendChild(header)

  var status = document.createElement('p')
  status.className = 'form-status'

  var wrap = document.createElement('div')
  wrap.className = 'md-table-wrap'
  var table = document.createElement('table')
  table.className = 'md-table'
  var thead = document.createElement('thead')
  var headerRow = document.createElement('tr')
  ;['User', 'Role', 'Tier', 'Login', 'State', 'Action'].forEach(function(label) {
    var th = document.createElement('th')
    th.textContent = label
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  var tbody = document.createElement('tbody')
  ;(snapshot.users || []).forEach(function(user) {
    var tr = document.createElement('tr')
    var userCell = document.createElement('td')
    userCell.textContent = user.name + ' · ' + user.email
    tr.appendChild(userCell)
    var roleCell = document.createElement('td')
    roleCell.textContent = user.role
    tr.appendChild(roleCell)
    var tierCell = document.createElement('td')
    tierCell.textContent = user.tier ? 'Tier ' + user.tier : 'None'
    tr.appendChild(tierCell)
    var loginCell = document.createElement('td')
    loginCell.appendChild(renderUserAccessPill(user.loginMethods.google.status, user.loginMethods.google.status === 'ready' ? 'shipped' : 'pending'))
    if (user.loginMethods.passwordFallback.enabled) {
      loginCell.appendChild(renderUserAccessPill('password fallback', 'pending'))
    }
    tr.appendChild(loginCell)
    var stateCell = document.createElement('td')
    stateCell.appendChild(renderUserAccessPill(user.active ? 'active' : 'disabled', user.active ? 'shipped' : 'pending'))
    tr.appendChild(stateCell)
    var actionCell = document.createElement('td')
    var action = document.createElement('button')
    action.className = 'secondary-button'
    action.type = 'button'
    action.textContent = user.active ? 'Disable' : 'Enable'
    action.addEventListener('click', function() {
      toggleFoundationUser(user, !user.active, status)
    })
    actionCell.appendChild(action)
    tr.appendChild(actionCell)
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  wrap.appendChild(table)
  panel.appendChild(wrap)
  panel.appendChild(status)
  return panel
}

function renderFoundationUserAudit(snapshot) {
  if (!snapshot.auditTrail || !snapshot.auditTrail.length) return null
  var panel = document.createElement('section')
  panel.className = 'panel'
  var header = document.createElement('div')
  header.className = 'panel-header'
  var left = document.createElement('div')
  var eyebrow = document.createElement('div')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Audit Trail'
  left.appendChild(eyebrow)
  var title = document.createElement('h3')
  title.textContent = 'Recent Access Changes'
  left.appendChild(title)
  header.appendChild(left)
  panel.appendChild(header)

  var list = document.createElement('div')
  list.className = 'activity-list'
  snapshot.auditTrail.slice(0, 12).forEach(function(event) {
    var item = document.createElement('article')
    item.className = 'activity-item'
    var heading = document.createElement('h4')
    heading.textContent = event.summary
    item.appendChild(heading)
    var meta = document.createElement('p')
    meta.textContent = event.actor + ' · ' + (event.createdAt || '')
    item.appendChild(meta)
    list.appendChild(item)
  })
  panel.appendChild(list)
  return panel
}

function renderFoundationUserAccessAdmin() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading user access.</p>'

  fetchFoundationUsersAdmin().then(function(snapshot) {
    container.innerHTML = ''
    var hero = document.createElement('section')
    hero.className = 'hero'
    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'
    var title = document.createElement('h1')
    title.textContent = 'User Access'
    heroInner.appendChild(title)
    var copy = document.createElement('p')
    copy.className = 'hero-copy'
    copy.textContent = 'Owner-only access control for AIOS users, roles, tiers, login methods, and audit history.'
    heroInner.appendChild(copy)
    hero.appendChild(heroInner)
    container.appendChild(hero)
    container.appendChild(renderFoundationUserSummary(snapshot))
    container.appendChild(renderFoundationUserForm())
    container.appendChild(renderFoundationUserTable(snapshot))
    var audit = renderFoundationUserAudit(snapshot)
    if (audit) container.appendChild(audit)
  }).catch(function(error) {
    container.innerHTML = ''
    var msg = document.createElement('p')
    msg.textContent = 'User access could not load. Details: ' + (error.message || error)
    container.appendChild(msg)
  })
}
