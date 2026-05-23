/**
 * Phase 6.15 loop iter1177: goals-panel kr-add-btn not-trim path aria-label visible-prefix
 * regression guard。
 *
 * iter1177 で発見した iter1121 sweep の重要漏れ: goals-panel.tsx `kr-add-btn-${goalId}`
 * button (visible "KR 追加") の not-trim path 旧 aria-label 'Key Result を追加するには
 * タイトルを入力してください' は visible "KR 追加" を一切含まず WCAG 2.5.3 Label in Name
 * 違反継続 (略語 "KR" と full "Key Result" の divergence) + voice control「click KR 追加」
 * match 不可。pending / default は iter1121 で fix 済。
 *
 * 修正 (goals-panel.tsx):
 *   - not-trim: 'KR 追加 — Key Result を追加するにはタイトルを入力してください'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-kr-add-not-trim-visible-prefix-iter1177.ts
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
  const filePath = resolve(here, '../src/components/workspace/goals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'KR 追加 — Key Result を追加するにはタイトルを入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kr-add-btn not-trim path が visible-prefix 形式 "KR 追加 — ..." でない',
    })
  }
  if (src.includes("'Key Result を追加するにはタイトルを入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Key Result を追加するには..." (visible "KR 追加" 不含) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — kr-add-btn not-trim path も visible "KR 追加" 冒頭固定済 (WCAG 2.5.3 satisfy)',
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
