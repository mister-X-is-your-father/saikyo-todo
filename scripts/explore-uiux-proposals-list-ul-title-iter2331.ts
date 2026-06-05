/**
 * Phase 6.15 loop iter2331: AI 分解提案 ul に title 付与し aria-label "AI 分解提案
 * 一覧 — N 件" と sync。KR list iter2329 / Activity 履歴 ul iter2291 / swimlane
 * lane ul iter2305 / recovery-plan ol iter2315 と同 list family title pattern、
 * 10 entity 一覧 ul/ol family へ拡張。
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
  if (!dp.includes('iter2331')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel iter2331 marker が無い',
    })
  }
  const text = (dp.match(/`AI 分解提案 一覧 — \$\{list\.length\} 件`/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `AI 分解提案 ul expression 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2329 regression guard
  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2329')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2329 KR list ul title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — AI 分解提案 ul title sync 完了、10 entity 一覧 ul/ol family へ拡張')
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
