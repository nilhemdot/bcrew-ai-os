import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeFoundationDb, getDocSourceSnapshot, getFoundationSnapshot, initFoundationDb } from './lib/foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = process.env.PORT || 3000

const docsDir = path.join(__dirname, 'docs')
const businessStrategyPath = path.join(docsDir, 'business-strategy.md')
const sourceRegistryPath = path.join(docsDir, 'source-registry.md')
const strategyDocs = [
  path.join(docsDir, 'strategy', 'bhag-model.md'),
  path.join(docsDir, 'strategy', 'agent-engine.md'),
  path.join(docsDir, 'strategy', 'financial-model-and-assumptions.md'),
  path.join(docsDir, 'strategy', 'quarterly-priorities.md'),
  path.join(docsDir, 'strategy', 'strategic-issues.md'),
  path.join(docsDir, 'strategy', 'governance.md'),
  path.join(docsDir, 'strategy', 'department-mandates.md'),
  path.join(docsDir, 'strategy', 'core-values.md'),
  path.join(docsDir, 'strategy', 'marketmasters.md'),
]

app.use(express.static(path.join(__dirname, 'public')))

function isAllowedDocPath(filePath) {
  const normalizedDocsDir = path.resolve(docsDir) + path.sep
  const normalizedFilePath = path.resolve(filePath)
  return normalizedFilePath.startsWith(normalizedDocsDir) && normalizedFilePath.endsWith('.md')
}

function resolveRequestedDoc(requestedPath) {
  if (typeof requestedPath !== 'string' || !requestedPath.trim()) return null
  const resolvedPath = path.resolve(__dirname, requestedPath)
  return isAllowedDocPath(resolvedPath) ? resolvedPath : null
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function getDocMeta(filePath) {
  try {
    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    return {
      exists: true,
      path: path.relative(__dirname, filePath),
      lines: content.split('\n').length,
      updatedAt: stat.mtime.toISOString(),
      daysOld: Math.floor((Date.now() - stat.mtimeMs) / 86400000),
    }
  } catch {
    return {
      exists: false,
      path: path.relative(__dirname, filePath),
      lines: 0,
      updatedAt: null,
      daysOld: null,
    }
  }
}

function parseSections(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const sections = []
  let current = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.slice(3).trim(), body: [] }
      continue
    }

    if (current) current.body.push(line)
  }

  if (current) sections.push(current)

  return sections
    .map(section => ({
      title: section.title,
      content: section.body.join('\n').trim(),
    }))
    .filter(section => section.content)
}

function getSupportingStrategyDocs() {
  return strategyDocs.map(filePath => {
    const meta = getDocMeta(filePath)
    const content = readFileSafe(filePath)
    return {
      meta,
      sections: parseSections(content),
    }
  })
}

function getDocTitle(markdown, filePath) {
  if (markdown) {
    const lines = markdown.split('\n')
    const heading = lines.find(line => line.startsWith('# '))
    if (heading) return heading.slice(2).trim()
  }

  return path.basename(filePath, '.md')
}

app.get('/api/source-of-truth', (_req, res) => {
  const businessStrategy = readFileSafe(businessStrategyPath)
  const sourceRegistry = readFileSafe(sourceRegistryPath)

  res.json({
    title: 'BCrew AI OS',
    foundation: {
      businessStrategy: {
        meta: getDocMeta(businessStrategyPath),
        sections: parseSections(businessStrategy),
      },
      sourceRegistry: {
        meta: getDocMeta(sourceRegistryPath),
        sections: parseSections(sourceRegistry),
      },
      supportingStrategy: getSupportingStrategyDocs(),
    },
    systemStatus: [
      {
        key: 'strategy-doc',
        label: 'Business Strategy',
        status: businessStrategy ? 'connected' : 'missing',
        detail: businessStrategy
          ? 'Primary strategy source is in the repo and rendered in the dashboard.'
          : 'Missing docs/business-strategy.md.',
      },
      {
        key: 'source-registry',
        label: 'Source Registry',
        status: sourceRegistry ? 'connected' : 'pending',
        detail: sourceRegistry
          ? 'The registry exists and can be expanded with real connectors.'
          : 'Create the registry next so every business input has an owner and status.',
      },
      {
        key: 'supporting-strategy',
        label: 'Supporting Strategy',
        status: getSupportingStrategyDocs().every(doc => doc.meta.exists) ? 'connected' : 'pending',
        detail: 'BHAG model, Agent Engine, and department mandates are split into maintainable supporting docs.',
      },
      {
        key: 'decision-log',
        label: 'Decision Log',
        status: 'pending',
        detail: 'Not wired yet. Strategic decisions should become explicit records, not chat residue.',
      },
      {
        key: 'intel-engine',
        label: 'Strategic Intelligence Engine',
        status: 'pending',
        detail: 'Not wired yet. This layer will compare reality against strategy and detect drift.',
      },
    ],
  })
})

app.get('/api/foundation-hub', async (_req, res) => {
  try {
    const snapshot = await getFoundationSnapshot()
    res.json(snapshot)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load foundation hub data.',
    })
  }
})

app.get('/api/doc', (req, res) => {
  const filePath = resolveRequestedDoc(req.query.path)

  if (!filePath) {
    res.status(400).json({ error: 'Invalid doc path.' })
    return
  }

  const content = readFileSafe(filePath)

  if (!content) {
    res.status(404).json({ error: 'Document not found.' })
    return
  }

  Promise.resolve(getDocSourceSnapshot(path.relative(__dirname, filePath)))
    .then(sourceSnapshot => {
      res.json({
        title: getDocTitle(content, filePath),
        meta: getDocMeta(filePath),
        content,
        sourceSnapshot,
      })
    })
    .catch(error => {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load document source snapshot.',
      })
    })
})

app.get('/doc', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'doc.html'))
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

async function start() {
  await initFoundationDb()

  const server = app.listen(port, () => {
    console.log(`BCrew AI OS dashboard listening on http://localhost:${port}`)
  })

  const shutdown = async () => {
    server.close(async () => {
      await closeFoundationDb()
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch(error => {
  console.error('Failed to start BCrew AI OS dashboard:', error)
  process.exit(1)
})
