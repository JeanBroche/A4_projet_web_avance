import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { allRouteDefinitions } from '../src/routes/index.js'

const servicesRoot = resolve(import.meta.dirname, '../../../services')
const gatewayServicePath = resolve(import.meta.dirname, '../services/api.service.ts')
const gatewayFacadesRoot = resolve(import.meta.dirname, '../src/facades')
const routesDocPath = resolve(import.meta.dirname, '../ROUTES.md')
const writeDoc = process.argv.includes('--write-doc')

function collectServiceFiles(dir: string): string[] {
  const files: string[] = []
  if (!statSync(dir, { throwIfNoEntry: false })) return files
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue
      files.push(...collectServiceFiles(full))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full)
    }
  }
  return files
}

const serviceFileCache = new Map<string, string[]>()

function getServiceFiles(serviceName: string): string[] {
  if (!serviceFileCache.has(serviceName)) {
    const dir = join(servicesRoot, serviceName)
    serviceFileCache.set(serviceName, collectServiceFiles(dir))
  }
  return serviceFileCache.get(serviceName) ?? []
}

function actionExists(serviceName: string, actionPath: string): boolean {
  const patterns = [`"${actionPath}"`, `'${actionPath}'`]
  if (!actionPath.includes('.')) {
    patterns.push(`${actionPath}:`)
  }
  return getServiceFiles(serviceName).some((file) => {
    const content = readFileSync(file, 'utf8')
    return patterns.some(pattern => content.includes(pattern))
  })
}

function gatewayActionExists(action: string): boolean {
  if (!action.startsWith('api.')) return false
  const actionPath = action.slice(4)
  const patterns = [`"${actionPath}"`, `'${actionPath}'`]
  if (!actionPath.includes('.')) {
    patterns.push(`${actionPath}:`)
  }
  const gatewayFiles = [
    gatewayServicePath,
    ...collectServiceFiles(gatewayFacadesRoot)
  ]
  return gatewayFiles.some((file) => {
    const content = readFileSync(file, 'utf8')
    return patterns.some((pattern) => content.includes(pattern))
  })
}

function generateRoutesDoc(): string {
  const lines = [
    '# Gateway — catalogue REST',
    '',
    'Proxy HTTP vers les actions Moleculer. Auth login/refresh/logout passent par la facade gateway (cookies HttpOnly).',
    '',
    '| HTTP | Chemin | Action MS |',
    '|------|--------|-----------|'
  ]
  for (const route of allRouteDefinitions) {
    lines.push(`| \`${route.method}\` | \`/api/${route.path}\` | \`${route.action}\` |`)
  }
  lines.push(
    '',
    '## RBAC',
    '',
    '- Auth : JWT dans cookies HttpOnly (`aeronexis_access_token`, `aeronexis_refresh_token`) ou header Bearer.',
    '- `audit.change.list` : rôle `admin` uniquement.',
    '- Actions `reporting.calcul.*` : rôle `direction` (ou `admin`).',
    ''
  )
  return `${lines.join('\n')}\n`
}

const missing: string[] = []
for (const route of allRouteDefinitions) {
  const [service, ...rest] = route.action.split('.')
  const actionPath = rest.join('.')
  if (gatewayActionExists(route.action)) continue
  if (!actionExists(service, actionPath)) {
    missing.push(`${route.method} /api/${route.path} -> ${route.action}`)
  }
}

if (missing.length > 0) {
  console.error('Routes pointant vers des actions MS introuvables :')
  for (const line of missing) console.error(`  - ${line}`)
  process.exit(1)
}

console.log(`✓ ${allRouteDefinitions.length} routes REST validées contre services/*`)

if (writeDoc) {
  writeFileSync(routesDocPath, generateRoutesDoc(), 'utf8')
  console.log(`✓ ROUTES.md généré (${routesDocPath})`)
}
