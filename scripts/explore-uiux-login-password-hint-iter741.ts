/**
 * Phase 6.15 loop iter 741 (mode-D Desktop a11y) —
 * login-form の password field に format hint paragraph + aria-describedby を追加
 * (iter733race-740race の form hint pattern を login password にも適用)。
 *
 * 課題: login-form.tsx 行 86-103 の password input は zod で min 1 を強制する
 *   (login は「設定済かどうか」 が validate target で文字数 hint は signup 側で済)。
 *   それでも SR ユーザは aria-describedby に bind された hint がないと「サインアップ時の
 *   パスワードと同じ」 mental model を input single focus で取りにくい。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<p id="login-password-hint">サインアップ時に設定したパスワード (8 文字以上)。
 *     忘れた場合は再サインアップ。</p>` 追加
 *   - aria-describedby を error 有無問わず常に login-password-hint を含む形に拡張
 *
 * 検証: source-side regex assert + iter727-740 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')

  // 1. login-password-hint paragraph 追加
  const hasHint =
    /<p id="login-password-hint" className="text-muted-foreground text-xs">\s*\n\s*サインアップ時に設定したパスワード \(8 文字以上\)。忘れた場合は再サインアップ。\s*\n\s*<\/p>/.test(
      lf,
    )
  // 2. aria-describedby が常に login-password-hint を含む
  //    iter1715: error id を `password-error` → `login-password-error` に prefix 統一したので regex 追従。
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.password\s*\n?\s*\?\s*['"]login-password-hint login-password-error['"]\s*\n?\s*:\s*['"]login-password-hint['"]/.test(
      lf,
    )
  // 3. iter741 説明 comment 存在
  const hasComment = /iter741: form hint pattern.*login password/.test(lf)

  if (hasHint && hasDescribedBy && hasComment) {
    findings.push({ level: 'info', message: `login password-hint + describedby OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `login password-hint 不完全 (hint=${hasHint} desc=${hasDescribedBy} comment=${hasComment})`,
    })
  }

  // 4. iter740 race invariant: mock-submit description-hint 維持
  const ms = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (
    /<p id="tsDescription-hint" className="text-muted-foreground text-xs">\s*\n\s*自由記述、最大 2000 文字/.test(
      ms,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter740 race invariant: mock-submit description-hint 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter740 race invariant: 破壊` })
  }

  // 5. iter739 race invariant: tsHours-hint 維持
  if (
    /<p id="tsHours-hint" className="text-muted-foreground text-xs">\s*\n\s*0\.25 刻み \(15 分単位\)/.test(
      ms,
    )
  ) {
    findings.push({ level: 'info', message: `iter739 race invariant: tsHours-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter739 race invariant: 破壊` })
  }

  // 6. iter737 race invariant: login email-hint 維持 (同 file 別 field)
  if (
    /<p id="login-email-hint" className="text-muted-foreground text-xs">\s*\n\s*サインアップ時に登録したメールアドレス/.test(
      lf,
    )
  ) {
    findings.push({ level: 'info', message: `iter737 race invariant: login email-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter737 race invariant: 破壊` })
  }

  // 7. iter736 race invariant: signup email-hint 維持
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (
    /<p id="signup-email-hint" className="text-muted-foreground text-xs">\s*\n\s*ログイン用 Magic Link の送信先になります/.test(
      sf,
    )
  ) {
    findings.push({ level: 'info', message: `iter736 race invariant: signup email-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter736 race invariant: 破壊` })
  }

  console.log(`\n=== Findings (login-password-hint-iter741) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
