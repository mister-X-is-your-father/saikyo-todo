/**
 * Phase 6.15 loop iter 740 (mode-D Desktop a11y) —
 * mock-submit-form の description field に format hint paragraph + aria-describedby を
 * 追加 (iter735race-739race の form hint pattern を 自由記述 input に展開)。
 *
 * 課題: mock-submit-form.tsx 行 102-114 の description input は schema で max 2000 文字を
 *   強制するが、その上限 / 例が hint として SR で見えない。Label「作業内容」だけでは
 *   何を書くべきか不明確。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<p id="tsDescription-hint">自由記述、最大 2000 文字。例: 「PR #123 review」「Item Y の調査」</p>` 追加
 *   - aria-describedby を error 有無問わず常に tsDescription-hint を含む形に拡張
 *
 * 検証: source-side regex assert + iter727-739 invariant cross-check。
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

  // 1. tsDescription-hint paragraph 追加
  const hasHint =
    /<p id="tsDescription-hint" className="text-muted-foreground text-xs">\s*\n\s*自由記述、最大 2000 文字。例: 「PR #123 review」「Item Y の調査」\s*\n\s*<\/p>/.test(
      ms,
    )
  // 2. aria-describedby が常に tsDescription-hint を含む
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.description\s*\n?\s*\?\s*['"]tsDescription-hint tsDescription-error['"]\s*\n?\s*:\s*['"]tsDescription-hint['"]/.test(
      ms,
    )
  // 3. iter740 説明 comment 存在
  const hasComment = /iter740: form hint pattern/.test(ms)

  if (hasHint && hasDescribedBy && hasComment) {
    findings.push({ level: 'info', message: `mock-submit description-hint + describedby OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit description-hint 不完全 (hint=${hasHint} desc=${hasDescribedBy} comment=${hasComment})`,
    })
  }

  // 4. iter739 race invariant: tsHours-hint 維持
  if (
    /<p id="tsHours-hint" className="text-muted-foreground text-xs">\s*\n\s*0\.25 刻み \(15 分単位\)/.test(
      ms,
    )
  ) {
    findings.push({ level: 'info', message: `iter739 race invariant: tsHours-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter739 race invariant: 破壊` })
  }

  // 5. iter738 race invariant: mock-login email-hint 維持
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

  // 6. iter737 race invariant: login email-hint 維持
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

  // 7. iter733 race invariant: ws-slug-hint 維持
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    /<p id="ws-slug-hint" className="text-muted-foreground text-xs">\s*\n\s*小文字 \(a-z\) \/ 数字 \/ ハイフンのみ/.test(
      cwf,
    )
  ) {
    findings.push({ level: 'info', message: `iter733 race invariant: ws-slug-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter733 race invariant: 破壊` })
  }

  console.log(`\n=== Findings (mock-submit-description-hint-iter740) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
