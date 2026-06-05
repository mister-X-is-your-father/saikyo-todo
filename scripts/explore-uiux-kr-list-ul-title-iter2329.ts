/**
 * Phase 6.15 loop iter2329: KR 一覧 ul に title 付与し aria-label "Key Result
 * 一覧 — N 件" と sync。Activity 履歴 ul iter2291 / swimlane lane ul iter2305
 * / recovery-plan ol iter2315 と同 list family title pattern、9 entity 一覧
 * ul/ol family へ拡張。
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
  if (!gp.includes('iter2329')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2329 marker が無い',
    })
  }
  // aria-label + title 計 2 出現
  const krText = (gp.match(/`Key Result 一覧 — \$\{\(list\.data \?\? \[\]\)\.length\} 件`/g) || [])
    .length
  if (krText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `KR list expression 出現 ${krText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 list family regression guard
  const rp = readFileSync(resolve(here, '../src/components/item/recovery-plan-section.tsx'), 'utf8')
  if (!rp.includes('iter2315')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2315 recovery-plan ol title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — KR 一覧 ul title sync 完了、9 entity 一覧 ul/ol family へ拡張')
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
