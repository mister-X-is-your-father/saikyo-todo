/**
 * Phase 6.15 loop iter 376 — `loginAction` / `signupAction` に
 * `mapAuthError` helper を導入し、Supabase Auth の英語 error
 * message ("Invalid login credentials" / "User already registered"
 * 等) を Japanese に変換して user toast に表示。iter374 の zod
 * error i18n を server action 経路にも展開。
 *
 * 課題: src/features/auth/actions.ts の loginAction line 35:
 *   `if (error) return err(new AuthError(error.message))` で Supabase
 *   error.message を **そのまま** AuthError に詰める。Supabase auth は
 *   英語 error ("Invalid login credentials") を返し、login-form.tsx
 *   の `toast.error(result.error.message)` でこれを user に英語表示。
 *   日本語 user に英語 error が出る i18n 不整合。signupAction も同様。
 *
 * fix: actions.ts の冒頭に `function mapAuthError(msg: string): string`
 *   helper を追加 (15 行)、common Supabase error → Japanese mapping を
 *   regex match で実装。マッチしないものは原文 fallback。loginAction
 *   と signupAction の `error.message` 引数を `mapAuthError(error.message)`
 *   に置換 (2 行差替)。toast に出る error が:
 *     - "Invalid login credentials"
 *       → "メールアドレスまたはパスワードが正しくありません"
 *     - "User already registered"
 *       → "このメールアドレスは既に登録されています"
 *     - "Email rate limit exceeded"
 *       → "短時間に多くの試行がありました。しばらく時間をおいて..."
 *     - "Email not confirmed"
 *       → "メールアドレスの確認が完了していません..."
 *     - "Password should be at least"
 *       → "パスワードは 8 文字以上で設定してください"
 *
 * 機能追加なし (動作変更なし、user 視点 string 表示のみ Japanese 化)、
 * shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert で codify。
 *   実際の Supabase error 受信は cloud env で Supabase 不在のため
 *   integration test は無理、unit-level の helper 関数 audit で代替。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/features/auth/actions.ts'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // mapAuthError helper の存在
  if (!/function mapAuthError\(msg: string\): string \{/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: mapAuthError helper 不在`,
    })
  } else {
    findings.push({ level: 'info', message: 'mapAuthError helper OK' })
  }

  // 主要 mapping cases が含まれていること
  const cases = [
    [/Invalid login credentials/, 'invalid-credentials'],
    [/User already registered/, 'already-registered'],
    [/Email rate limit exceeded/, 'rate-limit'],
    [/Email not confirmed/, 'email-not-confirmed'],
    [/Password should be at least/, 'password-min'],
  ] as const
  for (const [re, label] of cases) {
    if (!re.test(src)) {
      findings.push({ level: 'warning', message: `mapAuthError: ${label} mapping 不在` })
    }
  }

  // signupAction / loginAction で mapAuthError 経由になっていること
  if (!/new ExternalServiceError\('Supabase Auth', mapAuthError\(error\.message\)\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: 'signupAction: mapAuthError 経由になっていない',
    })
  }
  if (!/new AuthError\(mapAuthError\(error\.message\)\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: 'loginAction: mapAuthError 経由になっていない',
    })
  }

  console.log(`\n=== Findings (auth-error-i18n-iter376) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
