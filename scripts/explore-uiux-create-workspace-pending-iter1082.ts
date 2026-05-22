/**
 * Phase 6.15 loop iter1082: create-workspace-form pending state aria-label vs visible literal
 * substring 一致 regression guard。
 *
 * iter1082 で発見した bug: visible は ASCII '...' (`作成中...`) だったが aria-label は U+2026
 * '…' (`Workspace を作成中…`) を使っていて literal substring 不一致 = WCAG 2.5.3 違反 +
 * voice control「click 作成中…」 matching 不可だった (iter1078b mock-login / iter1081b mock-submit
 * と同 pattern を create-workspace-form に展開)。
 *
 * 修正 (create-workspace-form.tsx:122): 視覚 '作成中...' → '作成中…' に統一して aria-label substring 復旧。
 *
 * 本 script は create-workspace-form の source を直接読んで pending state の string literal
 * が U+2026 ellipsis のみ含み ASCII '...' を含まないことを assertion 化する meta-level regression
 * guard。create-workspace は実 supabase + auth が必要で、Docker 不在 (login-screen-only mode) では
 * browser での実観察ができないため、source-of-truth 直読 invariant に fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-create-workspace-pending-iter1082.ts
 * 前提: なし (filesystem 読み込みのみ、pnpm dev / supabase 不要)
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
  const filePath = resolve(here, '../src/components/workspace/create-workspace-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  // ASCII '作成中...' (U+002E×3) が visible <span> 内に残っていないか
  if (src.includes("'作成中...'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `WCAG 2.5.3 regression: create-workspace-form に ASCII '作成中...' (U+002E×3) が残存 — Unicode '作成中…' (U+2026) に統一されているはず`,
    })
  }
  // Unicode '作成中…' が含まれていることを確認 (削除回帰防止)
  if (!src.includes("'作成中…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `create-workspace-form の visible pending text '作成中…' (U+2026) が消失`,
    })
  }
  // aria-label 側との一致確認 (両方 U+2026 を使っている前提)
  if (!src.includes('Workspace を作成中…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `create-workspace-form の aria-label pending 'Workspace を作成中…' が消失`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — create-workspace-form pending state は WCAG 2.5.3 satisfy (visible / aria-label 両方 U+2026)',
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
