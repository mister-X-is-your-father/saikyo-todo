/**
 * Phase 6.15 loop iter 396 — `EmptyState` の description wrapper を `<p>` から
 * `<div>` に変更し `<p> cannot be a descendant of <p>` hydration error を解消。
 *
 * 課題: real browser 探索 (chromium 経由 /templates) で console error
 *   "In HTML, <p> cannot be a descendant of <p>. This will cause a hydration error."
 *   を検出。原因は src/components/shared/async-states.tsx の `EmptyState` が
 *   `description` を `<p>` で wrap している (line 63) が、iter273 で
 *   description prop を ReactNode に拡張済で caller 側 (templates-panel /
 *   archived-items-panel 等 10+ files) は `<p>` を含む JSX を渡している。
 *   結果: `<p> {<p>...</p>} {<p>...</p>} </p>` という invalid HTML が生成され、
 *   browser が DOM 修正で paragraph を auto-close → React の SSR-CSR mismatch
 *   で hydration error。
 *
 * fix: src/components/shared/async-states.tsx 1 file × 1 箇所 (約 6 line 差替、
 *   機能追加なし、shadcn 編集なし)。EmptyState の description を `<p>` から
 *   `<div>` に変更。className (text-muted-foreground max-w-md text-sm) は
 *   そのまま、visual styling は `<div>` でも同等。
 *
 *   semantic 観点: `<p>` の方が paragraph として明示的だが、ReactNode を
 *   受ける時点で string-only の制約を諦めている。`<div>` で wrap する方が
 *   柔軟で hydration error も出ない。
 *
 * 検証: source-side regex assert + dev server で /templates page の console
 *   error 消滅を確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/shared/async-states.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. <div> で wrap (旧 <p> 削除)
  if (!/<div className="text-muted-foreground max-w-md text-sm">\{description\}<\/div>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: EmptyState description が <div> で wrap されていない`,
    })
  } else {
    findings.push({ level: 'info', message: 'EmptyState description <div> wrap OK' })
  }

  // 2. 旧 `<p ...>{description}</p>` が消えた
  if (/<p className="text-muted-foreground max-w-md text-sm">\{description\}<\/p>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 <p>{description}</p> が残っている`,
    })
  }

  // 3. iter394 / iter395 invariant 維持
  for (const f of [
    'src/components/template/templates-panel.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/integrations/integrations-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<CardTitle\s+className="[^"]+"\s+role="heading"/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter394/395 CardTitle role=heading が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (empty-state-hydration-iter396) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
