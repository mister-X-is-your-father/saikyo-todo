/**
 * Phase 6.15 loop iter1502: sprint-retro-widget progressbar aria-label / aria-valuetext を
 * em-dash 統一 (regression guard、iter759 paren format からの migration)。
 *
 * iter759 で sprint-retro progressbar に動的 aria-label / aria-valuetext を追加した時の
 * paren convention `(${severityLabel})` がそのまま残存していた。iter1494 goals-panel /
 * iter1501 副 sprint-card progressbar の em-dash 統一からこぼれていた。
 *
 * 修正 (sprint-retro-widget.tsx):
 *   aria-label:     `... ${pct}% (${sev})` → `... ${pct}% — ${sev}`
 *   aria-valuetext: `${pct}% (${sev})`     → `${pct}% — ${sev}`
 *
 * 両 attribute を同 commit で migration、aria-label と aria-valuetext で punctuation 体系
 * 一致 (sibling Sprint / Goal progressbar とも整合)。
 *
 * 連動更新 (scripts/explore-uiux-sprint-progressbar-pct-iter761.ts):
 *   iter759 invariant regex を em-dash に migration
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-retro-progressbar-em-dash-iter1502.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/sprint/sprint-retro-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. aria-label 新形式
  if (
    !src.includes(
      'aria-label={`Sprint Retro 完了率 ${summary.completionRate}% — ${completionRateSeverityLabelJa(sev)}`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro progressbar aria-label が em-dash 形式でない',
    })
  }
  // 1b. 旧 () 残存
  if (
    src.includes(
      'aria-label={`Sprint Retro 完了率 ${summary.completionRate}% (${completionRateSeverityLabelJa(sev)})`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro progressbar 旧 () 区切 aria-label が残存',
    })
  }

  // 2. aria-valuetext 新形式
  if (
    !src.includes(
      'aria-valuetext={`${summary.completionRate}% — ${completionRateSeverityLabelJa(sev)}`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro progressbar aria-valuetext が em-dash 形式でない',
    })
  }
  // 2b. 旧 () 残存
  if (
    src.includes(
      'aria-valuetext={`${summary.completionRate}% (${completionRateSeverityLabelJa(sev)})`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro progressbar 旧 () 区切 aria-valuetext が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-retro progressbar aria-label + aria-valuetext が em-dash convention 統一済',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
