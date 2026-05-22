/**
 * Phase 6.15 loop iter1083: item-edit-dialog save button pending state aria-label vs visible
 * literal substring 一致 regression guard。
 *
 * iter1083 で発見した bug: visible は ASCII '...' (`保存中...`) だったが aria-label は U+2026
 * '…' (`「${title}」を保存中…`) を使っていて literal substring 不一致 = WCAG 2.5.3 違反 + voice
 * control「click 保存中…」 matching 不可だった (iter1078b/1081b/1082b 同 pattern を item-edit-dialog
 * にも展開)。
 *
 * 修正 (item-edit-dialog.tsx:1015): 視覚 '保存中...' → '保存中…' に統一して aria-label substring 復旧。
 *
 * item-edit-dialog は workspace + auth + 実 item が必要で Docker 不在 (login-screen-only mode)
 * では browser 観察不能のため、source-of-truth 直読 invariant に fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-edit-save-pending-iter1083.ts
 * 前提: なし (filesystem 読み込みのみ)
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
  const filePath = resolve(here, '../src/components/workspace/item-edit-dialog.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (src.includes("'保存中...'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `WCAG 2.5.3 regression: item-edit-dialog に ASCII '保存中...' (U+002E×3) が残存 — Unicode '保存中…' (U+2026) に統一されているはず`,
    })
  }
  if (!src.includes("'保存中…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-edit-dialog の visible pending text '保存中…' (U+2026) が消失`,
    })
  }
  // aria-label は template-literal で `「${item.title}」を保存中…` の形を取るので部分一致 check
  if (!src.includes('を保存中…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-edit-dialog の aria-label pending 'を保存中…' (U+2026) が消失`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — item-edit-dialog save pending state は WCAG 2.5.3 satisfy (visible / aria-label 両方 U+2026)',
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
