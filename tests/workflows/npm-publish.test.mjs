// Tests for .github/workflows/npm-publish.yml
//
// This project has no YAML-parsing dependency installed, so these tests treat
// the workflow file as structured text and assert on the specific markers
// GitHub Actions requires (trigger, job names, step ordering, and secret
// wiring) rather than pulling in a new dependency just for this file.
//
// Run with: node --test tests/workflows/npm-publish.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workflowPath = path.resolve(
  __dirname,
  '..',
  '..',
  '.github',
  'workflows',
  'npm-publish.yml',
);

function readWorkflow() {
  return readFileSync(workflowPath, 'utf8');
}

function getJobSections(content) {
  const buildStart = content.indexOf('  build:');
  const publishStart = content.indexOf('  publish-npm:');

  assert.notEqual(buildStart, -1, 'expected to find a "build" job');
  assert.notEqual(publishStart, -1, 'expected to find a "publish-npm" job');
  assert.ok(
    buildStart < publishStart,
    'expected "build" job to be defined before "publish-npm" job',
  );

  return {
    build: content.slice(buildStart, publishStart),
    publishNpm: content.slice(publishStart),
  };
}

describe('.github/workflows/npm-publish.yml', () => {
  describe('file structure', () => {
    test('exists at the expected path', () => {
      assert.ok(existsSync(workflowPath), `expected workflow file at ${workflowPath}`);
    });

    test('is non-empty and declares a workflow name', () => {
      const content = readWorkflow();
      assert.ok(content.length > 0, 'workflow file should not be empty');
      assert.match(content, /^name:\s*Node\.js Package\s*$/m);
    });

    test('defines exactly one "build" and one "publish-npm" job', () => {
      const content = readWorkflow();
      const buildMatches = content.match(/^\s{2}build:\s*$/gm) || [];
      const publishMatches = content.match(/^\s{2}publish-npm:\s*$/gm) || [];
      assert.equal(buildMatches.length, 1, 'expected exactly one "build" job entry');
      assert.equal(publishMatches.length, 1, 'expected exactly one "publish-npm" job entry');
    });

    test('does not use tab characters for indentation', () => {
      const content = readWorkflow();
      assert.doesNotMatch(content, /\t/, 'YAML indentation must use spaces, not tabs');
    });
  });

  describe('trigger configuration', () => {
    test('runs on release "created" events', () => {
      const content = readWorkflow();
      assert.match(content, /on:\s*\n\s+release:\s*\n\s+types:\s*\[created\]/);
    });

    test('does not also trigger on push or pull_request', () => {
      const content = readWorkflow();
      // Restrict the check to the "on:" trigger block itself so job/step
      // text further down the file cannot produce a false positive.
      const triggerBlock = content.slice(
        content.indexOf('on:'),
        content.indexOf('jobs:'),
      );
      assert.doesNotMatch(triggerBlock, /^\s*push:/m);
      assert.doesNotMatch(triggerBlock, /^\s*pull_request:/m);
    });
  });

  describe('build job', () => {
    test('runs on ubuntu-latest with no job dependency', () => {
      const { build } = getJobSections(readWorkflow());
      assert.match(build, /runs-on:\s*ubuntu-latest/);
      assert.doesNotMatch(build, /^\s*needs:/m, 'build job should not depend on another job');
    });

    test('checks out the repo and installs Node.js 20 before running npm', () => {
      const { build } = getJobSections(readWorkflow());
      assert.match(build, /uses:\s*actions\/checkout@v4/);
      assert.match(build, /uses:\s*actions\/setup-node@v4/);
      assert.match(build, /node-version:\s*20/);
    });

    test('runs "npm ci" before "npm test", in that order', () => {
      const { build } = getJobSections(readWorkflow());
      const ciIndex = build.indexOf('run: npm ci');
      const testIndex = build.indexOf('run: npm test');
      assert.notEqual(ciIndex, -1, 'expected "npm ci" step');
      assert.notEqual(testIndex, -1, 'expected "npm test" step');
      assert.ok(ciIndex < testIndex, '"npm ci" must run before "npm test"');
    });

    test('checkout happens before setup-node, which happens before npm steps', () => {
      const { build } = getJobSections(readWorkflow());
      const checkoutIndex = build.indexOf('actions/checkout@v4');
      const setupNodeIndex = build.indexOf('actions/setup-node@v4');
      const ciIndex = build.indexOf('run: npm ci');
      assert.ok(checkoutIndex < setupNodeIndex);
      assert.ok(setupNodeIndex < ciIndex);
    });

    test('does not configure an npm registry or publish', () => {
      const { build } = getJobSections(readWorkflow());
      assert.doesNotMatch(build, /registry-url:/);
      assert.doesNotMatch(build, /npm publish/);
    });
  });

  describe('publish-npm job', () => {
    test('depends on the build job completing first', () => {
      const { publishNpm } = getJobSections(readWorkflow());
      assert.match(publishNpm, /needs:\s*build/);
    });

    test('runs on ubuntu-latest', () => {
      const { publishNpm } = getJobSections(readWorkflow());
      assert.match(publishNpm, /runs-on:\s*ubuntu-latest/);
    });

    test('checks out the repo and configures Node.js 20 against the npm registry', () => {
      const { publishNpm } = getJobSections(readWorkflow());
      assert.match(publishNpm, /uses:\s*actions\/checkout@v4/);
      assert.match(publishNpm, /uses:\s*actions\/setup-node@v4/);
      assert.match(publishNpm, /node-version:\s*20/);
      assert.match(publishNpm, /registry-url:\s*https:\/\/registry\.npmjs\.org\//);
    });

    test('runs "npm ci" before "npm publish", in that order', () => {
      const { publishNpm } = getJobSections(readWorkflow());
      const ciIndex = publishNpm.indexOf('run: npm ci');
      const publishIndex = publishNpm.indexOf('run: npm publish');
      assert.notEqual(ciIndex, -1, 'expected "npm ci" step');
      assert.notEqual(publishIndex, -1, 'expected "npm publish" step');
      assert.ok(ciIndex < publishIndex, '"npm ci" must run before "npm publish"');
    });

    test('supplies NODE_AUTH_TOKEN to the publish step from the npm_token secret', () => {
      const { publishNpm } = getJobSections(readWorkflow());
      const publishStepIndex = publishNpm.indexOf('run: npm publish');
      const publishStep = publishNpm.slice(publishStepIndex);
      assert.match(publishStep, /env:\s*\n\s*NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.npm_token\s*\}\}/);
    });
  });

  describe('security', () => {
    test('does not hardcode an npm auth token', () => {
      const content = readWorkflow();
      // The only occurrence of an auth-token-looking value should be the
      // secrets interpolation, never a literal token (e.g. "npm_" prefixed
      // granular tokens or long hex/base64 strings).
      assert.doesNotMatch(content, /NODE_AUTH_TOKEN:\s*['"]?npm_[A-Za-z0-9]+/);
      assert.match(content, /NODE_AUTH_TOKEN:\s*\$\{\{secrets\.npm_token\}\}/);
    });
  });
});