/**
 * Phase 6.15 loop iter2221: interrupt note input に title 付与し aria-label と sync
 * (mock-top-nav iter2219 / create-workspace-form iter2217 と同 title=aria-label sync pattern)。
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

  const sp = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    !sp.includes('iter2221') ||
    !sp.includes("'割込み / 休憩のメモ (任意、空欄で「割込み」 fallback)'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'interrupt note input title が aria-label と sync されていない',
    })
  }

  const mt = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!mt.includes('iter2219')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2219 mock-timesheet nav title 同期 が消えている',
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
    console.log('(なし) — interrupt note input title 同期、iter2219-1843 invariant 不変')
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
