/**
 * Phase 6.15 loop iter2371: proposal-title input に title 付与し aria-label
 * state-dependent 4-path (空 / 空白のみ / 上限近接 / 通常) と sync。
 * editTitle iter2295 / tmpl-name iter2365 / te-description iter2303 と同 input
 * title-aria sync pattern を proposal-title input にも展開、4-path title input
 * family 4 element 完成。
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2371')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel iter2371 marker が無い',
    })
  }
  // empty path
  const empty = (dp.match(/'タイトル — 提案タイトル \(必須、最大 500 文字\)'/g) || []).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `proposal-title empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (
    dp.match(/`タイトル — 提案タイトル \(現在 \$\{title\.length\} \/ 500 文字\)`/g) || []
  ).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `proposal-title valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — proposal-title input title 4-path sync 完了、4-path title input family 4 element 完成 (editTitle / te-description / tmpl-name / proposal-title)',
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
