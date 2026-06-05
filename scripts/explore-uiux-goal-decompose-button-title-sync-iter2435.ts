/**
 * Phase 6.15 loop iter2435: goal-decompose button の title を aria-label state-dependent
 * 3-path と sync (旧 title 2-path で goal.title 欠落 + 説明文 divergent だった)、
 * proposals-redecompose iter2107 / goals achieved buttons iter2365 と同 title-aria
 * divergence 修正 pattern。
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
  if (!gp.includes('iter2435')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2435 marker が無い',
    })
  }
  // 3-path 各 text aria-label + title 計 2 回出現
  const inactiveText = (
    gp.match(/`AI 分解 — Goal「\$\{goal\.title\}」は active でないため AI 分解不可`/g) || []
  ).length
  if (inactiveText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-decompose inactive 出現 ${inactiveText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const pendingText = (gp.match(/`AI 分解中… — Goal「\$\{goal\.title\}」を AI 分解中…`/g) || [])
    .length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-decompose pending 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (
    gp.match(/`AI 分解 — Goal「\$\{goal\.title\}」を AI 分解 \(5〜10 件の Item を作成\)`/g) || []
  ).length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-decompose idle 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 旧 divergent title が残っていないことを確認
  if (gp.includes("'active な Goal のみ分解可能'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 divergent title text が残っている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — goal-decompose button title 3-path sync 完了、旧 divergent title を aria-label と同 text に揃え、goal.title + 5〜10 件 副作用 mental model を hover で sighted disclose',
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
