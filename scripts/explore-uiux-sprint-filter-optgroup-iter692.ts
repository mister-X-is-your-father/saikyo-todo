/**
 * Phase 6.15 loop iter 692 (mode-D Desktop a11y) —
 * items-board sprint filter `<select>` で個別 sprint を `<optgroup label="個別 Sprint">` で
 * 分類 (filter shortcut と個別 sprint を視覚 / SR に明確に区別)。
 *
 * 課題: items-board.tsx 行 358-365 の sprint filter select は filter shortcut
 *   (「全 Sprint」「稼働中の Sprint」「未割当のみ」) と個別 sprint name が同列で混在。
 *   sprint が増えると filter shortcut が埋もれて視認性 + SR 操作性が低下。
 *   `<optgroup>` で個別 sprint を分類すると SR が「グループ 個別 Sprint」と区切りを
 *   announce、視覚も indented で見分けやすい。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 個別 sprint 出力を `<optgroup label="個別 Sprint">` で wrap
 *   - sprintsList.data が空時は optgroup ごと省略 (既存挙動と同じ視覚)
 *
 * 検証: source-side regex assert + iter515-691 invariant cross-check。
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

  // 1. optgroup で個別 sprint を分類
  if (
    /\(sprintsList\.data \?\? \[\]\)\.length > 0 && \(\s*\n\s*<optgroup label="個別 Sprint">/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `sprint filter optgroup OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint filter optgroup なし` })
  }

  // 2. filter shortcut option 既存維持
  if (
    /<option value="">全 Sprint<\/option>\s*\n\s*<option value="active">稼働中の Sprint<\/option>\s*\n\s*<option value="none">未割当のみ<\/option>/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `filter shortcut option 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `filter shortcut option 破壊` })
  }

  // 3. iter691 invariant: board-empty-quick-add aria-keyshortcuts 維持
  if (
    /data-testid="board-empty-quick-add"\s*\n\s*aria-keyshortcuts="q"\s*\n\s*aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `iter691 invariant: board-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter691 invariant: 破壊` })
  }

  // 4. iter688 invariant: 日次 aria 維持
  if (/aria-label="日次レビュー画面 \(個人 期間 = 今日\)"/.test(ib)) {
    findings.push({ level: 'info', message: `iter688 invariant: 日次 aria 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter688 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  // 6. iter690 invariant: kanban empty 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className="text-muted-foreground rounded border border-dashed px-2 py-4 text-center text-xs"\s*\n\s*role="status"\s*\n\s*aria-live="polite"/.test(
      kv,
    )
  ) {
    findings.push({ level: 'info', message: `iter690 invariant: kanban empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter690 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-filter-optgroup-iter692) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
