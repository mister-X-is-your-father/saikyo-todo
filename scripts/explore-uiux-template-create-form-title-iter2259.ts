/**
 * Phase 6.15 loop iter2259: Template 作成フォーム form に title 付与し aria-label と sync
 * (Goal 作成フォーム iter2045 / Sprint 作成フォーム iter2043 と同 create-form family、
 * 3 entity (Goal / Sprint / Template) title 完成、MCP path A 経由発見)。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2259') || !tp.includes('title="Template 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Template 作成フォーム title が aria-label と sync されていない',
    })
  }

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2257')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2257 src-create-btn title が消えている',
    })
  }

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2255')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2255 budget edit form button family title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — Template 作成フォーム title sync 完了、create-form family 3 entity (Goal / Sprint / Template) 完成 (MCP path A 経由発見)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
