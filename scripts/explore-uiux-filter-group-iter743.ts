/**
 * Phase 6.15 loop iter 743 (mode-D Desktop a11y) —
 * items-board の Item 絞り込み group 静的 aria-label に現在 active な filter の summary を
 * 含めて拡張 (iter742 view-switcher と同 pattern を filter group に展開)。
 *
 * 課題: items-board.tsx 行 317 の `<div role="group" aria-label="Item の絞り込み
 *   (MUST / ステータス / Sprint)">` は静的で「現在何の filter が active か」 が group
 *   focus 時に分からない。各 filter (checkbox / select) の aria-label には個別 state が
 *   反映されているが、group 全体に focus が当たった時の summary がない。
 *
 * fix (1 ファイル ~10 行差分):
 *   - aria-label を `Item の絞り込み (MUST / ステータス / Sprint、現在 ${active.join(' + ') || '絞り込みなし'})` に動的化
 *   - active = MUST / ステータス / Sprint の有無を `[..., ...].filter(Boolean)` で判定
 *
 * 検証: source-side regex assert + iter727-742 invariant cross-check。
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

  // 1. filter group 動的 aria-label (multi-line template literal)
  const hasDynamicLabel =
    /aria-label=\{`Item の絞り込み \(MUST \/ ステータス \/ Sprint、現在 \$\{[\s\S]*?\.filter\(Boolean\)[\s\S]*?\.join\(' \+ '\) \|\| '絞り込みなし'/.test(
      ib,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `filter group 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `filter group 動的 aria-label 欠落` })
  }

  // 2. iter742 race invariant: view-switcher group 維持
  if (/aria-label=\{`表示切替 \(現在: \$\{VIEW_LABEL_JA\[view\] \?\? view\}\)`\}/.test(ib)) {
    findings.push({ level: 'info', message: `iter742 race invariant: view-switcher group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter742 race invariant: 破壊` })
  }

  // 3. iter741 race invariant: login password-hint 維持
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

  // 4. iter734 invariant: workspace-mode radiogroup 維持
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

  // 5. iter727 invariant: operation-board ItemList ariaLabel 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  console.log(`\n=== Findings (filter-group-iter743) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
