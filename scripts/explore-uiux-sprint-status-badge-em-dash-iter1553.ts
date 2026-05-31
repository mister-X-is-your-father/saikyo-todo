/**
 * Phase 6.15 loop iter1553: sprints-panel sprint-status Badge aria-label を em-dash 形式に
 * migration (iter1093-1552 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"Sprint「${sprint.name}」のステータス: ${sprintStatusLabelJa(status)}"` は visible
 * "${sprintStatusLabelJa(status)}" (e.g., "進行中") を末尾に持ち voice control prefix-matching
 *「click 進行中」が strict prefix-match で不可 (substring 一致のみ)。iter1093-1552 sweep convention で
 * visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (sprints-panel.tsx):
 *   `Sprint「${sprint.name}」のステータス: ${sprintStatusLabelJa(status)}`
 *   → `${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-status-badge-em-dash-iter1553.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')

  if (
    !src.includes(
      'aria-label={`${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-status Badge aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (
    src.includes(
      'aria-label={`Sprint「${sprint.name}」のステータス: ${sprintStatusLabelJa(status)}`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-status Badge 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-status Badge aria-label が em-dash 形式 (visible 冒頭固定)')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
