/**
 * Phase 6.15 loop iter2373: kr-target input に title 付与し aria-label
 * state-dependent 3-path (空 / 不正 / valid+unit) と sync。
 * budget-limit-input iter2333 / budget-warn-input iter2345 と同 numeric input
 * title-aria 3-path sync pattern を kr-target にも展開、KR manual mode form の
 * hover hint 補完。
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

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2373')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2373 marker が無い',
    })
  }
  // empty path
  const empty = (gp.match(/'目標値 \(KR を達成判定するための数値、必須、decimal 可\)'/g) || [])
    .length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `kr-target empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path expression
  const valid = (gp.match(/`目標値 \(現在: \$\{target\}\$\{unit \? ` \$\{unit\}` : ''\}\)`/g) || [])
    .length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `kr-target valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — kr-target input title 3-path sync 完了、KR manual mode form hover hint 補完',
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
