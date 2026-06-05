/**
 * Phase 6.15 loop iter2353: sprint-defaults-length input に title 付与し
 * aria-label state-dependent 2-path (invalid / valid) と sync。
 * budget-limit-input iter2333 / budget-warn-input iter2345 と同 input title-aria
 * sync pattern を sprint defaults length にも展開、validation hint 補完。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2353')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints-panel iter2353 marker が無い',
    })
  }
  // valid path aria + title
  const valid = (
    sp.match(/`期間 \(日\) — Sprint 期間 \(日数、1-90、現在: \$\{length\} 日\)`/g) || []
  ).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-defaults-length valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }
  // invalid path aria + title
  const invalid = (
    sp.match(
      /`期間 \(日\) — Sprint 期間 \(日数\) の有効範囲は 1-90、現在値 \$\{length\} は範囲外`/g,
    ) || []
  ).length
  if (invalid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-defaults-length invalid 出現 ${invalid} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2351 regression guard
  if (!sp.includes('iter2351')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2351 sprint-period buttons title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-defaults-length input title 2-path sync 完了、Sprint デフォルト form validation hint 補完',
    )
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
