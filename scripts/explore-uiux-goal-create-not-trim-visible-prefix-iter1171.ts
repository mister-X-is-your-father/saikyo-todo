/**
 * Phase 6.15 loop iter1171: goals-panel goal-create-btn not-trim path aria-label visible-prefix
 * regression guard。
 *
 * iter1171 で発見した iter1112 sweep 残漏: goals-panel.tsx `goal-create-btn` button
 * (visible "{pending? '作成中…' : '作成'}") の not-trim path 旧 aria-label
 * 'Goal を作成するにはタイトルを入力してください' は visible "作成" を中位置
 * "Goal を **作成** するには…" に持ち voice control prefix-matching「click 作成」 match 不可。
 * pending / default は iter1112 で既に visible-prefix em-dash 化済、not-trim だけ漏れていた。
 *
 * 修正 (goals-panel.tsx):
 *   - not-trim: 旧 'Goal を作成するにはタイトルを入力してください'
 *               → '作成 — Goal を作成するにはタイトルを入力してください'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-goal-create-not-trim-visible-prefix-iter1171.ts
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

  if (!src.includes("'作成 — Goal を作成するにはタイトルを入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goal-create-btn not-trim path が visible-prefix 形式 "作成 — ..." でない',
    })
  }
  if (src.includes("'Goal を作成するにはタイトルを入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Goal を作成するには..." が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — goal-create-btn not-trim path も visible "作成" 冒頭固定済')
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
