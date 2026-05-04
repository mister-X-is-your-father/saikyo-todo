/**
 * Phase 6.15 loop iter 739 (mode-D Desktop a11y) —
 * mock-submit-form の hours field に format hint paragraph + aria-describedby を追加
 * (iter733race-738race の form hint pattern を mock-submit-form の数値 input に展開)。
 *
 * 課題: mock-submit-form.tsx 行 117-132 の hoursDecimal input は step=0.25 / min=0.25 /
 *   max=24 を強制するが、Label の「時間 (h, 0.25 刻み)」のみが visible で aria-describedby に
 *   紐付いていない。SR は input focus 時に bind された hint paragraph を読むので、Label の
 *   付随情報は aria-describedby で input に紐付ける必要がある。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<p id="tsHours-hint">0.25 刻み (15 分単位)、最小 0.25 (= 15 分)、最大 24 (= 24 時間)。例: 1.5 = 1 時間 30 分</p>` 追加
 *   - aria-describedby を error 有無問わず常に tsHours-hint を含む形に拡張
 *
 * 検証: source-side regex assert + iter727-738 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ms = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // 1. tsHours-hint paragraph 追加
  const hasHint =
    /<p id="tsHours-hint" className="text-muted-foreground text-xs">\s*\n\s*0\.25 刻み \(15 分単位\)、最小 0\.25 \(= 15 分\)、最大 24 \(= 24 時間\)。例: 1\.5 = 1 時間 30 分\s*\n\s*<\/p>/.test(
      ms,
    )
  // 2. aria-describedby が常に tsHours-hint を含む
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.hoursDecimal\s*\?\s*['"]tsHours-hint tsHours-error['"]\s*:\s*['"]tsHours-hint['"]/.test(
      ms,
    )
  // 3. iter739 説明 comment 存在
  const hasComment = /iter739: form hint pattern/.test(ms)

  if (hasHint && hasDescribedBy && hasComment) {
    findings.push({ level: 'info', message: `mock-submit hours-hint + describedby OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit hours-hint 不完全 (hint=${hasHint} desc=${hasDescribedBy} comment=${hasComment})`,
    })
  }

  // 4. iter738 race invariant: mock-login email-hint 維持
  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (
    /<p id="tsEmail-hint" className="text-muted-foreground text-xs">\s*\n\s*mock-timesheet 用 email/.test(
      ml,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter738 race invariant: mock-login email-hint 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter738 race invariant: 破壊` })
  }

  // 5. iter737 race invariant: login email-hint 維持
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

  // 6. iter736 race invariant: signup email-hint 維持
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

  // 7. iter735 race invariant: signup displayName-hint 維持
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

  console.log(`\n=== Findings (mock-submit-hours-hint-iter739) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
