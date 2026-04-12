import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = process.env.PORT || 3000

const docsDir = path.join(__dirname, 'docs')
const businessStrategyPath = path.join(docsDir, 'business-strategy.md')
const sourceRegistryPath = path.join(docsDir, 'source-registry.md')
const strategyDocs = [
  path.join(docsDir, 'strategy', 'vision-and-north-star.md'),
  path.join(docsDir, 'strategy', 'bhag-model.md'),
  path.join(docsDir, 'strategy', 'agent-engine.md'),
  path.join(docsDir, 'strategy', 'financial-model-and-assumptions.md'),
  path.join(docsDir, 'strategy', 'quarterly-priorities.md'),
  path.join(docsDir, 'strategy', 'strategic-issues.md'),
  path.join(docsDir, 'strategy', 'department-mandates.md'),
  path.join(docsDir, 'strategy', 'marketmasters.md'),
]

app.use(express.static(path.join(__dirname, 'public')))

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

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(port, () => {
  console.log(`BCrew AI OS dashboard listening on http://localhost:${port}`)
})
