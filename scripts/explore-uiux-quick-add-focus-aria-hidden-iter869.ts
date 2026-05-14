/**
 * Phase 6.15 loop iter869 — 3 empty-state quick-add focus button visible "クイック追加に
 * フォーカス (キー: q)" を aria-hidden span で wrap した regression guard。
 *
 * 対象 (3 view の empty state action button):
 *   1. today-view.tsx:161
 *   2. inbox-view.tsx:89
 *   3. items-board.tsx:483
 *
 * 3 件とも aria-label="クイック追加入力欄にフォーカス (q キーでも可)" と
 * aria-keyshortcuts="q" を持つ。
 *
 *   pnpm tsx scripts/explore-uiux-quick-add-focus-aria-hidden-iter869.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILES = [
  'src/components/workspace/today-view.tsx',
  'src/components/workspace/inbox-view.tsx',
  'src/components/workspace/items-board.tsx',
]

function main(): void {
  const findings: Finding[] = []
  for (const file of FILES) {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8')
    if (!/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(src)) {
      findings.push({ level: 'error', message: `${file}: visible wrap が無い` })
    }
    // aria-label 健在
    if (!src.includes('aria-label="クイック追加入力欄にフォーカス (q キーでも可)"')) {
      findings.push({ level: 'error', message: `${file}: aria-label invariant 不一致` })
    }
    // aria-keyshortcuts="q" 健在
    if (!src.includes('aria-keyshortcuts="q"')) {
      findings.push({ level: 'error', message: `${file}: aria-keyshortcuts="q" 健在性 NG` })
    }
  }

  console.log(`\n=== Findings (quick-add-focus-aria-hidden iter869) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
