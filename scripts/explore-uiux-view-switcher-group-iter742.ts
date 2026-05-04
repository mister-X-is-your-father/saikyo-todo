/**
 * Phase 6.15 loop iter 742 (mode-D Desktop a11y) —
 * items-board view-switcher group の静的 aria-label に現在 view 名を含めて拡張
 * (iter734 workspace-mode-selector と同 pattern を view-switcher にも適用)。
 *
 * 課題: items-board.tsx 行 205 の `<div role="group" aria-label="表示切替">` は静的で
 *   現在何の view が active か group focus 時に分からない。各 button に aria-pressed
 *   が付いているが、group 全体に focus が当たった時 (= 個別 button nav 開始前) の
 *   context が薄い。iter734 で workspace-mode radiogroup を同 pattern で拡張済。
 *
 * fix (1 ファイル ~15 行差分):
 *   - VIEW_LABEL_JA: Record<ViewKey, string> map を追加 (today=Today / daily=日次レビュー
 *     等、9 view 対応)
 *   - aria-label を `表示切替 (現在: ${VIEW_LABEL_JA[view] ?? view})` に動的化
 *
 * 検証: source-side regex assert + iter727-741 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. VIEW_LABEL_JA map 追加
  const hasMap = /const VIEW_LABEL_JA: Record<ViewKey, string> = \{/.test(ib)
  // 2. view-switcher group aria-label が動的
  const hasDynamicLabel =
    /aria-label=\{`表示切替 \(現在: \$\{VIEW_LABEL_JA\[view\] \?\? view\}\)`\}/.test(ib)
  // 3. iter742 説明 comment 存在
  const hasComment = /iter742: view-switcher group の aria-label に「現在: \.\.\.」/.test(ib)

  if (hasMap && hasDynamicLabel && hasComment) {
    findings.push({ level: 'info', message: `view-switcher group 動的 aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `view-switcher group 動的 aria-label 不完全 (map=${hasMap} label=${hasDynamicLabel} comment=${hasComment})`,
    })
  }

  // 4. iter741 race invariant: login password-hint 維持
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (
    /<p id="login-password-hint" className="text-muted-foreground text-xs">\s*\n\s*サインアップ時に設定したパスワード/.test(
      lf,
    )
  ) {
    findings.push({ level: 'info', message: `iter741 race invariant: login password-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter741 race invariant: 破壊` })
  }

  // 5. iter740 race invariant: mock-submit description-hint 維持
  const ms = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (
    /<p id="tsDescription-hint" className="text-muted-foreground text-xs">\s*\n\s*自由記述、最大 2000 文字/.test(
      ms,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter740 race invariant: mock-submit description-hint 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter740 race invariant: 破壊` })
  }

  // 6. iter734 invariant: workspace-mode radiogroup 維持 (同 pattern の前例)
  const ws = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`workspace の default 作業モード \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      ws,
    )
  ) {
    findings.push({ level: 'info', message: `iter734 invariant: mode-selector radiogroup 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter734 invariant: 破壊` })
  }

  // 7. iter727 invariant: operation-board ItemList ariaLabel 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  console.log(`\n=== Findings (view-switcher-group-iter742) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
