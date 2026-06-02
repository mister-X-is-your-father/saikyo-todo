/**
 * Phase 6.15 loop iter1693: signup password error message を「で入力してください」
 * 付き form に統一。
 *
 * SignupInputSchema の password error は「パスワードは 8 文字以上」 と動詞抜けで、
 * displayName error「表示名を入力してください」 / email error「正しいメールアドレスを
 * 入力してください」 と一貫していなかった。SR / 視覚 両方で 3 field 同一 cadence
 * の「<field>を/は<制約>で入力してください」 pattern に揃え、ユーザは error
 * announcement で次にする action を即理解できる。
 *
 * 実行: pnpm tsx scripts/explore-uiux-signup-password-error-msg-iter1693.ts
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

  const schema = readFileSync(resolve(here, '../src/features/auth/schema.ts'), 'utf8')

  // 旧 message が残存していない
  if (
    schema.includes("'パスワードは 8 文字以上'") ||
    schema.includes('"パスワードは 8 文字以上"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'SignupInputSchema に旧 password error 「パスワードは 8 文字以上」 (動詞抜け) が残存',
    })
  }

  // 新 message が存在
  if (!schema.includes('パスワードは 8 文字以上で入力してください')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'SignupInputSchema に新 password error 「...で入力してください」 が無い',
    })
  }

  // displayName / email error が「...入力してください」 cadence を維持
  for (const expected of [
    '表示名を入力してください',
    '正しいメールアドレスを入力してください',
    '表示名は 50 文字以内で入力してください',
  ]) {
    if (!schema.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `SignupInputSchema の error message cadence 不一致: 「${expected}」 が消失`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — SignupInputSchema 3 field の error message が同一 cadence')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
