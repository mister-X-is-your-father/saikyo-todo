/**
 * Phase 6.15 loop iter2369: mock-timesheet tsCategory select に title 付与し
 * aria-label category-dependent IIFE と sync。teCategory iter1191 / src-kind
 * iter2361 / edit-item-sprint iter2287 と同 select title-aria sync pattern を
 * mock-timesheet にも展開、mock UI demo の category 選択 UX 補完。
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

  const mf = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (!mf.includes('iter2369')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form iter2369 marker が無い',
    })
  }
  const expr = (mf.match(/`\$\{visible\} — カテゴリ \(現在: \$\{visible\}\)`/g) || []).length
  if (expr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `mock-tsCategory select expression 出現 ${expr} 回、aria-label + title IIFE 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-timesheet tsCategory select title sync 完了、mock UI demo category 選択 UX 補完',
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
