/**
 * Phase 6.15 loop iter 904 (mode-D Desktop a11y) —
 * quick-add の preview chip 3 種 (priority p{n} / tags #{tag} / assignees @{user}) に
 * aria-hidden="true" 追加、parent div aria-label "解析結果: ${previewSummary}" 単独経路に統一。
 *
 * 経緯: iter903 quick-add preview title + scheduledFor の続編。残 3 chip も
 *   parent aria-label に内容含まれるが visible aria-hidden 無し → 重複読み上げ。
 *
 * 修正: 3 chip span に aria-hidden="true" 追加 (priority / tags / assignees 各々)。
 *
 * 検証: source-side regex assert + iter735/843/849-903 invariant cross-check。
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

  // 1. priority chip aria-hidden
  if (
    /<span\s+className=\{`rounded px-1\.5 py-0\.5 \$\{PRIO_COLOR\[preview\.priority\]\}`\}\s+aria-hidden="true"\s*>\s*p\{preview\.priority\}/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add preview priority chip aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add preview priority chip aria-hidden 未統合`,
    })
  }

  // 2. tags map chip aria-hidden
  if (
    /<span\s+key=\{t\}\s+className="rounded bg-indigo-100 px-1\.5 py-0\.5 text-indigo-700"\s+aria-hidden="true"\s*>\s*#\{t\}/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add preview tags chip aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add preview tags chip aria-hidden 未統合`,
    })
  }

  // 3. assignees map chip aria-hidden
  if (
    /<span\s+key=\{a\}\s+className="rounded bg-emerald-100 px-1\.5 py-0\.5 text-emerald-700"\s+aria-hidden="true"\s*>\s*@\{a\}/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add preview assignees chip aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add preview assignees chip aria-hidden 未統合`,
    })
  }

  // iter903 invariant: title + scheduledFor aria-hidden
  if (
    /<span className="truncate font-mono" aria-hidden="true">/.test(qa) &&
    /<time[\s\S]+?>\s*<span aria-hidden="true">\s*\{formatFriendlyDate\(preview\.scheduledFor, new Date\(\)\)\}/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter903 invariant: quick-add title + time aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter903 invariant: 破壊` })
  }

  // iter893 invariant
  if (
    /<span aria-hidden="true">→ \{formatEstimate\(calibrated\.calibratedMinutes\)\}<\/span>/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter893 invariant: quick-add calibrated chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter893 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (quick-add-preview-chips-aria-hidden-iter904) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
