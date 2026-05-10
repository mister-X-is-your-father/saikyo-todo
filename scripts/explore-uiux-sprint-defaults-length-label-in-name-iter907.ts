/**
 * Phase 6.15 loop iter 907 (mode-D Desktop a11y) —
 * sprints-panel sprint-defaults-length input aria-label を WCAG 2.5.3 (Label in
 * Name) 適合形に変更。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-defaults-length input は
 *   visible <Label> "期間 (日)" だが、旧 aria-label "Sprint 期間 (日数、...)" は
 *   "(日数" で 「(日)」 と末尾形が異なり substring 不適合 (visible の `)` が aria-label
 *   の `数` に置換) → WCAG 2.5.3 違反 (2 case)。
 *
 * fix (1 ファイル / +2-2 行差分、2 case 一括):
 *   - aria-label normal: `期間 (日): Sprint デフォルト期間の日数、1-90、現在 ${length} 日`
 *   - aria-label invalid: `期間 (日): Sprint デフォルト期間の日数、有効範囲は 1-90、現在値 ${length} は範囲外`
 *
 * 検証: source-side regex assert + iter905/906 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. normal aria-label に "期間 (日)" prefix
  if (/`期間 \(日\): Sprint デフォルト期間の日数、1-90、現在 \$\{length\} 日`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-defaults-length normal aria-label に "期間 (日)" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults-length normal aria-label が "期間 (日)" prefix 不含`,
    })
  }

  // 2. invalid aria-label に "期間 (日)" prefix
  if (
    /`期間 \(日\): Sprint デフォルト期間の日数、有効範囲は 1-90、現在値 \$\{length\} は範囲外`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-defaults-length invalid aria-label に "期間 (日)" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults-length invalid aria-label が "期間 (日)" prefix 不含`,
    })
  }

  // 3. 旧 aria-label "Sprint 期間 (日数、" 削除
  if (!/`Sprint 期間 \(日数、1-90、現在: \$\{length\} 日\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-defaults-length 旧 aria-label "(日数、" 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-defaults-length 旧 aria-label 残存` })
  }

  // iter906 invariant: wf-desc aria-label
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/'説明 \(任意、Cmd\/Ctrl\+Enter で作成\): Workflow の説明、最大 2000 文字'/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter906 invariant: wf-desc aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter906 invariant: wf-desc 破壊` })
  }

  console.log(`\n=== Findings (sprint-defaults-length-label-in-name-iter907) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
