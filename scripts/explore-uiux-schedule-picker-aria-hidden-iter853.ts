/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * schedule-item-picker: 3 button visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: src/components/schedule/schedule-item-picker.tsx は schedule view で
 *   actual lane / planned lane に task / 割込み / 休憩 を picker から追加する
 *   modal dialog。3 種 button いずれも aria-label が完全 content を含むのに
 *   visible text は aria-hidden 無し → SR 重複読み上げ:
 *     1. item option button (filtered list、N 件) — visible {it.title}
 *        aria-label `item「${it.title}」を選択${it.isMust ? ' (MUST)' : ''}`
 *     2. 割込みとして追加 button — visible "割込みとして追加"
 *        aria-label `割込み / 休憩として追加${note ? ` (メモ: ${note})` : ''}`
 *     3. キャンセル button — visible "キャンセル"
 *        aria-label="task pick をキャンセル"
 *
 * fix (1 ファイル ~3 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路統一
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし (project-specific)
 *   - iter800-852 sweep の続編 (picker ファミリーに展開)
 *
 * 検証: source-side regex assert + iter735/850/851/852 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // 1. item option button: visible {it.title} を aria-hidden span で wrap
  if (/<span className="truncate" aria-hidden="true">\s*\{it\.title\}\s*<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `item option button visible "{it.title}" aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item option button visible "{it.title}" aria-hidden 未統合`,
    })
  }

  // 2. 割込みとして追加 button: visible を aria-hidden span で wrap
  if (/<span aria-hidden="true">割込みとして追加<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `割込みとして追加 button visible aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `割込みとして追加 button visible aria-hidden 未統合`,
    })
  }

  // 3. キャンセル button: visible を aria-hidden span で wrap
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `キャンセル button visible aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `キャンセル button visible aria-hidden 未統合`,
    })
  }

  // 4. item option aria-label 維持 (MUST 分岐込み)
  if (
    /aria-label=\{`item「\$\{it\.title\}」を選択\$\{it\.isMust \? ' \(MUST\)' : ''\}`\}/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `item option aria-label 維持 (MUST 分岐込み) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item option aria-label 破壊` })
  }

  // 5. 割込み / キャンセル aria-label 維持
  if (
    /aria-label=\{`割込み \/ 休憩として追加\$\{interruptNote \? ` \(メモ: \$\{interruptNote\}\)` : ''\}`\}/.test(
      sip,
    ) &&
    /aria-label="task pick をキャンセル"/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `割込み / キャンセル button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `割込み / キャンセル aria-label 破壊` })
  }

  // 6. data-testid 維持
  if (
    /data-testid="schedule-picker-interrupt-add"/.test(sip) &&
    /data-testid="schedule-picker-cancel"/.test(sip) &&
    /data-testid="schedule-picker-list"/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `schedule-picker data-testid 3 種 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `data-testid 破壊` })
  }

  // 7. dialog 構造 (role=dialog + aria-modal + aria-labelledby) 維持
  if (
    /role="dialog"[\s\S]+?aria-modal="true"[\s\S]+?aria-labelledby="schedule-picker-title"/.test(
      sip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dialog 構造 (role=dialog + aria-modal + aria-labelledby) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `dialog 構造 破壊` })
  }

  // iter852 invariant: assignee-picker + tag-picker option visible aria-hidden
  const apk = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{label\}<\/span>/.test(apk)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: assignee-picker option visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: assignee-picker 破壊` })
  }

  // iter851 invariant: bulk-action-bar status + clear visible aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-action-bar status + clear aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: bulk-action-bar 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (schedule-picker-aria-hidden-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
