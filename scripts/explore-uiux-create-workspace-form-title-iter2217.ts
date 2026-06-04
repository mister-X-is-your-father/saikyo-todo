/**
 * Phase 6.15 loop iter2217: create-workspace-form に title 付与し aria-label と sync
 * (workspace-mode-radiogroup iter2215 / item-decompose-btn iter2213 と同 title=aria-label sync pattern)。
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

  const cwf = readFileSync(
    resolve(here, '../src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (!cwf.includes('iter2217') || !cwf.includes('title="Workspace 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'create-workspace-form title が aria-label と sync されていない',
    })
  }

  const wm = readFileSync(
    resolve(here, '../src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (!wm.includes('iter2215')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2215 workspace-mode radiogroup title 同期 が消えている',
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
    console.log('(なし) — create-workspace-form title 同期、iter2215-1843 invariant 不変')
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
