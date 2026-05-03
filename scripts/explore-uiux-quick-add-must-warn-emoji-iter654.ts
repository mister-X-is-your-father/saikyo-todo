/**
 * Phase 6.15 loop iter 654 (mode-D Desktop a11y) —
 * quick-add MUST DoD warning chip 内 ⚠ emoji を aria-hidden 化
 * (SR が "warning sign" 読み上げ抑止)。
 *
 * 課題: quick-add.tsx 行 245-251 の MUST 入力時の DoD 抜け warning chip は
 *   `role="alert"` で SR が assertive 読み上げするが、text 内に生 `⚠` が
 *   入っていたため「warning sign 編集ダイアログで DoD を入れてください」と
 *   重複する形で読み上げ。⚠ symbol は role=alert で既に urgency conveyed。
 *
 * fix (1 ファイル ~1 行差分):
 *   - `⚠` → `<span aria-hidden="true">⚠ </span>` で wrap
 *
 * iter178 / iter652 / iter653 と同パターンを quick-add MUST warning に展開。
 * item-edit-dialog.tsx 行 291-293 (externallyChanged warning) と同パターン。
 *
 * 検証: source-side regex assert + iter515-653 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. ⚠ MUST warning emoji が aria-hidden で wrap されている
  if (/<span aria-hidden="true">⚠ <\/span>編集ダイアログで DoD を入れてください/.test(qa)) {
    findings.push({ level: 'info', message: `quick-add must-warn ⚠ aria-hidden OK` })
  } else {
    findings.push({ level: 'warning', message: `quick-add must-warn ⚠ aria-hidden なし` })
  }

  // 2. 生 emoji 残存検査
  if (/\n\s*⚠ 編集ダイアログで DoD を入れてください/.test(qa)) {
    findings.push({ level: 'warning', message: `生 ⚠ が must-warn 直下に残存` })
  } else {
    findings.push({ level: 'info', message: `生 ⚠ 残存なし OK` })
  }

  // 3. iter653 invariant: weekly-insight ⭐ best-day 維持
  const wi = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⭐ <\/span>/.test(wi)) {
    findings.push({ level: 'info', message: `iter653 invariant: weekly-insight ⭐ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter653 invariant: 破壊` })
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

  // 5. iter178 invariant: item-edit-dialog 🧠 emoji 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">🧠 <\/span>AI で分解/.test(ied)) {
    findings.push({ level: 'info', message: `iter178 invariant: 🧠 emoji 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter178 invariant: 破壊` })
  }

  // 6. quick-add 既存 🧠 emoji aria-hidden 維持 (iter178 同パターン)
  if (/<span aria-hidden="true">🧠 <\/span>AI 分解/.test(qa)) {
    findings.push({ level: 'info', message: `quick-add 🧠 emoji 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `quick-add 🧠 emoji 破壊` })
  }

  console.log(`\n=== Findings (quick-add-must-warn-emoji-iter654) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
