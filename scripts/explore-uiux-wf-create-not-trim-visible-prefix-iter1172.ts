/**
 * Phase 6.15 loop iter1172: workflows-panel wf-create-btn not-trim path aria-label visible-prefix
 * regression guard。
 *
 * iter1172 で発見した iter1118 sweep 残漏 (comment-save iter1169 / quick-add iter1170 /
 * goal-create iter1171 と同 pattern): workflows-panel.tsx `wf-create-btn` button
 * (visible "{pending? '作成中…' : '作成'}") の not-trim path 旧 aria-label
 * 'Workflow を作成するには名前を入力してください' は visible "作成" を中位置
 * "Workflow を **作成** するには…" に持ち voice control prefix-matching「click 作成」 match 不可。
 *
 * 修正 (workflows-panel.tsx):
 *   - not-trim: 旧 'Workflow を作成するには名前を入力してください'
 *               → '作成 — Workflow を作成するには名前を入力してください'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-wf-create-not-trim-visible-prefix-iter1172.ts
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
  const filePath = resolve(here, '../src/components/workflow/workflows-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'作成 — Workflow を作成するには名前を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-create-btn not-trim path が visible-prefix 形式 "作成 — ..." でない',
    })
  }
  if (src.includes("'Workflow を作成するには名前を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Workflow を作成するには..." が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — wf-create-btn not-trim path も visible "作成" 冒頭固定済')
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
