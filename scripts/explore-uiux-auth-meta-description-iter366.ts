/**
 * Phase 6.15 loop iter 366 — login / signup page に page-specific
 * `description` metadata を追加。layout.tsx 由来の generic
 * "チーム共有 AI 駆動 TODO" がそのまま `<meta name="description">` に
 * inherit されていたため、search engine / social link preview / SEO
 * snippet で全 page が同じ description で表示される問題を解消。
 *
 * 課題: iter258 で title metadata は "ログイン | 最強TODO" /
 *   "サインアップ | 最強TODO" に固有化済みだったが、description は
 *   layout 継承で全 page が同じ汎用文言だった。share 時 (Slack /
 *   Twitter / LinkedIn) の preview で「メールアドレスとパスワードで
 *   ログイン」「サインアップで開始」のような page 固有の文脈が
 *   伝わらない。
 *
 * fix: 両 page の metadata object に description property を追加
 *   (2 file × 1 行)。Next.js App Router で page metadata は layout
 *   metadata を override するため、page-specific description が
 *   優先される。
 *   - login: "最強TODO のログイン画面。メールアドレスとパスワード
 *           でサインイン。"
 *   - signup: "最強TODO のサインアップ画面。新規アカウント作成
 *            (表示名 + メールアドレス + 8文字以上のパスワード)。"
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。
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

  const cases = [
    {
      file: 'src/app/(auth)/login/page.tsx',
      mustContain: /description: '最強TODO のログイン画面/,
      label: 'login description metadata',
    },
    {
      file: 'src/app/(auth)/signup/page.tsx',
      mustContain: /description: '最強TODO のサインアップ画面/,
      label: 'signup description metadata',
    },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(process.cwd(), c.file), 'utf8')
    if (!c.mustContain.test(src)) {
      findings.push({ level: 'warning', message: `${c.file}: ${c.label} 不在` })
    } else {
      findings.push({ level: 'info', message: `${c.file}: ${c.label} OK` })
    }
    // iter258 invariant 維持: title metadata
    if (!/title: '(ログイン|サインアップ) \| 最強TODO'/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${c.file}: title metadata が消えた (iter258 regression)`,
      })
    }
  }

  console.log(`\n=== Findings (auth-meta-description-iter366) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
