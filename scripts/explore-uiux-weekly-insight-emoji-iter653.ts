/**
 * Phase 6.15 loop iter 653 (mode-D Desktop a11y) —
 * weekly-insight-widget best-day / worst-day chip 内 emoji
 * (⭐ / 😴 / ⚠) を aria-hidden 化 (SR が "white medium star" /
 * "sleeping face" / "warning sign" 読み上げ抑止)。
 *
 * 課題: weekly-insight-widget.tsx 行 134-152 の bestDay / worstDay chip span は
 *   independent な span (parent Card の aria-label で全体は covered だが、
 *   chip 単体に navigate された時 SR は内部 text content を読む) で、
 *   `⭐ {bestDayLabel}` / `{worstDay.current === 0 ? '😴' : '⚠'} {formatWorstDayJa(worstDay)}`
 *   を生 string で出力。SR は emoji の名称まで読み上げ、context noise になる。
 *
 * fix (1 ファイル ~6 行差分、2 chip):
 *   - `⭐` → `<span aria-hidden="true">⭐ </span>` で wrap
 *   - `{worstDay.current === 0 ? '😴' : '⚠'}` → `<span aria-hidden="true">…</span>` で wrap
 *
 * iter178 (item-edit-dialog 🧠/🛠) / iter652 (op-board ⚡/🎯) と同パターンを
 * weekly-insight 2 chip に展開。
 *
 * 検証: source-side regex assert + iter515-652 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wi = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )

  // 1. ⭐ best-day chip emoji が aria-hidden で wrap されている
  if (/<span aria-hidden="true">⭐ <\/span>/.test(wi)) {
    findings.push({ level: 'info', message: `best-day ⭐ emoji aria-hidden OK` })
  } else {
    findings.push({ level: 'warning', message: `best-day ⭐ emoji aria-hidden なし` })
  }

  // 2. 😴 / ⚠ worst-day chip emoji が aria-hidden で wrap されている
  if (/<span aria-hidden="true">\{worstDay\.current === 0 \? '😴' : '⚠'\} <\/span>/.test(wi)) {
    findings.push({ level: 'info', message: `worst-day 😴/⚠ emoji aria-hidden OK` })
  } else {
    findings.push({ level: 'warning', message: `worst-day 😴/⚠ emoji aria-hidden なし` })
  }

  // 3. 生 emoji 残存検査 (best-day / worst-day chip 内に aria-hidden 外の生 ⭐/😴/⚠ がない)
  const rawBest = /\n\s*⭐ \{bestDayLabel\}/.test(wi)
  const rawWorst = /\n\s*\{worstDay\.current === 0 \? '😴' : '⚠'\} \{formatWorstDayJa/.test(wi)
  if (rawBest || rawWorst) {
    findings.push({ level: 'warning', message: `生 emoji が chip 直下に残存` })
  } else {
    findings.push({ level: 'info', message: `生 emoji 残存なし OK` })
  }

  // 4. iter652 invariant: op-board Quick wins 維持
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⚡ <\/span>Quick wins/.test(ob)) {
    findings.push({ level: 'info', message: `iter652 invariant: op-board Quick wins 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter652 invariant: 破壊` })
  }

  // 5. iter651 invariant: subtasks-bulk 通常 hint 維持
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

  // 6. iter178 invariant: item-edit-dialog 🧠 emoji aria-hidden 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">🧠 <\/span>AI で分解/.test(ied)) {
    findings.push({ level: 'info', message: `iter178 invariant: 🧠 emoji 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter178 invariant: 破壊` })
  }

  console.log(`\n=== Findings (weekly-insight-emoji-iter653) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
