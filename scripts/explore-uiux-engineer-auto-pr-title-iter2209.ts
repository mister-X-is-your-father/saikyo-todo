/**
 * Phase 6.15 loop iter2209: engineer-auto-pr checkbox に title 付与し aria-label と sync
 * (engineer-trigger-group iter2207 と pair の engineer family title 同期)。
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

  const et = readFileSync(
    resolve(here, '../src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    !et.includes('iter2209') ||
    !et.includes("'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される — クリックで OFF'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'engineer-auto-pr checkbox title が aria-label と sync されていない',
    })
  }
  if (!et.includes('iter2207')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2207 engineer-trigger group title 同期 が消えている',
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
    console.log('(なし) — engineer-auto-pr checkbox title 同期、iter2207-1843 invariant 不変')
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
