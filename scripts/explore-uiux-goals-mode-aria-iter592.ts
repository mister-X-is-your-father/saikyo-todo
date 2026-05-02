/**
 * Phase 6.15 loop iter 592 (mode-D Desktop a11y) —
 * goals-panel KR 進捗算出モード <select> の aria-label を動的化 + option text を
 * 日本語補助併記で意味明示 (i18n + 動的 aria 5 弾目)。
 *
 * 課題: goals-panel.tsx 行 722-730 の mode <select> は aria-label が
 *   "KR 進捗算出モード" の static で current value を expose せず、option text
 *   は raw English ("items" / "manual") のみで初見ユーザは「items が何を意味する」
 *   が読み取れない。SR ユーザは "items" / "manual" だけを聞き、効果が伝わらない。
 *
 * fix (1 ファイル ~10 行差分):
 *   - aria-label 動的化: `KR 進捗算出モード (現在: ${jpHint})`
 *     - 'items' → '子 Item 完了率で自動算出'
 *     - 'manual' → '目標値 / 単位を手入力'
 *     - 未知 → raw fallback で破綻防止
 *   - option text に JP 補助併記 ('items (子 Item 完了率)' / 'manual (目標値 / 単位)')
 *     value 自体は 'items' / 'manual' のまま (form 値 / DB 後方互換)
 *
 * iter587/588/589/590/591 (動的 aria-label expose / i18n 整合) pattern を
 * goals-panel mode select に水平展開。
 *
 * 検証: source-side regex assert + iter515-591 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. mode 'items' → '子 Item 完了率で自動算出'
  if (/mode === 'items'\s*\n?\s*\?\s*'子 Item 完了率で自動算出'/.test(gp)) {
    findings.push({ level: 'info', message: `mode 'items' → '子 Item 完了率で自動算出' OK` })
  } else {
    findings.push({ level: 'warning', message: `mode 'items' 変換なし` })
  }

  // 2. mode 'manual' → '目標値 / 単位を手入力'
  if (/mode === 'manual'\s*\n?\s*\?\s*'目標値 \/ 単位を手入力'/.test(gp)) {
    findings.push({ level: 'info', message: `mode 'manual' → '目標値 / 単位を手入力' OK` })
  } else {
    findings.push({ level: 'warning', message: `mode 'manual' 変換なし` })
  }

  // 3. aria-label 動的 template literal
  if (/aria-label=\{`KR 進捗算出モード \(現在: \$\{/.test(gp)) {
    findings.push({ level: 'info', message: `aria-label 動的 template literal OK` })
  } else {
    findings.push({ level: 'warning', message: `aria-label 動的化なし` })
  }

  // 4. option text に JP 補助併記
  if (/<option value="items">items \(子 Item 完了率\)<\/option>/.test(gp)) {
    findings.push({ level: 'info', message: `option 'items' に JP 補助併記 OK` })
  } else {
    findings.push({ level: 'warning', message: `option 'items' に JP 補助併記なし` })
  }
  if (/<option value="manual">manual \(目標値 \/ 単位\)<\/option>/.test(gp)) {
    findings.push({ level: 'info', message: `option 'manual' に JP 補助併記 OK` })
  } else {
    findings.push({ level: 'warning', message: `option 'manual' に JP 補助併記なし` })
  }

  // 5. iter591 invariant: gantt zoom aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/aria-label=\{`Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({ level: 'info', message: `iter591 invariant: gantt zoom 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter591 invariant: 破壊` })
  }

  // 6. iter590 invariant: sprint filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/sprintFilter === 'active'\s*\n?\s*\?\s*'稼働中の Sprint'/.test(ib)) {
    findings.push({ level: 'info', message: `iter590 invariant: sprint filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter590 invariant: 破壊` })
  }

  // 7. iter588 invariant: calendar prev button aria-label 維持
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`前日 \(\$\{format\(subDays\(date, 1\), 'M月d日 \(eee\)'\)\}\) を表示`\}/.test(cv)
  ) {
    findings.push({ level: 'info', message: `iter588 invariant: calendar prev 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter588 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goals-mode-aria-iter592) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
