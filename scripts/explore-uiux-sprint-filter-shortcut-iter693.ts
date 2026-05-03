/**
 * Phase 6.15 loop iter 693 (mode-D Desktop a11y) —
 * items-board sprint filter select の 「ショートカット」 optgroup 追加
 * (iter692 の follow-up、filter shortcut を意味的にグループ化)。
 *
 * 課題: iter692 で個別 sprint を `<optgroup label="個別 Sprint">` で wrap したが、
 *   filter shortcut (「稼働中の Sprint」「未割当のみ」) は group なしで残されていた。
 *   先頭の 「全 Sprint」 (= unset) → ショートカット 2 件 → 個別 sprint group の構造を
 *   明確化することで SR / 視覚で「3 種類の選択がある」 と理解しやすい。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 「稼働中の Sprint」「未割当のみ」 を `<optgroup label="ショートカット">` で wrap
 *   - 「全 Sprint」 (default) は optgroup の外に置いて empty 状態の意味を保持
 *
 * 検証: source-side regex assert + iter515-692 invariant cross-check。
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

  // 1. ショートカット optgroup
  if (
    /<optgroup label="ショートカット">\s*\n\s*<option value="active">稼働中の Sprint<\/option>\s*\n\s*<option value="none">未割当のみ<\/option>\s*\n\s*<\/optgroup>/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `ショートカット optgroup OK` })
  } else {
    findings.push({ level: 'warning', message: `ショートカット optgroup なし` })
  }

  // 2. iter692 invariant: 個別 Sprint optgroup 維持
  if (
    /\(sprintsList\.data \?\? \[\]\)\.length > 0 && \(\s*\n\s*<optgroup label="個別 Sprint">/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `iter692 invariant: 個別 Sprint optgroup 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter692 invariant: 破壊` })
  }

  // 3. 「全 Sprint」 default option 既存維持 (optgroup の外)
  if (/<option value="">全 Sprint<\/option>\s*\n\s*<optgroup label="ショートカット">/.test(ib)) {
    findings.push({ level: 'info', message: `「全 Sprint」 default option 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `「全 Sprint」 default option 破壊` })
  }

  // 4. iter691 invariant: board-empty-quick-add aria-keyshortcuts 維持
  if (
    /data-testid="board-empty-quick-add"\s*\n\s*aria-keyshortcuts="q"\s*\n\s*aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `iter691 invariant: board-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter691 invariant: 破壊` })
  }

  // 5. iter688 invariant: 日次 aria 維持
  if (/aria-label="日次レビュー画面 \(個人 期間 = 今日\)"/.test(ib)) {
    findings.push({ level: 'info', message: `iter688 invariant: 日次 aria 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter688 invariant: 破壊` })
  }

  // 6. iter662 invariant: filter group 維持
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-filter-shortcut-iter693) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
