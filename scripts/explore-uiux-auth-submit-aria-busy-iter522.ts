/**
 * Phase 6.15 loop iter 522 (mode-D Desktop a11y) —
 * LoginForm + SignupForm submit Button に aria-busy + data-testid を補完
 * (iter521 create-workspace pattern を 2 件水平展開)。
 *
 * 課題: login-form.tsx 行 98-105 と signup-form.tsx 行 128-135 の submit Button は
 *   aria-label はあるが aria-busy 不在 (= SR が pending 状態を識別不能) +
 *   data-testid 不在 (= Playwright 経由 hook 不可)。両方とも onboarding の最重要
 *   entry point で他 form (create-workspace iter521 / workflows / source 等) と
 *   UX 規約から乖離。
 *
 * fix (2 ファイル ~4 行差分):
 *   - aria-busy={isPending || undefined}
 *   - data-testid="login-submit" / "signup-submit"
 *
 * 機能不変、視覚 layout 不変 (h-11 w-full 維持)、shadcn 編集なし、disabled / type=submit /
 * aria-label / iter319 (form 全体 aria-busy) invariant 維持。
 *
 * 検証: source-side regex assert + iter521 invariant cross-check。
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
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')

  // 1. login-form submit aria-busy + data-testid
  if (/aria-busy=\{isPending \|\| undefined\}/.test(lf) && /data-testid="login-submit"/.test(lf)) {
    findings.push({
      level: 'info',
      message: `login-form.tsx: submit aria-busy + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login-form.tsx: submit aria-busy / data-testid 不在`,
    })
  }

  // 2. signup-form submit aria-busy + data-testid
  if (/aria-busy=\{isPending \|\| undefined\}/.test(sf) && /data-testid="signup-submit"/.test(sf)) {
    findings.push({
      level: 'info',
      message: `signup-form.tsx: submit aria-busy + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-form.tsx: submit aria-busy / data-testid 不在`,
    })
  }

  // 3. login-form 既存 aria-label 維持
  if (/aria-label=\{isPending \? 'ログイン中… \(認証処理を実行中\)' : undefined\}/.test(lf)) {
    findings.push({
      level: 'info',
      message: `login-form.tsx: 既存 aria-label (pending 時のみ) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login-form.tsx: 既存 aria-label 破壊`,
    })
  }

  // 4. signup-form 既存 aria-label 維持
  if (
    /aria-label=\{isPending \? 'アカウント作成中…' : 'アカウントを作成 \(サインアップ\)'\}/.test(sf)
  ) {
    findings.push({
      level: 'info',
      message: `signup-form.tsx: 既存 aria-label (動的) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-form.tsx: 既存 aria-label 破壊`,
    })
  }

  // 5. iter521 invariant: create-workspace-form submit aria 維持
  const cw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    /data-testid="create-workspace-submit"/.test(cw) &&
    /aria-busy=\{isPending \|\| undefined\}/.test(cw)
  ) {
    findings.push({
      level: 'info',
      message: `iter521 invariant: create-workspace-form submit aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter521 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (auth-submit-aria-busy-iter522) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
