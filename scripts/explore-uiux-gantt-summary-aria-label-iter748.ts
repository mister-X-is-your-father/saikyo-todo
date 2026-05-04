/**
 * Phase 6.15 loop iter 748 (mode-D Desktop a11y) —
 * gantt-view summary banner の critical-path / slip span に aria-label を追加。
 * これまで title 属性 (mouse hover 専用) のみ持っていた説明を SR にも届ける。
 *
 * 課題: gantt-view.tsx 行 320-343 の summary banner 内 critical-path span と slip span
 *   は title 属性で説明 (「project 全体期間に直接影響」 等) を持つが、これは mouse hover
 *   時にしか表示されない。SR ユーザは visible text 「critical path N 件」「遅延 N 件 / 計 M 日」
 *   だけしか聞こえず、各 metric の意味が分からない。non-interactive span でも aria-label
 *   を付ければ visible text を上書きして説明を含めた完全な announcement にできる。
 *
 * fix (1 ファイル ~2 行差分):
 *   - critical span に `aria-label="critical path ${count} 件 (...説明...)"` を追加
 *   - slip span に `aria-label="遅延 ${count} 件 (...説明...)、計 ${days} 日"` を追加
 *
 * 検証: source-side regex assert + iter735-747 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. critical span に aria-label
  const criticalAria =
    /aria-label=\{`critical path \$\{criticalCount\} 件 \(project 全体期間に直接影響、遅延すると全体遅延\)`\}/.test(
      gv,
    )
  if (criticalAria) {
    findings.push({ level: 'info', message: `gantt critical-path span aria-label 追加 OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt critical-path span aria-label 追加 不完全` })
  }

  // 2. slip span に aria-label
  const slipAria =
    /aria-label=\{`遅延 \$\{slipItemCount\} 件 \(baseline より遅れている item\)、計 \$\{totalSlipDays\} 日`\}/.test(
      gv,
    )
  if (slipAria) {
    findings.push({ level: 'info', message: `gantt slip span aria-label 追加 OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt slip span aria-label 追加 不完全` })
  }

  // iter747 invariant: subtasks-panel bulk textarea
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  const spMatches = sp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (spMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter747 invariant: subtasks-panel aria-keyshortcuts 維持 OK (${spMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter747 invariant: 破壊` })
  }

  // iter746 invariant: schedule-item-picker
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/aria-keyshortcuts="Escape"/.test(sip)) {
    findings.push({
      level: 'info',
      message: `iter746 invariant: schedule-item-picker aria-keyshortcuts="Escape" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter746 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (gantt-summary-aria-label-iter748) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
