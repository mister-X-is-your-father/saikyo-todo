/**
 * Phase 6.15 loop iter 738 (mode-D Desktop a11y) —
 * mock-login-form の email field に format hint paragraph + aria-describedby を追加
 * (signup-form iter735 race / iter736 race / login-form iter737 race と同 pattern を
 * mock-timesheet form に展開)。
 *
 * 課題: mock-login-form.tsx 行 50-64 の email input は zod で email 形式を強制するが、
 *   想定用途 / seed 値が hint として SR で見えない。同 file 末尾 (行 90-92) に seed 値
 *   `ops@example.com` を visible に書いてあるが SR は input 内の hint として知るべき。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<p id="tsEmail-hint">mock-timesheet 用 email。例: ops@example.com (フォーム下の seed 参照)</p>` 追加
 *   - aria-describedby を error 有無問わず常に tsEmail-hint を含む形に拡張
 *
 * 検証: source-side regex assert + iter727-737 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )

  // 1. tsEmail-hint paragraph 追加
  const hasHint =
    /<p id="tsEmail-hint" className="text-muted-foreground text-xs">\s*\n\s*mock-timesheet 用 email。例: ops@example\.com \(フォーム下の seed 参照\)\s*\n\s*<\/p>/.test(
      ml,
    )
  // 2. aria-describedby が常に tsEmail-hint を含む
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.email\s*\?\s*['"]tsEmail-hint tsEmail-error['"]\s*:\s*['"]tsEmail-hint['"]/.test(
      ml,
    )
  // 3. iter738 説明 comment 存在
  const hasComment = /iter738: signup-form \/ login-form/.test(ml)

  if (hasHint && hasDescribedBy && hasComment) {
    findings.push({ level: 'info', message: `mock-login email-hint + describedby OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login email-hint 不完全 (hint=${hasHint} desc=${hasDescribedBy} comment=${hasComment})`,
    })
  }

  // 4. iter737 race invariant: login email-hint 維持
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (
    /<p id="login-email-hint" className="text-muted-foreground text-xs">\s*\n\s*サインアップ時に登録したメールアドレス/.test(
      lf,
    )
  ) {
    findings.push({ level: 'info', message: `iter737 race invariant: login email-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter737 race invariant: 破壊` })
  }

  // 5. iter736 race invariant: signup email-hint 維持
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

  // 6. iter735 race invariant: signup displayName-hint 維持
  if (
    /<p id="displayName-hint" className="text-muted-foreground text-xs">\s*\n\s*チームメンバーに表示される名前/.test(
      sf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter735 race invariant: signup displayName-hint 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 race invariant: 破壊` })
  }

  // 7. iter733 race invariant: ws-slug-hint 維持
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    /<p id="ws-slug-hint" className="text-muted-foreground text-xs">\s*\n\s*小文字 \(a-z\) \/ 数字 \/ ハイフンのみ。最大 50 文字。例: team-a/.test(
      cwf,
    )
  ) {
    findings.push({ level: 'info', message: `iter733 race invariant: ws-slug-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter733 race invariant: 破壊` })
  }

  console.log(`\n=== Findings (mock-login-email-hint-iter738) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
