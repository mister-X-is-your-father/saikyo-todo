/**
 * Phase 6.15 loop iter 292 — sonner Toaster の `theme` prop が未指定で
 * default "light" のまま、ThemeProvider が dark mode を提供しても toast
 * は light スタイルを維持する問題。
 *
 * 現状: src/app/layout.tsx は `<ThemeProvider attribute="class"
 * defaultTheme="system" enableSystem>` で html.class に "dark" / "light"
 * を切り替えるが、`<Toaster ...>` には `theme` prop が無いので sonner
 * default "light" のまま。
 *
 * sonner 内部 (node_modules/sonner/dist/index.mjs:942):
 *   const [actualTheme, setActualTheme] = React.useState(theme !== 'system'
 *     ? theme
 *     : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
 *
 * theme="system" を渡すと OS preference を respect。data-sonner-theme で
 * toast 要素に dark / light の class が付き、適切な styling 適用。
 *
 * dark mode の app で toast だけ light bg/text → 浮いて視認性低下、
 * accessibility 面でも注意散漫になる UX 悪化。
 *
 * 期待 (fix 後):
 *   `<Toaster ... theme="system" ...>` で sonner が prefers-color-scheme
 *   に従って theme を決定。
 *
 *   pnpm tsx scripts/explore-uiux-toaster-theme-iter292.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // source 側 regex assert: layout.tsx の Toaster に theme="system" が含まれる
  const src = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  const m = src.match(/<Toaster[\s\S]*?\/>/)
  if (!m) {
    findings.push({
      level: 'warning',
      message: `src/app/layout.tsx: <Toaster> が見つからない`,
    })
  } else {
    const block = m[0]
    findings.push({
      level: 'info',
      message: `Toaster block:\n${block}`,
    })
    if (!/theme="system"/.test(block)) {
      findings.push({
        level: 'warning',
        message: `Toaster に theme="system" が無い (sonner default light のまま、dark mode の app と不整合)`,
      })
    }
  }

  console.log(`\n=== Findings (toaster-theme-iter292) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
