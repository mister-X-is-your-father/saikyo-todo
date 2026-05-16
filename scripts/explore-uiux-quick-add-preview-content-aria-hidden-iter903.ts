/**
 * Phase 6.15 loop iter 903 (mode-D Desktop a11y) —
 * quick-add の preview row 内 visible "→ {title}" + scheduledFor <time> を
 * aria-hidden span で wrap、parent div aria-label "解析結果: ${previewSummary}"
 * 単独経路に統一。
 *
 * 経緯: iter893 quick-add calibrated chip + iter897-900 <time> sweep の続編。
 *   quick-add の preview parent div に aria-live="polite" + aria-label があるため
 *   SR は変更時 aria-label を読むが、内側 visible (title / scheduledFor 表示) も
 *   focus/scan 時に読まれる重複。
 *
 * 修正:
 *   1. "→ {preview.title}" span に aria-hidden 追加
 *   2. <time> scheduledFor 内 visible 全体を <span aria-hidden> で wrap
 *
 * 検証: source-side regex assert + iter735/843/849-902 invariant cross-check。
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

  // 1. "→ {preview.title}" span aria-hidden
  if (
    /<span className="truncate font-mono" aria-hidden="true">\s*→ \{preview\.title\}\s*<\/span>/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add preview title span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add preview title span aria-hidden 未統合`,
    })
  }

  // 2. <time> scheduledFor 内 visible aria-hidden span
  if (
    /<time[\s\S]+?dateTime=\{preview\.scheduledFor\}[\s\S]+?aria-label=\{`予定[\s\S]+?>\s*<span aria-hidden="true">\s*\{formatFriendlyDate\(preview\.scheduledFor, new Date\(\)\)\}/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add preview scheduledFor <time> 内 visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add preview scheduledFor <time> 内 visible aria-hidden 未統合`,
    })
  }

  // 3. parent aria-label 維持
  if (/aria-label=\{`解析結果: \$\{previewSummary\}`\}/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add preview parent aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add preview parent aria-label 破壊`,
    })
  }

  // iter893 invariant: calibrated chip aria-hidden
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

  // iter883 invariant: quick-add input h-11
  if (/className="h-11 flex-1"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: quick-add input h-11 flex-1 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: 破壊` })
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

  console.log(`\n=== Findings (quick-add-preview-content-aria-hidden-iter903) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
