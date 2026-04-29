/**
 * Phase 6.15 loop iter 309 — decompose-proposals-panel の Sparkles lucide icon に
 * aria-hidden 漏れを補完 (iter298 ThemeToggle / iter299 budget AlertTriangle に続く
 * lucide aria-hidden sweep の 3 件目)。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx:123 の `<Sparkles>`
 *   icon は visible text ("Researcher が分解中…" / "AI 分解の提案 (N)") と並んで
 *   表示されるため decorative。`aria-hidden` 指定無しで lucide-react の defaultAttributes
 *   は aria-hidden を含まないため、SR 実装によっては "graphic" を冗長 announce する
 *   ノイズが発生 (iter298/299 で確立されたパターン)。
 *
 * fix: Sparkles に `aria-hidden="true"` を追加 (1 行)。visible 表示は変更なし、
 *   text 子の "Researcher が分解中…" 等で完全に意味伝達済。
 *
 * WCAG 1.1.1 (Non-text Content, Level A) 技術 G94: decorative element は a11y
 *   tree から除外推奨。lucide-react icon の sweep として一貫性向上。
 *
 * 検証: source-side regex assert で codify (Supabase 認証必須画面のため runtime
 *   DOM 検証は環境依存)。
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. decompose-proposals-panel.tsx の Sparkles に aria-hidden="true" がある
  const target = 'src/components/workspace/decompose-proposals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')
  const sparklesBlock = src.match(/<Sparkles\b[^/]*?\/>/s)
  if (!sparklesBlock) {
    findings.push({ level: 'error', message: `${target}: <Sparkles ... /> not found` })
  } else if (!/aria-hidden=["']true["']/.test(sparklesBlock[0])) {
    findings.push({ level: 'warning', message: `${target}: Sparkles missing aria-hidden="true"` })
  } else {
    findings.push({ level: 'info', message: `${target}: Sparkles aria-hidden OK` })
  }

  // 2. iter298 / iter299 invariant: ThemeToggle Sun/Moon と budget AlertTriangle が
  //    aria-hidden 維持
  const themeSrc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/theme-toggle.tsx'),
    'utf8',
  )
  if (
    !/<Sun[^/]*aria-hidden=["']true["']/.test(themeSrc) ||
    !/<Moon[^/]*aria-hidden=["']true["']/.test(themeSrc)
  ) {
    findings.push({ level: 'warning', message: 'theme-toggle.tsx: Sun/Moon aria-hidden 回帰' })
  }
  const budgetSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (!/<AlertTriangle[^/]*aria-hidden=["']true["']/.test(budgetSrc)) {
    findings.push({ level: 'warning', message: 'budget-panel.tsx: AlertTriangle aria-hidden 回帰' })
  }

  // 3. lucide icons sweep: codebase 内 lucide JSX 使用箇所のうち aria-hidden 未指定が
  //    無いことを軽 audit (false positive 抑えのため代表 icon 名で grep)
  const repFiles = execSync('grep -rl "lucide-react" src --include="*.tsx" || true', {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
  const repNames = ['Sparkles', 'AlertTriangle', 'Sun', 'Moon', 'Bell', 'Loader2']
  let missing = 0
  for (const f of repFiles) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    for (const n of repNames) {
      const re = new RegExp(`<${n}\\b[^/>]*?(/>|>)`, 'gs')
      const matches = s.match(re) ?? []
      for (const m of matches) {
        if (!/aria-hidden=["']true["']/.test(m)) {
          missing++
          findings.push({ level: 'warning', message: `${f}: <${n}> aria-hidden 漏れ` })
        }
      }
    }
  }
  findings.push({
    level: 'info',
    message: `lucide aria-hidden sweep (代表 6 icon): 漏れ ${missing} 件`,
  })

  console.log(`\n=== Findings (decompose-sparkles-aria-hidden-iter309) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
