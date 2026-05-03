/**
 * Phase 6.15 loop iter 666 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure empty 状態 `<p>` に role="status" + aria-live="polite"
 * を付与 (SR で「割当 item なし」が active 通知される)。
 *
 * 課題: sprint-swimlane-disclosure.tsx 行 132 の empty state `<p>` は
 *   visible text のみで role / aria-live が無い。iter161 / iter177 で確立した
 *   「empty state は role="status" + aria-live="polite"」 pattern が
 *   このコンポーネントだけ適用漏れだった。SR ユーザは Sprint disclosure を開いても
 *   empty 状態が active に通知されず、視覚 only 認識になる。
 *
 * fix (1 ファイル ~5 行差分):
 *   - `<p>` に `role="status"` + `aria-live="polite"`
 *   - prettier 整形で多行化
 *
 * 検証: source-side regex assert + iter515-665 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )

  // 1. empty state に role="status" + aria-live
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="sprint-swimlane-empty"/.test(ssd)
  ) {
    findings.push({ level: 'info', message: `swimlane-empty role=status + aria-live OK` })
  } else {
    findings.push({ level: 'warning', message: `swimlane-empty role=status + aria-live なし` })
  }

  // 2. data-testid 維持 (= 既存 test の anchor が破壊されてない)
  if (/data-testid="sprint-swimlane-empty"/.test(ssd)) {
    findings.push({ level: 'info', message: `data-testid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `data-testid 破壊` })
  }

  // 3. iter665 invariant: tab-comments aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/aria-label="コメントタブ — 議論履歴 \+ @メンション \+ AI Plan 投下"/.test(ied)) {
    findings.push({ level: 'info', message: `iter665 invariant: tab-comments 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter665 invariant: 破壊` })
  }

  // 4. iter664 invariant: tab-base aria-label 維持
  if (
    /aria-label="基本タブ — タイトル \/ 状態 \/ 期限 \/ MUST \/ 担当 \/ Tag \/ DoD を編集"/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter664 invariant: tab-base 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter664 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 6. iter659 invariant: async-states Loader2 motion-safe 維持
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/Loader2 className="h-5 w-5 motion-safe:animate-spin"/.test(as)) {
    findings.push({ level: 'info', message: `iter659 invariant: async-states 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter659 invariant: 破壊` })
  }

  console.log(`\n=== Findings (swimlane-empty-status-iter666) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
