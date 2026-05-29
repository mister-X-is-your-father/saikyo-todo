/**
 * Phase 6.15 loop iter1428 (mode-M = Mobile audit):
 * 作戦盤 (operation-board-widget) の row button `operation-board-row-*` が
 * `flex w-full items-center gap-2 truncate rounded px-1 py-0.5 text-left` で
 * iPhone SE (375x667) で **291x24** → WCAG 2.5.5 (target size ≥44x44) 未達。
 * Desktop (1280) でも 924x24 で同 violation。iter1304 で expander 1 button は
 * min-h-11 + ::before tap area で fix 済だが、item を開く本体 row は取り残し。
 *
 * 修正: 1 button に `min-h-11` を追加 (1 char insert)。Desktop でも 44px に
 * 揃え、追加 vertical spacing 約 20px。display 行数は推奨/quickwin/focus/期限超過/
 * 完了済/今日 done の 6 section 各 3-5 item で、44px 化しても density 過減なし。
 *
 * 経路 A (MCP) → B codify。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-mobile-operation-board-row-h11-iter1428.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // expected: row button has min-h-11
  if (
    !src.includes('flex min-h-11 w-full items-center gap-2 truncate rounded px-1 py-0.5 text-left')
  ) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: row button に min-h-11 不在 (期待 fragment 検出失敗)',
    })
  }

  // invariant: iter1304 の expander min-h-11 + ::before extension は維持
  if (!src.includes("before:-inset-3 before:content-['']")) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: iter1304 expander ::before tap area invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1428 operation-board-row min-h-11) ===`)
  if (findings.length === 0)
    console.log('(なし) — row button 44px tap target + iter1304 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
