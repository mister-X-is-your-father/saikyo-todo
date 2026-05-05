/**
 * Phase 6.15 loop iter 826 (mode-D Desktop a11y) —
 * backlog-view updatedAt cell を <time dateTime> + aria-label 化 (HTML5 semantic +
 * SR で「最終更新」 context 提供)。
 *
 * 課題: backlog-view.tsx 行 150-155 の updatedAt cell は plain string ('2026-04-30 12:34:56')
 *   を return するだけで <time> element も aria-label も無し。SR ユーザは生 ISO 風
 *   文字列を聞いても「最終更新」という意味が分からなかった。同 file の dueDate cell
 *   (行 136-144) は <time dateTime> + aria-label の HTML5 semantic を採用しているのと
 *   非対称。
 *
 * fix (1 ファイル ~6 行差分):
 *   - cell return を <time dateTime={iso} aria-label="最終更新 ${display}"> でラップ
 *
 * 検証: source-side regex assert + iter735-825 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  const hasUpdatedAtTime = /<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(
    bv,
  )
  if (hasUpdatedAtTime) {
    findings.push({
      level: 'info',
      message: `backlog-view updatedAt cell <time dateTime> + aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view updatedAt cell semantic 不完全`,
    })
  }

  // iter825 invariant: today-view dueTime aria-label
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (/aria-label=\{`期限時刻 \$\{it\.dueTime\.slice\(0, 5\)\}`\}/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter825 invariant: today-view dueTime aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter825 invariant: 破壊` })
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

  console.log(`\n=== Findings (backlog-updated-at-time-iter826) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
