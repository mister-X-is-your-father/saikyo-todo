/**
 * Phase 6.15 loop iter2333: budget-limit-input に title 付与し aria-label
 * state-dependent 3-path (empty / invalid / valid) と sync。src-url iter2313 /
 * editTitle iter2295 と同 input title-aria sync pattern を budget-limit に展開。
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

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2333')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'budget-panel iter2333 marker が無い',
    })
  }
  // empty path aria + title 計 2 出現
  const empty = (bp.match(/'月次上限 \(USD\) — 空欄で無制限'/g) || []).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-limit empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path expression
  const valid = (
    bp.match(/`月次上限 \(USD、現在: \$\$\{Number\(draftLimit\)\.toFixed\(2\)\}\)`/g) || []
  ).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-limit valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }
  // invalid path expression
  const invalid = (
    bp.match(/`月次上限 \(USD、0 以上の数値必須、現在値「\$\{draftLimit\}」は不正\)`/g) || []
  ).length
  if (invalid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-limit invalid 出現 ${invalid} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2331 regression guard
  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2331')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2331 AI 分解提案 ul title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — budget-limit-input title 3-path sync 完了、AI 月次コスト上限 validation hint 補完',
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
