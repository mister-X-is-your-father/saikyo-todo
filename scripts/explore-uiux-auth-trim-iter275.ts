/**
 * Phase 6.15 loop iter 275 — login/signup schema の trim 探索。
 *
 * 現状: zod schema は `email: z.string().email(...)` / `displayName:
 * z.string().min(1).max(50)`。input type=email は browser が trim する
 * ものの、displayName (type=text) はユーザが paste した先頭末尾スペースが
 * そのまま残り、submit で server に汚染値が届く ("  Hiro Tanaka  " として
 * 保存される)。email も schema 層で defensive に trim しておくと server
 * 側 RPC でズレが出ない。
 *
 * 期待 (fix 後):
 *   - SignupInputSchema: email/displayName に .trim() を chain
 *   - LoginInputSchema: email に .trim() を chain
 *   - password は trim しない (intentional 末尾スペースを許容)
 *
 * 検証: zod parse を直接呼ぶ unit-style assert (Playwright dom 経由ではなく
 * schema を直 import)。
 *
 *   pnpm tsx scripts/explore-uiux-auth-trim-iter275.ts
 */
import { LoginInputSchema, SignupInputSchema } from '@/features/auth/schema'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // Signup: displayName trim
  const sup = SignupInputSchema.safeParse({
    email: 'foo@example.com',
    password: 'abcdefgh',
    displayName: '  Hiro Tanaka  ',
  })
  findings.push({
    level: 'info',
    message: `signup parse "  Hiro Tanaka  " → displayName=${JSON.stringify(sup.success && sup.data.displayName)}`,
  })
  if (!sup.success || sup.data.displayName !== 'Hiro Tanaka') {
    findings.push({
      level: 'warning',
      message: `signup displayName が trim されていない — schema に .trim() 不在`,
    })
  }

  // Signup: email trim
  const sup2 = SignupInputSchema.safeParse({
    email: ' foo@example.com ',
    password: 'abcdefgh',
    displayName: 'X',
  })
  findings.push({
    level: 'info',
    message: `signup parse " foo@example.com " → email=${JSON.stringify(sup2.success && sup2.data.email)}`,
  })
  if (!sup2.success || sup2.data.email !== 'foo@example.com') {
    findings.push({
      level: 'warning',
      message: `signup email が trim されていない`,
    })
  }

  // Login: email trim
  const lg = LoginInputSchema.safeParse({
    email: ' bar@example.com ',
    password: 'whatever',
  })
  findings.push({
    level: 'info',
    message: `login parse " bar@example.com " → email=${JSON.stringify(lg.success && lg.data.email)}`,
  })
  if (!lg.success || lg.data.email !== 'bar@example.com') {
    findings.push({
      level: 'warning',
      message: `login email が trim されていない`,
    })
  }

  // Password should NOT be trimmed
  const lg2 = LoginInputSchema.safeParse({
    email: 'a@b.co',
    password: '  pw  ',
  })
  findings.push({
    level: 'info',
    message: `login parse "  pw  " → password=${JSON.stringify(lg2.success && lg2.data.password)}`,
  })
  if (!lg2.success || lg2.data.password !== '  pw  ') {
    findings.push({
      level: 'warning',
      message: `login password が trim されている — intentional 末尾 space を消す regression`,
    })
  }

  console.log(`\n=== Findings (auth-trim-iter275) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
