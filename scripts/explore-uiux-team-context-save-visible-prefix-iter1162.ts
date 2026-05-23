/**
 * Phase 6.15 loop iter1162: team-context-editor save button aria-label visible-prefix regression guard。
 *
 * iter1162 で発見した visible-prefix 漏れ: team-context-editor.tsx
 * `team-context-save-btn` (visible "{pending? '保存中…' : '保存'}") の旧 aria-label
 * 3 path とも visible "保存" / "保存中…" を中位置 ("保存不要" / "を 保存中…" /
 * "を 保存 (...)") に持ち voice control prefix-matching「click 保存 / 保存中…」
 * match 不可 (substring 一致のみ)。iter1093-1161 sweep convention が漏れていた。
 *
 * 修正 (team-context-editor.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - not-dirty: `保存 — チームコンテキストに変更がないため保存不要`
 *   - pending:   `保存中… — チームコンテキストを保存中…`
 *   - default:   `保存 — チームコンテキストを保存 (AI プロンプト末尾に inject)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-team-context-save-visible-prefix-iter1162.ts
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
  const filePath = resolve(here, '../src/components/workspace/team-context-editor.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    "'保存 — チームコンテキストに変更がないため保存不要'",
    "'保存中… — チームコンテキストを保存中…'",
    "'保存 — チームコンテキストを保存 (AI プロンプト末尾に inject)'",
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `team-context-save-btn: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    "'チームコンテキストに変更がないため保存不要'",
    "'チームコンテキストを保存中…'",
    "'チームコンテキストを保存 (AI プロンプト末尾に inject)'",
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `team-context-save-btn: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — team-context-save-btn aria-label 3 path とも visible 冒頭固定済')
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
