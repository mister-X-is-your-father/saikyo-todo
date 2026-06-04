/**
 * Phase 6.15 loop iter2199: FocusFormCta に title 付与し aria-label と sync
 * (StatCard iter2197 / Goal 一覧 iter2195 と同 title=aria-label sync pattern)。
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

  const fc = readFileSync(resolve(here, '../src/components/shared/focus-form-cta.tsx'), 'utf8')
  if (
    !fc.includes('iter2199') ||
    !fc.includes(
      'title={`作成フォームへ — ${entityName} 作成フォームの『${fieldName}』入力欄にフォーカス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'FocusFormCta title が aria-label と sync されていない',
    })
  }

  const dv = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')
  if (!dv.includes('iter2197')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2197 StatCard title 同期 が消えている',
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
    console.log('(なし) — FocusFormCta title 同期、iter2197-1843 invariant 不変')
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
