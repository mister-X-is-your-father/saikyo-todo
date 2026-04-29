/**
 * Phase 6.15 loop iter 371 — `layout.tsx` の `<body>` 直下に `<noscript>`
 * 要素を追加し、JS 無効ブラウザでアクセスした user に「JavaScript を
 * 有効にしてください」と graceful な fallback message を表示。
 *
 * 課題: 最強TODO は Next.js + React で全 page が JS 必須 (Server Action
 *   / TanStack Query / Zustand / SW 全て JS 依存)。JS 無効ブラウザ
 *   (NoScript extension / 一時的に JS off / privacy 設定) でアクセス
 *   すると、white screen + 何も起こらない silent failure になり、user
 *   は原因不明のまま離脱。`<noscript>` element 不在で informed な
 *   diagnostic message も表示されず。
 *
 * fix: layout.tsx の <body> 直下 (ThemeProvider 兄弟) に <noscript>
 *   element を追加 (1 file 数行)。<div> 内に destructive 色 + 中央
 *   寄せ + padding で目立たせ、「最強TODO は JavaScript を必要と
 *   します。ブラウザで JavaScript を有効にしてください。」を表示。
 *   JS 有効環境では <noscript> は browser が hide するので 99% user
 *   に影響なし、JS 無効 user にだけ informed な fallback を提供。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert + curl で <noscript>...</noscript>
 *   が rendered HTML に含まれることを確認。
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

  // <noscript> element が存在し、JS 必須 message を含むこと
  if (!/<noscript>[\s\S]+?最強TODO は JavaScript を必要とします[\s\S]+?<\/noscript>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <noscript> JS 必須 message 不在`,
    })
  } else {
    findings.push({ level: 'info', message: '<noscript> fallback OK' })
  }

  // <body> 直下 (ThemeProvider 兄弟) に配置されていること
  // 簡易判定: <body> tag と ThemeProvider tag の間に <noscript> が出現
  const bodyToProvider = src.match(/<body[\s\S]+?<ThemeProvider/)
  if (bodyToProvider && !/<noscript>/.test(bodyToProvider[0])) {
    findings.push({
      level: 'warning',
      message: `<noscript> が <body> 直下 (ThemeProvider 兄弟) に配置されていない`,
    })
  }

  // iter369 invariant 維持
  if (!/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: 'iter369 layout robots が消えた (regression)',
    })
  }

  console.log(`\n=== Findings (noscript-fallback-iter371) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
