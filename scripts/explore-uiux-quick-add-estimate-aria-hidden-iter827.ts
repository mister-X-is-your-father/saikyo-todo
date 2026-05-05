/**
 * Phase 6.15 loop iter 827 (mode-D Desktop a11y) —
 * quick-add estimate chip 内 visible "{formatEstimate}" を aria-hidden span に統合。
 *
 * 課題: quick-add.tsx 行 218-227 の estimate chip は parent <span> に aria-label
 *   "見積 ${formatEstimate}" が完全 content を含むのに、内側 visible text は
 *   icon のみ aria-hidden で {formatEstimate} は別 text node で重複。iter800-826 sweep の続編。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 内側 emoji + estimate を 1 つの aria-hidden span に統合
 *
 * 検証: source-side regex assert + iter735-826 invariant cross-check。
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
  const hasMergedAriaHidden =
    /<span aria-hidden="true">🕐 \{formatEstimate\(preview\.estimateMinutes\)\}<\/span>/.test(qa)
  if (hasMergedAriaHidden) {
    findings.push({
      level: 'info',
      message: `quick-add estimate chip 内 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add estimate chip aria-hidden 不完全`,
    })
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

  console.log(`\n=== Findings (quick-add-estimate-aria-hidden-iter827) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
