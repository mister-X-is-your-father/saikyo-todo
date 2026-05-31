/**
 * Phase 6.15 loop iter1578: sprints-panel sprint operations group aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1577 sweep convention 着地)。
 *
 * 旧 paren convention `"Sprint「${name}」の操作 (現在: ${status}、...)"` を em-dash 区切に統一。
 * iter1573-1577 region/group landmark sweep の sprint operations group 着地。
 *
 * 修正 (sprints-panel.tsx):
 *   "Sprint「${name}」の操作 (現在: ${status}、...)"
 *   → "Sprint「${name}」の操作 — 現在 ${status}、..."
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-operations-group-em-dash-iter1578.ts
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

  if (!src.includes('の操作 — 現在 ${sprintStatusLabelJa(status)}、期間編集')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint operations group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('の操作 (現在: ${sprintStatusLabelJa(status)}、期間編集')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention sprint operations aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint operations group aria-label が em-dash 形式')
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
