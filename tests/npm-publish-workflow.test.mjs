import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const workflowPath = path.join(repoRoot, '.github/workflows/npm-publish.yml')

// This suite validates the structure and intent of the release CI workflow
// added in .github/workflows/npm-publish.yml. Since the repo has no YAML
// parsing dependency, the workflow is validated with targeted, order-aware
// text assertions rather than a full YAML parse.

function readWorkflow() {
  return fs.readFileSync(workflowPath, 'utf8')
}

function extractSteps(content) {
  return [...content.matchAll(/^\s*-\s+(uses|run):\s*(.+)$/gm)].map(match => ({
    type: match[1],
    value: match[2].trim(),
  }))
}

test('workflow file exists at the expected path', () => {
  assert.equal(fs.existsSync(workflowPath), true)
})

test('has a header comment documenting that the package is private and not published', () => {
  const content = readWorkflow()
  const header = content.split('\n').slice(0, 2).join('\n')
  assert.match(header, /foundation verification/i)
  assert.match(header, /private/i)
  assert.match(header, /not published/i)
})

test('declares the workflow name "Node.js CI"', () => {
  const content = readWorkflow()
  assert.match(content, /^name:\s*Node\.js CI\s*$/m)
})

test('triggers only on release creation, not on push or pull_request', () => {
  const content = readWorkflow()
  assert.match(content, /^on:\s*$/m)
  assert.match(content, /^\s*release:\s*$/m)
  assert.match(content, /^\s*types:\s*\[created\]\s*$/m)
  assert.doesNotMatch(content, /^\s*push:\s*$/m)
  assert.doesNotMatch(content, /^\s*pull_request:\s*$/m)
  assert.doesNotMatch(content, /^\s*schedule:\s*$/m)
  assert.doesNotMatch(content, /^\s*workflow_dispatch:\s*$/m)
})

test('grants only least-privilege read-only contents permission', () => {
  const content = readWorkflow()
  assert.match(content, /^permissions:\s*$/m)
  assert.match(content, /^\s*contents:\s*read\s*$/m)
  // Regression guard: no elevated or write-scoped permissions should sneak in.
  assert.doesNotMatch(content, /contents:\s*write/)
  assert.doesNotMatch(content, /id-token:\s*write/)
  assert.doesNotMatch(content, /packages:\s*write/)
})

test('defines a single "build" job running on ubuntu-latest', () => {
  const content = readWorkflow()
  assert.match(content, /^jobs:\s*$/m)
  const jobsSection = content.slice(content.indexOf('\njobs:'))
  const jobNames = [...jobsSection.matchAll(/^\s{2}([\w-]+):\s*$/gm)].map(m => m[1])
  assert.deepEqual(jobNames, ['build'])
  assert.match(content, /^\s*runs-on:\s*ubuntu-latest\s*$/m)
})

test('checks out the repository with actions/checkout@v4 and does not persist credentials', () => {
  const content = readWorkflow()
  const checkoutIndex = content.indexOf('actions/checkout@v4')
  const setupNodeIndex = content.indexOf('actions/setup-node@v4')
  assert.notEqual(checkoutIndex, -1)
  assert.ok(checkoutIndex < setupNodeIndex, 'checkout step must come before setup-node step')

  const checkoutBlock = content.slice(checkoutIndex, setupNodeIndex)
  assert.match(checkoutBlock, /persist-credentials:\s*false/)
})

test('sets up Node.js with actions/setup-node@v4 pinned to node-version 20', () => {
  const content = readWorkflow()
  const setupNodeIndex = content.indexOf('actions/setup-node@v4')
  const npmCiIndex = content.indexOf('npm ci')
  assert.notEqual(setupNodeIndex, -1)
  assert.ok(setupNodeIndex < npmCiIndex, 'setup-node step must come before npm ci step')

  const setupNodeBlock = content.slice(setupNodeIndex, npmCiIndex)
  assert.match(setupNodeBlock, /node-version:\s*20\b/)
})

test('installs dependencies with a clean, reproducible "npm ci" (not "npm install")', () => {
  const content = readWorkflow()
  assert.match(content, /^\s*-\s+run:\s*npm ci\s*$/m)
  assert.doesNotMatch(content, /run:\s*npm install\b/)
})

test('runs foundation verification instead of publishing to npm', () => {
  const content = readWorkflow()
  assert.match(content, /^\s*-\s+run:\s*npm run foundation:verify\s*$/m)
  // Regression guard: this workflow must never actually publish the private package.
  assert.doesNotMatch(content, /npm publish/)
  assert.doesNotMatch(content, /registry-url/)
  assert.doesNotMatch(content, /NODE_AUTH_TOKEN/)
})

test('executes steps in the expected order: checkout, setup-node, npm ci, then foundation:verify', () => {
  const content = readWorkflow()
  const steps = extractSteps(content)
  assert.deepEqual(steps, [
    { type: 'uses', value: 'actions/checkout@v4' },
    { type: 'uses', value: 'actions/setup-node@v4' },
    { type: 'run', value: 'npm ci' },
    { type: 'run', value: 'npm run foundation:verify' },
  ])
})