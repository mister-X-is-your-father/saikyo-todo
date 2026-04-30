/**
 * Phase 6.15 loop iter 512 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * ErrorState 再試行 Button + SubtasksPanel bulk add Button を 44x44 化、codify。
 *
 * 課題: 残 2 件の `size="sm"` Button が `className="min-h-11"` 漏れ:
 *   - async-states.tsx 行 96-103: ErrorState の 再試行 button (= 各 view で error 時に 1 件出る、
 *     全 view の retry trigger を担う共通 component)
 *   - subtasks-panel.tsx 行 551-568: 子タスク bulk add button (改行区切り入力で複数 task 一括作成)
 *
 *   両方とも user が tap 必要な action button、mobile 32px は誤タップしやすい。
 *
 * fix (2 ファイル ~2 行追加):
 *   - 各 Button に `className="min-h-11"` 挿入
 *
 * 累計 **136 button mobile target 達成** (iter460-512 で 53 fix iter、+2 件)。
 * 機能不変、shadcn 編集なし、aria-label / aria-busy / data-testid 維持。
 *
 * 検証: source-side regex assert 2 file。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. async-states.tsx ErrorState retry button
  const asPath = 'src/components/shared/async-states.tsx'
  const asSrc = readFileSync(resolve(process.cwd(), asPath), 'utf8')
  if (
    /<Button\s+variant="outline"\s+size="sm"\s+className="min-h-11"\s+onClick=\{onRetry\}/.test(
      asSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${asPath}: ErrorState retry Button min-h-11 配線 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${asPath}: ErrorState retry Button min-h-11 配線 不在`,
    })
  }

  // 2. async-states.tsx aria-label 維持 (regression)
  if (/aria-label=\{`「\$\{message\}」をクリアして再試行`\}/.test(asSrc)) {
    findings.push({ level: 'info', message: `${asPath}: aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${asPath}: aria-label 破壊` })
  }

  // 3. subtasks-panel.tsx bulk add Button
  const spPath = 'src/components/workspace/subtasks-panel.tsx'
  const spSrc = readFileSync(resolve(process.cwd(), spPath), 'utf8')
  if (
    /<Button\s+type="button"\s+size="sm"\s+className="min-h-11"\s+disabled=\{!bulkText\.trim\(\) \|\| create\.isPending\}/.test(
      spSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${spPath}: bulk add Button min-h-11 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${spPath}: bulk add Button min-h-11 配線 不在` })
  }

  // 4. subtasks-panel data-testid + aria-keyshortcuts + aria-label 維持
  if (
    /data-testid="subtasks-bulk-add-btn"/.test(spSrc) &&
    /aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(spSrc) &&
    /子タスク \$\{pendingTitleCount\} 件をまとめて追加/.test(spSrc)
  ) {
    findings.push({
      level: 'info',
      message: `${spPath}: data-testid + aria-keyshortcuts + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${spPath}: data-testid / aria-keyshortcuts / aria-label 破壊`,
    })
  }

  // 5. iter508 invariant: SubtasksPanel 3 inline button pseudo 維持 (cross-check)
  if (/before:absolute before:-inset-3/.test(spSrc)) {
    findings.push({
      level: 'info',
      message: `${spPath}: iter508 invariant (SubtasksPanel pseudo tap target) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${spPath}: iter508 invariant 破壊` })
  }

  console.log(`\n=== Findings (error-retry-bulk-add-min-h-iter512) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
