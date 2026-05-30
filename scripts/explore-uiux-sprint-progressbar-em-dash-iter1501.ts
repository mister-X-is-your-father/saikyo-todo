/**
 * Phase 6.15 loop iter1501: sprints-panel Sprint progressbar aria-label を em-dash 統一
 * (regression guard、iter761 の paren format からの migration)。
 *
 * 経緯: 同 progressbar の aria-valuetext (line 593) は `${done}/${total} (${pct}%) — ${tone}`
 * で em-dash 区切、iter1494 で goals-panel Goal 全体進捗 aria-label も em-dash 化済。
 * 一方 sprints-panel の aria-label は iter761 で動的化された時の paren convention の
 * まま `Sprint「${name}」完了率 ${pct}% (${done}/${total} 件、${tone})` で残存していた。
 * 同一 progressbar 内 aria-label と aria-valuetext が divergent な punctuation 体系 = SR
 * 出力 mental model が混在。
 *
 * 修正 (sprints-panel.tsx):
 *   aria-label を `... ${pct}% (${done}/${total} 件、${tone})`
 *           → `... ${pct}% — ${done}/${total} 件、${tone}` に変換
 *
 * 連動更新 (scripts/explore-uiux-sprint-progressbar-pct-iter761.ts):
 *   Sprint progressbar regex を ':' / '()' → ' — ' に migration
 *   (検証目的 = 動的 pct/done/total/tone content 存在 guard で punctuation は invariant ではない)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-progressbar-em-dash-iter1501.ts
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
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 1. em-dash 新形式
  const expected =
    'aria-label={`Sprint「${sprint.name}」完了率 ${pct}% — ${done}/${total} 件、${sprintProgressToneLabel(tone)}`}'
  if (!src.includes(expected)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint progressbar aria-label が em-dash 形式でない',
    })
  }

  // 2. 旧 () 形式残存
  const old =
    'aria-label={`Sprint「${sprint.name}」完了率 ${pct}% (${done}/${total} 件、${sprintProgressToneLabel(tone)})`}'
  if (src.includes(old)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint progressbar 旧 () 区切 aria-label が残存',
    })
  }

  // 3. aria-valuetext 既存 em-dash 維持 (regression invariant)
  if (
    !src.includes(
      'aria-valuetext={`${done}/${total} (${pct}%) — ${sprintProgressToneLabel(tone)}`}',
    )
  ) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'sprint progressbar aria-valuetext em-dash 形式が破壊された',
    })
  }

  // 4. iter1494 invariant: goals-panel Goal 全体進捗 aria-label も em-dash であることを cross-check
  const gpFilePath = resolve(here, '../src/components/workspace/goals-panel.tsx')
  const gp = readFileSync(gpFilePath, 'utf8')
  if (
    !/aria-label=\{`Goal「\$\{goal\.title\}」全体進捗 \$\{goalPct\}%\$\{health \? ` — \$\{health\.label\}` : ''\}`\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'iter1494 invariant: goals-panel Goal 全体進捗 em-dash 形式が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint progressbar aria-label が em-dash convention 統一済 (valuetext + goals-panel と sibling 整合)',
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
