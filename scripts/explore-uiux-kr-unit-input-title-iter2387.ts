/**
 * Phase 6.15 loop iter2387: kr-unit input に title 付与し aria-label
 * state-dependent 2-path (空 hint / 通常) と sync。kr-target iter2373 と pair
 * で KR manual mode form の hover hint 補完 (target + unit 2 input family 完成)。
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
  if (!gp.includes('iter2387')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2387 marker が無い',
    })
  }
  // empty path
  const empty = (
    gp.match(/'単位 \(任意、最大 20 文字、目標値とセット — 例: 件 \/ % \/ hours\)'/g) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `kr-unit empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (gp.match(/`単位 \(現在: 「\$\{unit\}」、\$\{unit\.length\} 文字\)`/g) || []).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `kr-unit valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — kr-unit input title 2-path sync 完了、KR manual mode form target + unit 2 input family 完成',
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
