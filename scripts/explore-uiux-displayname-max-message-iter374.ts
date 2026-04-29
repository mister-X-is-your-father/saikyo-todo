/**
 * Phase 6.15 loop iter 374 — `SignupInputSchema.displayName.max(50)` に
 * Japanese custom error message を追加。zod default ("String must contain
 * at most 50 character(s)") が英語で出ていた問題を解消。
 *
 * 課題: src/features/auth/schema.ts の SignupInputSchema は他 field
 *   (email / password / displayName.min(1)) には Japanese error message
 *   が設定されているが、`displayName.max(50)` のみ message 引数なしで
 *   zod default の英語 error が表示されていた。51 文字以上の displayName
 *   を入力した user に英語 error が出るのは i18n 不整合。
 *
 * fix: schema.ts の displayName chain を multi-line に展開し、
 *   `.max(50, '表示名は 50 文字以内で入力してください')` に変更
 *   (1 file 数行差替)。他 field と error message style を統一。zod v4
 *   error は signup-form.tsx の `<p role="alert">` で表示されるため、
 *   即時 Japanese display が反映される。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
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
  const target = 'src/features/auth/schema.ts'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/\.max\(50, '表示名は 50 文字以内で入力してください'\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: displayName.max(50) Japanese custom error message 不在`,
    })
  } else {
    findings.push({ level: 'info', message: 'displayName.max(50) Japanese message OK' })
  }

  // 既存 schema invariant 維持
  const invariants = [
    [
      /email: z\.string\(\)\.trim\(\)\.email\('正しいメールアドレスを入力してください'\)/,
      'email schema',
    ],
    [/password: z\.string\(\)\.min\(8, 'パスワードは 8 文字以上'\)/, 'signup password schema'],
    [/\.min\(1, '表示名を入力してください'\)/, 'displayName.min(1) message'],
    [/password: z\.string\(\)\.min\(1, 'パスワードを入力してください'\)/, 'login password schema'],
  ] as const
  for (const [re, label] of invariants) {
    if (!re.test(src)) {
      findings.push({ level: 'warning', message: `${label} が消えた (regression)` })
    }
  }

  console.log(`\n=== Findings (displayname-max-message-iter374) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
