/**
 * Phase 6.15 loop iter 886 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * WorkflowRunHistory の rerun button visible 「再」 を aria-hidden span に統合。
 *
 * 課題: src/components/workflow/workflows-panel.tsx line 809 rerun button は
 *   icon (Play) + visible "再" を出していたが、aria-label "実行 ${id} を再実行中… / 同じ input で再実行"
 *   完全 content 包含 → SR 再 announce、Workflow run rerun 操作 path 頻繁。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">再</span> で wrap
 *
 * 検証: source-side regex assert + iter885/884/883/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `WorkflowRunHistory rerun 「再」 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `WorkflowRunHistory rerun 「再」 未統合` })
  }

  // iter885 invariant
  const lp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">サインアップ<\/span>/.test(lp)) {
    findings.push({
      level: 'info',
      message: `iter885 invariant: login page CardFooter サインアップ 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter885 invariant: 破壊` })
  }

  // iter884 invariant
  const rp = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(rp)) {
    findings.push({
      level: 'info',
      message: `iter884 invariant: root page ログアウト 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter884 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workflow-run-history-rerun-aria-hidden-iter886) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
