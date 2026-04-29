/**
 * Phase 6.15 loop iter 369 — root `layout.tsx` に `robots: { index: false,
 * follow: false }` global default を追加 (iter368 の auth/offline page 続編)。
 * 全 page (workspace pages 含む) を search engine から不可視に設定し、
 * 「社内チーム利用・社外非公開」(CLAUDE.md) の intent を root metadata
 * 一箇所で表明する。
 *
 * 課題: iter368 で login/signup/offline 3 page に robots を個別追加した
 *   が、workspace pages (Dashboard / Today / Inbox / Sprints / Goals
 *   / PDCA / Templates / Workflows / Integrations / Archive 等の
 *   多数) は robots 不在で、anonymous crawler はこれら URL を 307
 *   redirect 経由で発見しても index 試行する余地が残っていた
 *   (redirect 先 /login が noindex でも、redirect 元 URL の indexing
 *   policy は redirect 元自身の robots に依存する)。
 *
 * fix: layout.tsx の root metadata に `robots: { index: false, follow: false }`
 *   を追加 (1 file 数行 + コメントで intent 明記)。Next.js App Router
 *   metadata は layout で設定すると全 child page が inherit (page で
 *   override 不指定なら layout 値を使用)。これにより workspace pages
 *   含む全 page が `<meta name="robots" content="noindex, nofollow">`
 *   を出力。public 化したい page が将来出たら、当該 page の
 *   metadata で `robots: { index: true }` を override する pattern。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。iter368 の per-page
 * robots は同値なので harmless duplicate (defense-in-depth として残置)。
 *
 * 検証: source-side regex assert + curl で <meta name="robots"> 確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/layout.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: robots metadata 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `layout robots metadata OK` })
  }

  // 既存 metadata invariant 維持
  const layoutInvariants = [
    [/title: '最強TODO'/, 'layout title metadata'],
    [/description: 'チーム共有 AI 駆動 TODO'/, 'layout description metadata'],
    [/manifest: '\/manifest\.webmanifest'/, 'layout manifest metadata'],
    [/appleWebApp:/, 'layout appleWebApp metadata'],
  ] as const
  for (const [re, label] of layoutInvariants) {
    if (!re.test(src)) {
      findings.push({ level: 'warning', message: `${label} が消えた (regression)` })
    }
  }

  // iter368 の per-page robots も維持されていること (defense-in-depth)
  const perPages = [
    'src/app/(auth)/login/page.tsx',
    'src/app/(auth)/signup/page.tsx',
    'src/app/~offline/page.tsx',
  ]
  for (const p of perPages) {
    const pSrc = readFileSync(resolve(process.cwd(), p), 'utf8')
    if (!/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(pSrc)) {
      findings.push({
        level: 'warning',
        message: `${p}: per-page robots が消えた (iter368 regression)`,
      })
    }
  }

  console.log(`\n=== Findings (layout-robots-iter369) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
