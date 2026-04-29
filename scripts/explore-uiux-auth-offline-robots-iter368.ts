/**
 * Phase 6.15 loop iter 368 — auth (login/signup) + offline page に
 * `robots: { index: false, follow: false }` metadata を追加。CLAUDE.md
 * 記載の「社内チーム利用・社外非公開」プロジェクトとして、search engine
 * (Google / Bing / Baidu 等) のクローラに **これら fallback / 認証 page
 * を index しない** よう明示的に指示。
 *
 * 課題: iter258 (title) + iter366/367 (description) で metadata は固有化
 *   されたが、search engine 制御の `robots` directive 不在。社外非公開
 *   想定の internal team app では、login / signup / offline 画面が
 *   search engine に index されると以下の問題:
 *     - 社外ユーザーが /login にアクセス試行 → useless (account 必要)
 *     - signup URL が漏洩 → 想定外の bot signup attempt 誘発
 *     - SEO 観点でも、認証画面が main page より上位に出ると confusing
 *
 * fix: 3 page の metadata object に `robots: { index: false, follow: false }`
 *   を追加 (3 file × 1 行)。Next.js App Router metadata helper が
 *   `<meta name="robots" content="noindex, nofollow">` に変換する。
 *   index=false で page 自体を index しない、follow=false で page 内
 *   link を crawler が辿らない (auth flow のリンク経由で workspace
 *   pages に流出するのを防ぐ二重ガード)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル。
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

  const cases = [
    { file: 'src/app/(auth)/login/page.tsx', label: 'login' },
    { file: 'src/app/(auth)/signup/page.tsx', label: 'signup' },
    { file: 'src/app/~offline/page.tsx', label: 'offline' },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(process.cwd(), c.file), 'utf8')
    if (!/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${c.file}: robots metadata 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `${c.label}: robots metadata OK` })
    }
    // iter258 + iter366/367 invariant 維持
    if (!/title:/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${c.file}: title metadata が消えた (iter258 regression)`,
      })
    }
    if (!/description:/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${c.file}: description metadata が消えた (iter366/367 regression)`,
      })
    }
  }

  console.log(`\n=== Findings (auth-offline-robots-iter368) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
