/**
 * Phase 6.15 loop iter1090: quick-add + create-time-entry-form の pending state visible '...' →
 * Unicode '…' 統一の regression guard。
 *
 * iter1078b-1083 sweep の同 ASCII vs Unicode ellipsis pattern を 2 file に展開:
 *   - quick-add.tsx:178       : visible '...' → '…' (aria-label "「title」を作成中…" と一致)
 *   - create-time-entry-form.tsx:176 : visible '...' → '…' (aria-label "稼働記録を作成中…" と一致)
 *
 * 両 file は実 supabase + auth + workspace context が必要で Docker 不在 (login-screen-only mode)
 * では browser 観察不能、source-of-truth 直読 invariant に fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-time-entry-pending-iter1090.ts
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
  const targets = [
    {
      path: resolve(here, '../src/components/workspace/quick-add.tsx'),
      label: 'quick-add',
      visiblePending: "'…'",
      asciiPending: "'...'",
      visibleNormal: "'作成'",
    },
    {
      path: resolve(here, '../src/components/time-entry/create-time-entry-form.tsx'),
      label: 'create-time-entry-form',
      visiblePending: "'…'",
      asciiPending: "'...'",
      visibleNormal: "'記録'",
    },
  ]

  for (const t of targets) {
    const src = readFileSync(t.path, 'utf8')
    if (src.includes(`? ${t.asciiPending} : ${t.visibleNormal}`)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `WCAG 2.5.3 regression: ${t.label} に ASCII '...' (U+002E×3) が残存 — U+2026 '…' に統一されているはず`,
      })
    }
    if (!src.includes(`? ${t.visiblePending} : ${t.visibleNormal}`)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${t.label} の visible pending '…' (U+2026) が消失`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — quick-add + create-time-entry-form 両方 U+2026 統一済')
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
