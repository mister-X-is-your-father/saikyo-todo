/**
 * Phase 6.15 loop iter1200: sprints-panel sprint-defaults-length Input aria-label
 * visible-prefix regression guard。
 *
 * iter1200 で発見した visible-prefix 漏れ (sprint-defaults-dow iter1194 と同 sweep):
 * sprints-panel.tsx `sprint-defaults-length` Input の旧 aria-label
 * `Sprint 期間 (日数、1-90、現在: ${length} 日)` は visible Label "期間 (日)" を
 * 中位置 "Sprint **期間** (...)" に持ち voice control prefix-matching「click 期間」
 * match 不可 (substring 一致のみ)。範囲外 path も同じ問題 ("Sprint 期間 (日数) の...")。
 *
 * 修正 (sprints-panel.tsx):
 * `期間 (日) — Sprint 期間 (日数、1-90、現在: ${length} 日)` で先頭固定 (両 path)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-defaults-length-visible-prefix-iter1200.ts
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

  // 新 prefix 形式 (両 path) が存在すること
  if (
    !src.includes('`期間 (日) — Sprint 期間 (日数) の有効範囲は 1-90、現在値 ${length} は範囲外`')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'sprint-defaults-length aria-label 範囲外 path が visible-prefix 形式 "期間 (日) — Sprint 期間..." でない',
    })
  }
  if (!src.includes('`期間 (日) — Sprint 期間 (日数、1-90、現在: ${length} 日)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'sprint-defaults-length aria-label 正常 path が visible-prefix 形式 "期間 (日) — Sprint 期間..." でない',
    })
  }
  // 旧 prefix-less 形式が残存していないこと (active code only check で コメント除外)
  const lines = src.split('\n')
  const activeCode = lines.filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l)).join('\n')
  if (activeCode.includes('`Sprint 期間 (日数) の有効範囲は 1-90、現在値 ${length} は範囲外`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Sprint 期間 (日数) の有効範囲は..." が active code に残存',
    })
  }
  if (activeCode.includes('`Sprint 期間 (日数、1-90、現在: ${length} 日)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Sprint 期間 (日数、1-90、現在: ...)" が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-defaults-length aria-label は visible 冒頭固定済')
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
