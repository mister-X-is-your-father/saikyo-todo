/**
 * Phase 6.15 loop iter1164: integrations-panel src-pull / src-toggle aria-label visible-prefix
 * regression guard。
 *
 * iter1164 で発見した visible-prefix 漏れ (iter1115 sweep の 2 path 漏れ):
 * - src-pull の !src.enabled path: 旧 `Source「name」は無効化中のため Pull 不可` は
 *   visible "Pull" を末尾持ち prefix-match 不可。
 * - src-toggle の pending path: 旧 `Source「name」の状態を更新中…` は visible
 *   "無効化" / "有効化" を含まず substring 一致すら不可 (WCAG 2.5.3 違反)。
 *
 * 修正 (integrations-panel.tsx):
 * - src-pull !src.enabled: `Pull — Source「name」は無効化中のため Pull 不可`
 * - src-toggle pending: src.enabled 別に `無効化 — ...` / `有効化 — ...` で分岐
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-integrations-src-pull-toggle-visible-prefix-iter1164.ts
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
  const filePath = resolve(here, '../src/components/integrations/integrations-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    '`Pull — Source「${src.name}」は無効化中のため Pull 不可`',
    '`無効化 — Source「${src.name}」の状態を更新中…`',
    '`有効化 — Source「${src.name}」の状態を更新中…`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `integrations-panel: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`Source「${src.name}」は無効化中のため Pull 不可`',
    '`Source「${src.name}」の状態を更新中…`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `integrations-panel: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — src-pull !enabled / src-toggle pending とも visible 冒頭固定済')
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
