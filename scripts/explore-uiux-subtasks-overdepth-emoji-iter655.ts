/**
 * Phase 6.15 loop iter 655 (mode-D Desktop a11y) —
 * subtasks-panel overDepth 通知 ⚠ emoji を aria-hidden 化
 * (SR が "warning sign" 重複読み上げ抑止)。
 *
 * 課題: subtasks-panel.tsx 行 284-288 の overDepth 子タスク省略 hint は
 *   `<p role="status" aria-live="polite">` で SR が読み上げるが、text 内に
 *   生 `⚠` が入っていたため「warning sign 深さ N を超える子タスクは省略」と
 *   SR が emoji 名と本文を重複読み上げ。⚠ symbol は aria-live=polite で既に
 *   notification として認識されており decorative。
 *
 * fix (1 ファイル ~3 行差分):
 *   - `⚠` → `<span aria-hidden="true">⚠ </span>` で wrap
 *   - 1 行 → 2 行に折返し (prettier 整形)
 *
 * iter178 / iter652 / iter653 / iter654 と同パターンを subtasks-panel overDepth
 * 通知に展開。
 *
 * 検証: source-side regex assert + iter515-654 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // 1. ⚠ overDepth emoji が aria-hidden で wrap されている
  if (
    /<span aria-hidden="true">⚠ <\/span>深さ \{MAX_TREE_DEPTH\} を超える子タスクは省略/.test(sp)
  ) {
    findings.push({ level: 'info', message: `subtasks overDepth ⚠ aria-hidden OK` })
  } else {
    findings.push({ level: 'warning', message: `subtasks overDepth ⚠ aria-hidden なし` })
  }

  // 2. 生 emoji 残存検査
  if (/\n\s*⚠ 深さ \{MAX_TREE_DEPTH\}/.test(sp)) {
    findings.push({ level: 'warning', message: `生 ⚠ が overDepth 直下に残存` })
  } else {
    findings.push({ level: 'info', message: `生 ⚠ 残存なし OK` })
  }

  // 3. iter654 invariant: quick-add must-warn ⚠ 維持
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span aria-hidden="true">⚠ <\/span>編集ダイアログで DoD を入れてください/.test(qa)) {
    findings.push({ level: 'info', message: `iter654 invariant: quick-add must-warn ⚠ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter654 invariant: 破壊` })
  }

  // 4. iter653 invariant: weekly-insight ⭐ 維持
  const wi = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⭐ <\/span>/.test(wi)) {
    findings.push({ level: 'info', message: `iter653 invariant: weekly-insight ⭐ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter653 invariant: 破壊` })
  }

  // 5. iter652 invariant: op-board Quick wins 維持
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⚡ <\/span>Quick wins/.test(ob)) {
    findings.push({ level: 'info', message: `iter652 invariant: op-board Quick wins 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter652 invariant: 破壊` })
  }

  // 6. iter651 invariant: subtasks-bulk 通常 hint 維持 (subtasks-panel 同 file)
  if (
    /:\s*`子タスクを改行区切りで bulk 追加 \(現在 \$\{pendingTitleCount\} 件、Cmd\/Ctrl\+Enter で追加\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter651 invariant: subtasks-bulk 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter651 invariant: 破壊` })
  }

  console.log(`\n=== Findings (subtasks-overdepth-emoji-iter655) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
