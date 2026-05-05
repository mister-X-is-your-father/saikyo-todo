/**
 * Phase 6.15 loop iter 825 (mode-D Desktop a11y) —
 * today-view dueTime span に aria-label を追加して SR で「期限時刻」 context を提供。
 *
 * 課題: today-view.tsx 行 227 の dueTime span は visible "{HH:MM}" のみで context 無し。
 *   SR ユーザは「14:30」 と聞いても「期限時刻なのか?」 が分からなかった。
 *   今 daily / sprint period などは aria-label 付きなのに dueTime は欠落。
 *
 * fix (1 ファイル ~6 行差分):
 *   - dueTime span に aria-label="期限時刻 HH:MM" 追加
 *   - 内側 visible text を aria-hidden span に wrap (重複防止)
 *
 * 検証: source-side regex assert + iter735-824 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const hasDueTimeAriaLabel = /aria-label=\{`期限時刻 \$\{it\.dueTime\.slice\(0, 5\)\}`\}/.test(tv)
  if (hasDueTimeAriaLabel) {
    findings.push({
      level: 'info',
      message: `today-view dueTime span aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view dueTime span aria-label 不完全`,
    })
  }

  // iter824 invariant: active-timer-panel chip aria-hidden
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">見積 \{estimateMinutes\}分<\/span>/.test(atp) &&
    /<span aria-hidden="true">→ \{calibrated\.calibratedMinutes\}分<\/span>/.test(atp)
  ) {
    findings.push({
      level: 'info',
      message: `iter824 invariant: active-timer-panel chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter824 invariant: 破壊` })
  }

  // iter823 invariant: sprint-retro 完了率 % aria-hidden
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (/<span className="text-2xl font-semibold tabular-nums" aria-hidden="true">/.test(srw)) {
    findings.push({
      level: 'info',
      message: `iter823 invariant: sprint-retro 完了率 % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter823 invariant: 破壊` })
  }

  // iter819 invariant: sprint progress visible % chip aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /\}`\}\s*\n?\s*aria-hidden="true"\s*\n?\s*>\s*\n?\s*\{done\} \/ \{total\} \(\{pct\}%\)/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter819 invariant: sprint progress visible % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter819 invariant: 破壊` })
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

  console.log(`\n=== Findings (today-due-time-aria-label-iter825) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
