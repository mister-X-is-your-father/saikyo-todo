/**
 * Phase 6.15 loop iter 269 — auth layout / /~offline の min-h-screen → dvh 探索。
 *
 * 現状: `(auth)/layout.tsx` と `/~offline/page.tsx` の `<main>` が
 * `min-h-screen` (= 100vh) で高さを取っている。100vh は iOS Safari /
 * Android Chrome で「アドレスバー込みの高さ」を返すバグが古くからあり、
 * mobile で開いたときに content がアドレスバー裏に隠れる / scroll が
 * 出るような問題が出る。Tailwind v4 は `min-h-dvh` (dynamic viewport
 * height = アドレスバーの動的伸縮を反映) を直接サポート。
 *
 * 期待 (fix 後):
 *   `(auth)/layout.tsx` と `/~offline/page.tsx` の `min-h-screen` を
 *   `min-h-dvh` に置換。CSS は dvh fallback で svh / vh に degradate
 *   するモダンブラウザ実装。
 *
 * Supabase 不要。source 確認のみ (DOM では Tailwind が変換した CSS の
 * computed style を見る必要があり viewport 依存性が高いので、source
 * grep を採用)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-dvh-iter269.ts
 */
import { readFileSync } from 'node:fs'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const files = ['src/app/(auth)/layout.tsx', 'src/app/~offline/page.tsx']
  for (const f of files) {
    const src = readFileSync(f, 'utf-8')
    const screenHits = src.match(/min-h-screen/g)
    const dvhHits = src.match(/min-h-dvh/g)
    findings.push({
      level: 'info',
      message: `${f}: min-h-screen=${screenHits?.length ?? 0} / min-h-dvh=${dvhHits?.length ?? 0}`,
    })
    if (screenHits && screenHits.length > 0) {
      findings.push({
        level: 'warning',
        message: `${f}: min-h-screen が ${screenHits.length} 件 — mobile (iOS Safari / Android) でアドレスバー込み高さ問題、min-h-dvh に置換推奨`,
      })
    }
  }

  console.log(`\n=== Findings (auth-dvh-iter269) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
