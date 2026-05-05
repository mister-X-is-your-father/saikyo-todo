/**
 * Phase 6.15 loop iter 829 (mode-D Desktop a11y) —
 * archived-items-panel restore button visible text を aria-hidden span に wrap。
 *
 * 課題: archived-items-panel.tsx 行 171 の Restore button visible text "復元" /
 *   "復元中…" は parent Button に aria-label が完全 content を含むのに aria-hidden
 *   無しで重複可能性。iter800-828 sweep の続編。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-828 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  const hasAriaHidden =
    /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : '復元'\}<\/span>/.test(aip)
  if (hasAriaHidden) {
    findings.push({
      level: 'info',
      message: `archive Restore button visible text aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `archive Restore button aria-hidden 不完全`,
    })
  }

  // iter828 invariant: sprint-card 期間進捗 row group + 内側 aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」期間進捗 経過/.test(sp) &&
    /<span aria-hidden="true">残 \{remainingDays\} 日<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter828 invariant: sprint-card 期間進捗 row aria 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter828 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt time semantic
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt time semantic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
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

  console.log(`\n=== Findings (archive-restore-aria-hidden-iter829) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
