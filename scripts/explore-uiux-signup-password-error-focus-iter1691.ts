/**
 * Phase 6.15 loop iter1691: signup-form の server error focus を password-aware 化。
 *
 * 旧実装は server error 種別を問わず `form.setFocus('email')` だったため、
 * Supabase が「パスワードは 8 文字以上で設定してください」 (mapAuthError 由来) を
 * 返した時にも email field に focus が当たり、ユーザは「どこを直せばいいか」 が
 * 即座に分からない (toast を読まないと駄目)。
 *
 * 修正: error message に「パスワード」 を含むなら password、それ以外は email に focus。
 *
 * 実行: pnpm tsx scripts/explore-uiux-signup-password-error-focus-iter1691.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const signup = readFileSync(resolve(here, '../src/components/auth/signup-form.tsx'), 'utf8')

  // 1. password-aware focus 分岐が存在
  if (!signup.includes("result.error.message.includes('パスワード') ? 'password' : 'email'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form の server error focus に password-aware 分岐が無い',
    })
  }

  // 2. 旧 unconditional `form.setFocus('email')` (onSubmit 内) が残存していない
  // 注: onInvalid 側は firstError ベースなので別行で残るのが正しい
  const onSubmitBlock = signup.match(/function onSubmit[\s\S]*?function onInvalid/)?.[0] ?? ''
  if (
    onSubmitBlock.includes("form.setFocus('email')") &&
    !onSubmitBlock.includes("? 'password' : 'email'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form の onSubmit に unconditional form.setFocus("email") が残存',
    })
  }

  // 3. mapAuthError の「パスワードは 8 文字以上で設定してください」 message が
  //    今後変わると本 fix が機能しなくなるので invariant に固定
  const actions = readFileSync(resolve(here, '../src/features/auth/actions.ts'), 'utf8')
  if (!actions.includes('パスワードは 8 文字以上で設定してください')) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message:
        'mapAuthError から「パスワードは...」 message が消失 (signup-form の password-aware 分岐が無効化される可能性)',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — signup-form の server error focus が password-aware')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
