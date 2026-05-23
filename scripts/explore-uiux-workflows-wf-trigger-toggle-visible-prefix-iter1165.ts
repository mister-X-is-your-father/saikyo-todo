/**
 * Phase 6.15 loop iter1165: workflows-panel wf-trigger (!enabled / nodeCount===0) + wf-toggle
 * (pending) aria-label visible-prefix regression guard。
 *
 * iter1165 で発見した iter1116 sweep 残漏 (integrations-panel iter1164 同 pattern):
 * - wf-trigger !wf.enabled / nodeCount===0 path: 旧 `Workflow「name」は...のため実行不可`
 *   は visible "実行" を末尾 "実行不可" に持ち prefix-match 不可。
 * - wf-toggle update.isPending path: 旧 `Workflow「name」の状態を更新中…` は
 *   visible "無効化" / "有効化" を含まず substring 一致すら不可 (WCAG 2.5.3 違反)。
 *
 * 修正 (workflows-panel.tsx):
 * - wf-trigger !enabled / nodeCount===0: `実行 — Workflow「name」は...のため実行不可`
 * - wf-toggle pending: wf.enabled 別に `無効化 — ...更新中…` / `有効化 — ...更新中…`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflows-wf-trigger-toggle-visible-prefix-iter1165.ts
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

  for (const expected of [
    '`実行 — Workflow「${wf.name}」は無効化中のため実行不可`',
    '`実行 — Workflow「${wf.name}」は node が無いため実行不可`',
    '`無効化 — Workflow「${wf.name}」の状態を更新中…`',
    '`有効化 — Workflow「${wf.name}」の状態を更新中…`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workflows-panel: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`Workflow「${wf.name}」は無効化中のため実行不可`',
    '`Workflow「${wf.name}」は node が無いため実行不可`',
    '`Workflow「${wf.name}」の状態を更新中…`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workflows-panel: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-trigger !enabled/nodeCount===0 / wf-toggle pending とも visible 冒頭固定済',
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
