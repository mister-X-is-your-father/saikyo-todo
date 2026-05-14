/**
 * Phase 6.15 loop iter862 — schedule-item-picker.tsx の 2 button visible text
 * (割込みとして追加 / キャンセル) を aria-hidden span で wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-schedule-item-picker-aria-hidden-iter862.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/schedule/schedule-item-picker.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (!/<span aria-hidden="true">割込みとして追加<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '割込みとして追加 button visible wrap が無い' })
  }
  if (
    !/aria-label="task pick をキャンセル"[\s\S]{0,80}<span aria-hidden="true">キャンセル<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'キャンセル button visible wrap が無い' })
  }
  // data-testid 健在
  for (const tid of ['schedule-picker-interrupt-add', 'schedule-picker-cancel']) {
    if (!src.includes(`data-testid="${tid}"`)) {
      findings.push({ level: 'error', message: `data-testid="${tid}" 健在性 NG` })
    }
  }
  // raw 残置なし
  if (src.split('\n').some((l) => /^\s*(割込みとして追加|キャンセル)\s*$/.test(l))) {
    findings.push({ level: 'error', message: 'raw 単独行が残存' })
  }

  console.log(`\n=== Findings (schedule-item-picker-aria-hidden iter862) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
