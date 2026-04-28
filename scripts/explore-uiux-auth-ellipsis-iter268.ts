/**
 * Phase 6.15 loop iter 268 — login / signup pending text の ellipsis 統一 探索。
 *
 * 現状:
 *   visible text: "ログイン中..." / "作成中..." (ASCII dot ×3)
 *   aria-label  : "ログイン処理中…" / "アカウント作成中…" (Unicode 三点リーダー U+2026)
 *
 * 同 component 内で文字不一致。SR と sighted user で受ける文言が違うのは
 * UX/typography polish 観点で取りこぼし。CJK 文字との混在では Unicode 三点
 * リーダー "…" が typographic に正しく、ASCII "..." は西洋語タイポ用。
 *
 * 期待 (fix 後):
 *   visible text を "…" に統一。aria-label は既に "…"。両者 一致。
 *
 * Supabase 不要。dev server に登載されている文字列 (DOM text) を確認。
 *
 *   pnpm tsx scripts/explore-uiux-auth-ellipsis-iter268.ts
 */
import { readFileSync } from 'node:fs'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const files = ['src/components/auth/login-form.tsx', 'src/components/auth/signup-form.tsx']
  for (const f of files) {
    const src = readFileSync(f, 'utf-8')
    const ascii = src.match(/中\.\.\./g)
    const unicode = src.match(/中…/g)
    findings.push({
      level: 'info',
      message: `${f}: ASCII "中..." 出現=${ascii?.length ?? 0} / Unicode "中…" 出現=${unicode?.length ?? 0}`,
    })
    if (ascii && ascii.length > 0) {
      findings.push({
        level: 'warning',
        message: `${f}: visible pending text に ASCII "..." が ${ascii.length} 件 — 同 component 内で aria-label の "…" と不一致`,
      })
    }
  }

  console.log(`\n=== Findings (auth-ellipsis-iter268) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
