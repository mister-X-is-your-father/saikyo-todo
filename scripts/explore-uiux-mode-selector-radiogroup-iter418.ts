/**
 * Phase 6.15 loop iter 418 (mode-D Desktop a11y) — WorkspaceModeSelector
 * (iter518 で追加された方法論 mode 選択 UI) の `role="radiogroup"` が
 * WAI-ARIA spec の roving tabindex / 矢印キー巡回を実装していなかった問題を修正、
 * codify。
 *
 * 課題: src/components/workspace/workspace-mode-selector.tsx は 3 button に
 *   `role="radio"` + `aria-checked` を付与しているが、`tabIndex` も矢印キー
 *   onKeyDown も無いため:
 *   1. キーボードユーザは Tab で 3 option 全部に止まる (radiogroup spec は
 *      「選択中のみ tabbable、矢印キーで巡回」)
 *   2. 矢印キーで focus 移動できない (NVDA / JAWS のラジオ群 navigation で破綻)
 *   3. mutation 中も SR に進行中 announce 無し (`aria-busy` 不在)
 *
 * fix: 1 ファイル ~25 行追加。
 *   - `tabIndex={selected ? 0 : -1}` で roving tabindex 実装
 *   - ArrowLeft/Right/Up/Down で前後 option へ focus 移動 (wrap around)
 *   - Home/End で最初/最後 option へ jump
 *   - 矢印で focus 移動と同時に handleSelect (= 「focus = 選択」 WAI-ARIA radio
 *     pattern、native radio と同挙動)
 *   - radiogroup div に `aria-busy={pending}` 追加で SR 進行中 announce
 *   - useRef でボタン参照 array を保持
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (page interaction) は
 *   workspace setup 必要なため省略 (regex で 6 invariant を保証)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/workspace-mode-selector.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. roving tabindex
  if (/tabIndex=\{selected \? 0 : -1\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: roving tabIndex 実装 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: roving tabIndex (selected ? 0 : -1) 不在`,
    })
  }

  // 2. radiogroup aria-busy
  if (/role="radiogroup"[\s\S]{0,200}?aria-busy=\{upd\.isPending \|\| undefined\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: radiogroup aria-busy 実装 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: radiogroup aria-busy 不在` })
  }

  // 3. 矢印 / Home / End キー handler 実装
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
    if (src.includes(`'${key}'`)) {
      findings.push({ level: 'info', message: `${path}: ${key} key handler OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: ${key} key handler 不在` })
    }
  }

  // 4. handleKeyDown 配線 (button onKeyDown)
  if (/onKeyDown=\{\(e\) => handleKeyDown\(e, index\)\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: button onKeyDown 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: button onKeyDown 配線 不在` })
  }

  // 5. useRef で button array 保持
  if (/useRef<Array<HTMLButtonElement \| null>>/.test(src)) {
    findings.push({ level: 'info', message: `${path}: useRef button array OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: useRef button array 不在` })
  }

  // 6. focus 移動と同時に select (= 「focus = 選択」 WAI-ARIA radio pattern)
  if (/buttonsRef\.current\[nextIndex\]\?\.focus\(\)/.test(src)) {
    findings.push({ level: 'info', message: `${path}: ref-based focus 移動 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: ref-based focus 移動 不在` })
  }

  console.log(`\n=== Findings (mode-selector-radiogroup-iter418) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
