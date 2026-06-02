/**
 * Phase 6.15 loop iter1687: signup-form の email hint が
 * 「ログイン用 Magic Link の送信先になります」 と表示していたが
 * signup は password 認証 (signInWithPassword) で Magic Link は使っていない。
 * UX 上ユーザに誤った mental model を植え付けるので「ログイン時の ID として
 * 使用します」 に訂正。同 sweep で login-form 内の同等コメント文字列も削除。
 *
 * 実行: pnpm tsx scripts/explore-uiux-signup-magic-link-correction-iter1687.ts
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
  const login = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')

  // 1. signup-form の email hint は Magic Link を語ってはならない (実装は password 認証)
  if (signup.includes('Magic Link')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form に "Magic Link" 文字列が残存 (signup は password 認証)',
    })
  }

  // 2. signup-form に新 hint 「ログイン時の ID として使用します」 が含まれる
  if (!signup.includes('ログイン時の ID として使用します')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form に正確な email hint (ログイン時の ID) が無い',
    })
  }

  // 3. login-form 側の「Magic Link 送信先」 comment 文字列も purge
  if (login.includes('Magic Link')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form に "Magic Link" 文字列が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — Magic Link 誤記が削除済み、signup email hint 訂正済み')
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
