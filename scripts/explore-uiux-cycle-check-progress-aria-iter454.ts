/**
 * Phase 6.15 loop iter 454 (mode-D Desktop a11y) — CycleCheckStatsCard の
 * 完了率 progress bar に severity 文字情報を追加 (iter424 SprintRetroWidget
 * pattern 水平展開)、codify。
 *
 * 課題: src/components/pdca/cycle-check-stats-card.tsx の進捗 bar:
 *   ```tsx
 *   <div role="progressbar"
 *        aria-valuenow={rate}
 *        aria-label={`完了率 ${rate}%`}>
 *     <div className={sevBarCls} />
 *   </div>
 *   ```
 *   SR は「完了率 75%」と数値だけで severity (順調 / 良好 / 注意 / 要対策) が
 *   fill 色のみで伝わる → WCAG 1.4.1 違反。iter424 SprintRetroWidget と同問題。
 *
 * fix: 1 ファイル ~10 行差分。
 *   - severityLabelJa(sev) helper 追加 (4 段階日本語ラベル)
 *   - progressbar に `aria-valuetext` で「{rate}% ({sevLabel})」を追加
 *   - aria-label を簡潔化 ("完了率") して valuetext と役割分担
 *
 * 機能追加なし、視覚 layout / 色 / 数値表示 全て不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter424 invariant consistency。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/pdca/cycle-check-stats-card.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. severityLabelJa 4 ラベル
  for (const label of ['順調', '良好', '注意', '要対策']) {
    if (src.includes(`return '${label}'`) || src.includes(`'${label}'`)) {
      findings.push({ level: 'info', message: `${path}: severityLabelJa "${label}" OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: severityLabelJa "${label}" 不在` })
    }
  }

  // 2. aria-valuetext 配線
  if (
    /aria-valuetext=\{`\$\{stats\.completionRate\}% \(\$\{severityLabelJa\(sev\)\}\)`\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: aria-valuetext 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: aria-valuetext 配線 不在` })
  }

  // 3. aria-label 簡潔化
  if (/aria-label="完了率"/.test(src) && !/aria-label=\{`完了率 /.test(src)) {
    findings.push({ level: 'info', message: `${path}: aria-label 簡潔化 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: aria-label 簡潔化 不在` })
  }

  // 4. iter424 invariant consistency (helper 名は iter435+ で
  //    completionRateSeverityLabelJa に rename されている可能性を許容)
  const retroSrc = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (
    /aria-valuetext=\{`\$\{summary\.completionRate\}% \(\$\{(severityLabelJa|completionRateSeverityLabelJa)\(sev\)\}\)`\}/.test(
      retroSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro-widget: iter424 aria-valuetext invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro-widget: iter424 aria-valuetext 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (cycle-check-progress-aria-iter454) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
