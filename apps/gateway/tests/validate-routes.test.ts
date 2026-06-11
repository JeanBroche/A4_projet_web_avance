import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { allRouteDefinitions } from '../src/routes/index.js'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const servicesRoot = resolve(import.meta.dirname, '../../../services')

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

function actionExists(serviceName: string, actionPath: string): boolean {
  const patterns = [`"${actionPath}"`, `'${actionPath}'`]
  if (!actionPath.includes('.')) {
    patterns.push(`${actionPath}:`)
  }
  return collectServiceFiles(join(servicesRoot, serviceName)).some((file) => {
    const content = readFileSync(file, 'utf8')
    return patterns.some(pattern => content.includes(pattern))
  })
}

describe('validate-routes', () => {
  it('every REST alias points to an existing MS action', () => {
    const missing: string[] = []
    for (const route of allRouteDefinitions) {
      const [service, ...rest] = route.action.split('.')
      const actionPath = rest.join('.')
      if (!actionExists(service, actionPath)) {
        missing.push(`${route.method} /api/${route.path} -> ${route.action}`)
      }
    }
    assert.equal(missing.length, 0, `Missing actions:\n${missing.join('\n')}`)
  })
})
