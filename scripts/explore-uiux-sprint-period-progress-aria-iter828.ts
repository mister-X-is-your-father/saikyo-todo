/**
 * Phase 6.15 loop iter 828 (mode-D Desktop a11y) —
 * sprint-card 期間進捗 (経過 / 残) row に role="group" + aria-label 集約 + 内側 aria-hidden。
 *
 * 課題: sprints-panel.tsx 行 568-574 の active sprint の 期間進捗 row は plain visible
 *   text "経過 N / M 日 (P%)" + "残 N 日" のみで Sprint context (どの sprint の進捗か)
 *   や aria-label 集約が無く、SR ユーザは sprint 名と紐付けられなかった。iter763-826
 *   sweep の page-specific naming + aria-hidden span pattern を Sprint 期間進捗 row に展開。
 *
 * fix (1 ファイル ~6 行差分):
 *   - row div に role="group" + aria-label="Sprint「${sprint.name}」期間進捗 ..." 追加
 *   - 内側 visible 2 span に aria-hidden="true" 追加 (重複防止)
 *
 * 検証: source-side regex assert + iter735-827 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const hasGroupAriaLabel =
    /aria-label=\{`Sprint「\$\{sprint\.name\}」期間進捗 経過 \$\{elapsedDays\} \/ \$\{totalDays\} 日 \(\$\{elapsedPct\}%\)、残 \$\{remainingDays\} 日`\}/.test(
      sp,
    )
  const hasInnerHidden =
    /<span aria-hidden="true">\s*\n?\s*経過 \{elapsedDays\}/.test(sp) &&
    /<span aria-hidden="true">残 \{remainingDays\} 日<\/span>/.test(sp)
  if (hasGroupAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `sprint-card 期間進捗 row group + 内側 aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-card 期間進捗 row 不完全 (group=${hasGroupAriaLabel} hidden=${hasInnerHidden})`,
    })
  }

  // iter827 invariant: quick-add estimate aria-hidden merge
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">🕐 \{formatEstimate\(preview\.estimateMinutes\)\}<\/span>/.test(qa)
  ) {
    findings.push({
      level: 'info',
      message: `iter827 invariant: quick-add estimate aria-hidden merge 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter827 invariant: 破壊` })
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

  // iter819 invariant: sprint progress visible % chip aria-hidden
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

  console.log(`\n=== Findings (sprint-period-progress-aria-iter828) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
