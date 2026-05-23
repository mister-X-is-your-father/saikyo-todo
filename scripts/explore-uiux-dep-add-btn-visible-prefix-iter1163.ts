/**
 * Phase 6.15 loop iter1163: item-dependencies-panel dep-add-btn aria-label visible-prefix regression guard。
 *
 * iter1163 で発見した visible-prefix 漏れ: item-dependencies-panel.tsx
 * `dep-add-btn` button (visible "{pending? '追加中…' : '追加'}") の旧 aria-label
 * 3 path とも visible "追加" / "追加中…" を中位置 ("依存を追加するには ..." /
 * "依存を追加中…" / "依存先として追加") に持ち voice control prefix-matching
 *「click 追加 / 追加中…」 match 不可 (substring 一致のみ)。iter1093-1162 sweep
 * convention が漏れていた。
 *
 * 修正 (item-dependencies-panel.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - no-pick:  `追加 — 依存を追加するには対象 Item を選択してください`
 *   - pending:  `追加中… — 依存を追加中…`
 *   - default:  `追加 — 選択した Item を依存先として追加`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dep-add-btn-visible-prefix-iter1163.ts
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
  const filePath = resolve(here, '../src/components/workspace/item-dependencies-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    "'追加 — 依存を追加するには対象 Item を選択してください'",
    "'追加中… — 依存を追加中…'",
    "'追加 — 選択した Item を依存先として追加'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `dep-add-btn: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'依存を追加するには対象 Item を選択してください'",
    "'依存を追加中…'",
    "'選択した Item を依存先として追加'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `dep-add-btn: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — dep-add-btn aria-label 3 path とも visible 冒頭固定済')
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
