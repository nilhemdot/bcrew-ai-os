// Tests for .github/workflows/npm-publish.yml
//
// This repository has no YAML-parsing dependency and no existing test
// framework, so these tests use Node's built-in test runner (`node:test`)
// and validate the workflow file's structure with targeted string/regex
// assertions rather than pulling in a new YAML-parsing dependency.
//
// Run with: node --test tests/workflows/npm-publish.workflow.test.mjs

import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'npm-publish.yml')
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json')

let workflowContent
let packageJson

before(async () => {
  workflowContent = await readFile(WORKFLOW_PATH, 'utf8')
  packageJson = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf8'))
})

/**
 * Extracts the ordered list of step directives (`uses:` or `run:`) from the
 * workflow's `steps:` block. This is a minimal, purpose-built parser for this
 * specific fixed-format file rather than a general YAML parser.
 */
function extractSteps(yaml) {
  const stepLineRegex = /^\s*- (uses|run): (.+)$/gm
  const steps = []
  for (const match of yaml.matchAll(stepLineRegex)) {
    steps.push({ kind: match[1], value: match[2].trim() })
  }
  return steps
}

describe('.github/workflows/npm-publish.yml', () => {
  test('file exists and is non-empty', () => {
    assert.ok(workflowContent && workflowContent.length > 0)
  })

  test('documents that the package is private and not published', () => {
    assert.match(workflowContent, /package is private/i)
    assert.match(workflowContent, /not published/i)
  })

  test('declares the expected workflow name', () => {
    assert.match(workflowContent, /^name: Node\.js CI$/m)
  })

  describe('trigger configuration', () => {
    test('triggers on release created events', () => {
      assert.match(workflowContent, /^on:\s*\n\s+release:\s*\n\s+types:\s*\[created\]/m)
    })

    test('does not trigger on push, pull_request, or workflow_dispatch', () => {
      const onBlockMatch = workflowContent.match(/^on:\n([\s\S]*?)\n\n/m)
      assert.ok(onBlockMatch, 'expected an "on:" trigger block')
      const onBlock = onBlockMatch[1]
      assert.doesNotMatch(onBlock, /\bpush\b/)
      assert.doesNotMatch(onBlock, /\bpull_request\b/)
      assert.doesNotMatch(onBlock, /\bworkflow_dispatch\b/)
      assert.doesNotMatch(onBlock, /\bschedule\b/)
    })
  })

  describe('permissions', () => {
    test('grants read-only contents permission', () => {
      assert.match(workflowContent, /^permissions:\s*\n\s+contents: read\s*$/m)
    })

    test('does not grant any write permissions', () => {
      const permissionsMatch = workflowContent.match(/^permissions:\n([\s\S]*?)\n\n/m)
      assert.ok(permissionsMatch, 'expected a "permissions:" block')
      assert.doesNotMatch(permissionsMatch[1], /write/i)
    })
  })

  describe('build job', () => {
    test('defines exactly one job named "build" running on ubuntu-latest', () => {
      const jobsBlockMatch = workflowContent.match(/^jobs:\n([\s\S]*)$/m)
      assert.ok(jobsBlockMatch, 'expected a "jobs:" block')
      const jobNames = [...jobsBlockMatch[1].matchAll(/^ {2}([a-zA-Z0-9_-]+):\s*$/gm)].map((m) => m[1])
      assert.deepEqual(jobNames, ['build'])
      assert.match(workflowContent, /build:\s*\n\s+runs-on: ubuntu-latest/)
    })

    test('checks out the repository with actions/checkout@v4 and disables credential persistence', () => {
      assert.match(workflowContent, /- uses: actions\/checkout@v4\s*\n\s+with:\s*\n\s+persist-credentials: false/)
    })

    test('sets up Node.js with actions/setup-node@v4 pinned to node-version 20', () => {
      assert.match(workflowContent, /- uses: actions\/setup-node@v4\s*\n\s+with:\s*\n\s+node-version: 20/)
    })

    test('installs dependencies with a clean, lockfile-strict "npm ci" (not "npm install")', () => {
      assert.match(workflowContent, /^\s*- run: npm ci\s*$/m)
      assert.doesNotMatch(workflowContent, /- run: npm install\b/)
    })

    test('runs the foundation verification script', () => {
      assert.match(workflowContent, /^\s*- run: npm run foundation:verify\s*$/m)
    })

    test('does not run "npm publish"', () => {
      assert.doesNotMatch(workflowContent, /npm publish/)
    })

    test('executes steps in the required order: checkout, setup-node, npm ci, foundation:verify', () => {
      const steps = extractSteps(workflowContent)
      assert.deepEqual(steps, [
        { kind: 'uses', value: 'actions/checkout@v4' },
        { kind: 'uses', value: 'actions/setup-node@v4' },
        { kind: 'run', value: 'npm ci' },
        { kind: 'run', value: 'npm run foundation:verify' },
      ])
    })
  })

  describe('consistency with package.json', () => {
    test('the "foundation:verify" script referenced by the workflow exists in package.json', () => {
      assert.ok(
        packageJson.scripts && typeof packageJson.scripts['foundation:verify'] === 'string',
        'expected package.json#scripts to define "foundation:verify"'
      )
    })

    test('the workflow node-version satisfies package.json engines.node', () => {
      const nodeVersionMatch = workflowContent.match(/node-version: (\d+)/)
      assert.ok(nodeVersionMatch, 'expected to find a node-version in the workflow')
      const workflowNodeMajor = Number(nodeVersionMatch[1])

      const enginesNode = packageJson.engines && packageJson.engines.node
      assert.ok(enginesNode, 'expected package.json#engines.node to be defined')

      const requiredMajorMatch = enginesNode.match(/(\d+)/)
      assert.ok(requiredMajorMatch, 'expected engines.node to contain a numeric version')
      const requiredMajor = Number(requiredMajorMatch[1])

      assert.ok(
        workflowNodeMajor >= requiredMajor,
        `workflow node-version (${workflowNodeMajor}) should satisfy package.json engines.node (${enginesNode})`
      )
    })
  })
})