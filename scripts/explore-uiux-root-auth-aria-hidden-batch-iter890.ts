/**
 * Phase 6.15 loop iter 890 (mode-D Desktop a11y) —
 * 3 surface (root home logout / login signup-link / signup login-link) の visible
 * aria-hidden 統合 (一括 campaign 拡張)。
 *
 * 課題:
 *   - src/app/page.tsx logout-btn (visible "ログアウト") aria-label 適合だったが iter844-889
 *     campaign 規約 (visible aria-hidden 単独経路) から外れていた
 *   - src/app/(auth)/login/page.tsx signup-link (visible "サインアップ") 同上
 *   - src/app/(auth)/signup/page.tsx login Link (visible "ログイン") 同上
 *
 * fix (3 ファイル / +3-3 行差分、3 element 一括):
 *   - root logout-btn: <Button>ログアウト</Button> → <Button><span aria-hidden="true">ログアウト</span></Button>
 *   - login signup-link: <Link>サインアップ</Link> → <Link><span aria-hidden="true">サインアップ</span></Link>
 *   - signup login Link: <Link>ログイン</Link> → <Link><span aria-hidden="true">ログイン</span></Link>
 *
 * 検証: source-side regex assert + iter888/889 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const root = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  const lp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  const sp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')

  // 1. root logout-btn visible aria-hidden
  if (/data-testid="logout-btn"[\s\S]+?<span aria-hidden="true">ログアウト<\/span>/.test(root)) {
    findings.push({
      level: 'info',
      message: `root logout-btn visible 'ログアウト' span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `root logout-btn visible aria-hidden 未統合`,
    })
  }

  // 2. login signup-link visible aria-hidden
  if (/data-testid="signup-link"[\s\S]+?<span aria-hidden="true">サインアップ<\/span>/.test(lp)) {
    findings.push({
      level: 'info',
      message: `login signup-link visible 'サインアップ' span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login signup-link visible aria-hidden 未統合`,
    })
  }

  // 3. signup login Link visible aria-hidden
  if (/<span aria-hidden="true">ログイン<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `signup login Link visible 'ログイン' span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup login Link visible aria-hidden 未統合`,
    })
  }

  // iter889 invariant: offline retry-button
  const rb = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `iter889 invariant: offline retry-button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter889 invariant: offline retry 破壊` })
  }

  // iter888 invariant: create-workspace Unicode
  const cw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '作成中…' : '作成'\}<\/span>/.test(cw)) {
    findings.push({
      level: 'info',
      message: `iter888 invariant: create-workspace Unicode 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter888 invariant: create-workspace 破壊` })
  }

  console.log(`\n=== Findings (root-auth-aria-hidden-batch-iter890) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
