/**
 * Phase 6.15 loop iter 311 — items-board の "新規 Item (クイック追加)" Card Title に
 * heading semantic を付与 (iter256 auth pages CardTitle 修正の workspace 拡張)。
 *
 * 課題: shadcn `<CardTitle>` は `<div data-slot="card-title">` 実装で role=heading
 *   を持たない (src/components/ui/card.tsx:36-44)。workspace home の "新規 Item
 *   (クイック追加)" Card は QuickAdd の主要 entry point だが SR の heading
 *   navigation (NVDA H key / VoiceOver Cmd+Opt+H) で skip 不可、SR ユーザは
 *   ページ構造を線形 read で把握する必要がある。WCAG 2.4.6 (Headings and Labels,
 *   Level AA) 「コンテンツ topic 識別の見出し / ラベル」非対応。
 *
 * fix: CardTitle に `role="heading" aria-level={2}` を追加 (DOM はそのまま div、
 *   ARIA tree のみ heading 化)。h1 (workspace title in WorkspaceHeader) の sub-section
 *   なので level=2。shadcn 編集禁止ルール内で対応 (props 経由で追加)。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/items-board.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // CardTitle に role="heading" + aria-level={2} がある
  const titleBlock = src.match(/<CardTitle\b[^>]*?>[\s\S]*?新規 Item[\s\S]*?<\/CardTitle>/)
  if (!titleBlock) {
    findings.push({ level: 'error', message: `${target}: 新規 Item CardTitle not found` })
  } else {
    const opening = titleBlock[0].match(/<CardTitle\b[^>]*?>/)?.[0] ?? ''
    if (!/role=["']heading["']/.test(opening)) {
      findings.push({ level: 'warning', message: `${target}: role="heading" 不在` })
    }
    if (!/aria-level=\{2\}/.test(opening)) {
      findings.push({ level: 'warning', message: `${target}: aria-level={2} 不在` })
    }
    if (/role=["']heading["']/.test(opening) && /aria-level=\{2\}/.test(opening)) {
      findings.push({ level: 'info', message: `${target}: CardTitle heading semantic OK` })
    }
  }

  // iter256 invariant: /login と /signup の h1 が依然存在 (CardTitle 経由ではなく
  // 直接 <h1>) を回帰防止
  for (const path of ['src/app/(auth)/login/page.tsx', 'src/app/(auth)/signup/page.tsx']) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/<h1\b[^>]*\bid=["'](login|signup)-heading["']/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: h1 id 回帰` })
    }
  }

  console.log(`\n=== Findings (quick-add-card-heading-iter311) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
