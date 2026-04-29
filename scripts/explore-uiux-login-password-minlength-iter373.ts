/**
 * Phase 6.15 loop iter 373 — login form の password input から
 * `minLength={8}` を削除し、schema (`.min(1)`) と input attribute を
 * 整合。SR ユーザに misleading な「min length 8」hint が読み上げられて
 * いた問題を解消。
 *
 * 課題: src/features/auth/schema.ts の LoginInputSchema は
 *   `password: z.string().min(1, 'パスワードを入力してください')` で
 *   1 文字以上の任意 password を許容 (既存 user の legacy 短い password
 *   で login できるよう意図的に min=1)。一方 login-form.tsx の password
 *   IMEInput は `minLength={8}` を持っていた (signup form の copy-paste
 *   artifact と推測)。`<form noValidate>` で HTML 側 validation は
 *   suppressed なので 7 文字 password でも実際は提出可能だが、SR は
 *   `<input minLength=8>` を「min length 8」と読み上げる misleading な
 *   hint を user に与えていた (実際は 1 文字でも OK)。
 *
 * fix: login-form.tsx の password IMEInput から `minLength={8}` 行を削除
 *   (1 file 1 行削除)。schema 側の `.min(1)` が単一 source of truth と
 *   なり、SR hint は input の base attribute (required + aria-required)
 *   のみで「必須だが長さ制限は schema 側」を正しく伝える。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert + curl で <input minLength=*> 不在を確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/auth/login-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // password input block を抽出
  const pwdBlock = src.match(/id="password"[\s\S]+?\.\.\.form\.register\('password'\)[\s\S]+?\/>/)
  if (!pwdBlock) {
    findings.push({ level: 'error', message: `${target}: password input block 不在` })
  } else {
    if (/minLength=\{8\}/.test(pwdBlock[0])) {
      findings.push({
        level: 'warning',
        message: `password input: minLength={8} が残存 (削除されていない)`,
      })
    } else {
      findings.push({ level: 'info', message: `password input: minLength removal OK` })
    }
    // 既存 invariant 維持
    const invariants = [
      [/autoComplete="current-password"/, 'autoComplete'],
      [/enterKeyHint="send"/, 'enterKeyHint'],
      [/required/, 'required'],
      [/aria-required="true"/, 'aria-required'],
    ] as const
    for (const [re, label] of invariants) {
      if (!re.test(pwdBlock[0])) {
        findings.push({
          level: 'warning',
          message: `password input: ${label} が消えた (regression)`,
        })
      }
    }
  }

  // schema 側の .min(1) が維持されていること (single source of truth)
  const schema = readFileSync(resolve(process.cwd(), 'src/features/auth/schema.ts'), 'utf8')
  if (!/password: z\.string\(\)\.min\(1, /.test(schema)) {
    findings.push({
      level: 'warning',
      message:
        'src/features/auth/schema.ts: LoginInputSchema password.min(1) が消えた (schema regression)',
    })
  }

  console.log(`\n=== Findings (login-password-minlength-iter373) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
