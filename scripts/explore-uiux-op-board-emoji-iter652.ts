/**
 * Phase 6.15 loop iter 652 (mode-D Desktop a11y) —
 * operation-board-widget Quick wins / 集中ブロック 見出し emoji
 * (⚡ / 🎯) を aria-hidden 化 (SR が "high voltage" / "direct hit" 読み上げ抑止)。
 *
 * 課題: operation-board-widget.tsx 行 158-160 と 182-184 の h3 見出しは
 *   `⚡ Quick wins (N)` / `🎯 集中ブロック (N)` を生 string で出力していた。
 *   この h3 は同 widget 内の `<ul aria-labelledby="...">` に参照されているため、
 *   list の accessible name に SR が emoji を「high voltage 」「direct hit 」
 *   として読み込み、context noise になっていた。
 *
 * fix (1 ファイル ~4 行差分、2 h3):
 *   - `⚡` → `<span aria-hidden="true">⚡ </span>` で wrap
 *   - `🎯` → `<span aria-hidden="true">🎯 </span>` で wrap
 *
 * iter178 (item-edit-dialog 🧠/🛠) と同パターンを Today empty-state の
 * OperationBoardWidget forecast 4-axis 内 chip 見出しに展開。
 *
 * 検証: source-side regex assert + iter515-651 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // 1. ⚡ Quick wins 見出しの emoji が aria-hidden で wrap されている
  if (/<span aria-hidden="true">⚡ <\/span>Quick wins/.test(ob)) {
    findings.push({ level: 'info', message: `quick-wins emoji aria-hidden OK` })
  } else {
    findings.push({ level: 'warning', message: `quick-wins emoji aria-hidden なし` })
  }

  // 2. 🎯 集中ブロック 見出しの emoji が aria-hidden で wrap されている
  if (/<span aria-hidden="true">🎯 <\/span>集中ブロック/.test(ob)) {
    findings.push({ level: 'info', message: `focus-blocks emoji aria-hidden OK` })
  } else {
    findings.push({ level: 'warning', message: `focus-blocks emoji aria-hidden なし` })
  }

  // 3. 生 emoji 残存検査 (false negative 検出: aria-hidden を貫通して SR 読み上げ対象になる ⚡ / 🎯 が
  //    h3 直下に残っていないか) — line-anchor で ⚡/🎯 の直前が aria-hidden 以外
  const rawEmojiInH3 = /\n\s*⚡ Quick wins/.test(ob) || /\n\s*🎯 集中ブロック/.test(ob)
  if (rawEmojiInH3) {
    findings.push({ level: 'warning', message: `生 emoji が h3 直下に残存` })
  } else {
    findings.push({ level: 'info', message: `生 emoji 残存なし OK` })
  }

  // 4. iter651 invariant: subtasks-bulk 通常 hint 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /:\s*`子タスクを改行区切りで bulk 追加 \(現在 \$\{pendingTitleCount\} 件、Cmd\/Ctrl\+Enter で追加\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter651 invariant: subtasks-bulk 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter651 invariant: 破壊` })
  }

  // 5. iter650 invariant: tag-picker 維持
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (/checked\s*\n?\s*\?\s*`タグ「\$\{t\.name\}」を付与中 \(クリックで解除\)`/.test(tp)) {
    findings.push({ level: 'info', message: `iter650 invariant: tag-picker 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter650 invariant: 破壊` })
  }

  // 6. iter178 invariant: item-edit-dialog 🧠 emoji aria-hidden 維持 (同パターン source)
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">🧠 <\/span>AI で分解/.test(ied)) {
    findings.push({ level: 'info', message: `iter178 invariant: 🧠 emoji 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter178 invariant: 破壊` })
  }

  console.log(`\n=== Findings (op-board-emoji-iter652) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
