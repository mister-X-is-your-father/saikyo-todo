/**
 * Phase 6.15 loop iter 551 (mode-D Desktop a11y) —
 * WorkspaceModeSelector mode option radio button に aria-busy を補完。
 *
 * 課題: workspace-mode-selector.tsx 行 120-144 の mode option button (3 個: none /
 *   taskchute / gtd) は disabled={upd.isPending} で pending 時の入力を block するが
 *   aria-busy 不在。SR は disabled (= 禁止) と pending (= 処理中) を区別不能。
 *   radiogroup の親には aria-busy={upd.isPending || undefined} が既設だが、
 *   各 radio button 単体にも明記することで roving tabindex focus 中の SR feedback が安定。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-busy={upd.isPending || undefined}
 *
 * iter521-549 form/Button aria-busy sweep を mode-selector に展開。
 * 機能不変、視覚 layout 不変、shadcn 編集なし、role="radio" / aria-checked /
 * aria-label / tabIndex / disabled / data-testid invariant 維持。
 *
 * 検証: source-side regex assert + iter515-550 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )

  // 1. mode option button aria-busy
  if (/disabled=\{upd\.isPending\}\s+aria-busy=\{upd\.isPending \|\| undefined\}/.test(wms)) {
    findings.push({
      level: 'info',
      message: `workspace-mode-selector.tsx: mode option button aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode-selector.tsx: mode option button aria-busy 不在`,
    })
  }

  // 2. radiogroup container aria-busy 維持
  if (/role="radiogroup"[\s\S]*?aria-busy=\{upd\.isPending \|\| undefined\}/.test(wms)) {
    findings.push({
      level: 'info',
      message: `workspace-mode-selector.tsx: radiogroup container aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode-selector.tsx: radiogroup container aria-busy 破壊`,
    })
  }

  // 3. role="radio" + aria-checked 維持
  if (/role="radio"\s+aria-checked=\{selected\}/.test(wms)) {
    findings.push({
      level: 'info',
      message: `workspace-mode-selector.tsx: role="radio" + aria-checked 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode-selector.tsx: role / aria-checked 破壊`,
    })
  }

  // 4. iter550 invariant: schedule-picker-interrupt-add aria 維持
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    /data-testid="schedule-picker-interrupt-add"/.test(sip) &&
    /aria-label=\{`割込み \/ 休憩として追加/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter550 invariant: schedule-picker-interrupt-add aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter550 invariant: 破壊`,
    })
  }

  // 5. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (mode-selector-aria-busy-iter551) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
