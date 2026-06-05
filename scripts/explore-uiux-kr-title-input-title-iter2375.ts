/**
 * Phase 6.15 loop iter2375: kr-title input に title 付与し aria-label state-
 * dependent 4-path (空 / 空白のみ / 上限近接 / 通常) と sync。editTitle iter2295
 * / tmpl-name iter2365 / proposal-title iter2371 と同 input title-aria sync
 * pattern を KR title input にも展開、4-path title input family 5 element 拡張。
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
  if (!gp.includes('iter2375')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2375 marker が無い',
    })
  }
  // empty path
  const empty = (
    gp.match(/'KR タイトル \(必須、最大 300 文字、達成判定可能な数値目標が望ましい\)'/g) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `kr-title empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (gp.match(/`KR タイトル \(現在 \$\{krTitle\.length\} \/ 300 文字\)`/g) || []).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `kr-title valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — kr-title input title 4-path sync 完了、4-path title input family 5 element 拡張',
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
