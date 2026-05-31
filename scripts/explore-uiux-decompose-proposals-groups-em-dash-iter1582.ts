/**
 * Phase 6.15 loop iter1582: decompose-proposals-panel 3 group landmark aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1581 sweep convention 着地)。
 *
 * 同 file 3 group 一括変換:
 *   - bulk 操作 (line 201)
 *   - 編集 form 操作 (line 516)
 *   - 提案操作 (line 589)
 *
 * iter1578-1581 operations group sweep family と同 pattern。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-decompose-proposals-groups-em-dash-iter1582.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  if (!src.includes('AI 分解提案の bulk 操作 — 全て採用')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'bulk 操作 group aria-label が em-dash 形式でない',
    })
  }
  if (!src.includes('の編集 form 操作 — キャンセル / 保存')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '編集 form 操作 group aria-label が em-dash 形式でない',
    })
  }
  if (!src.includes('の操作 — 採用 / 却下')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '提案操作 group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('AI 分解提案の bulk 操作 (全て採用')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'bulk 操作 旧 paren convention 残存',
    })
  }
  if (src.includes('の編集 form 操作 (キャンセル')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '編集 form 操作 旧 paren convention 残存',
    })
  }
  if (src.includes('の操作 (採用 / 却下)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '提案操作 旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — decompose-proposals 3 group aria-label が em-dash 形式')
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
