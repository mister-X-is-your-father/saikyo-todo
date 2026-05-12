/**
 * Phase 6.15 loop iter 892 (mode-D Desktop a11y) —
 * auth (login + signup) page footer cross-link 内 visible を aria-hidden span
 * で wrap (iter800-891 sweep の続編、auth footer 完結 sweep)。
 *
 * 課題: login/page.tsx 行 28-35 の signup-link Link と signup/page.tsx 行 29-35
 *   の login Link は各 aria-label が完全文 ("アカウントをお持ちでない方は…" /
 *   "既にアカウントをお持ちの方は…") を含むのに、内側 visible "サインアップ" /
 *   "ログイン" は aria-hidden 無し → SR で重複読み上げ可能性。auth 2 page の
 *   cross-link を一括統一。
 *
 * fix (2 ファイル ~2 行差分):
 *   - login/page.tsx visible "サインアップ" を <span aria-hidden="true"> で wrap
 *   - signup/page.tsx visible "ログイン" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/889/890/891 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const lp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  const sp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')
  const loginPageOk = /<span aria-hidden="true">サインアップ<\/span>/.test(lp)
  const signupPageOk = /<span aria-hidden="true">ログイン<\/span>/.test(sp)
  if (loginPageOk && signupPageOk) {
    findings.push({
      level: 'info',
      message: `iter892: auth (login + signup) footer cross-link aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter892: 不完全 (login=${loginPageOk} signup=${signupPageOk})`,
    })
  }

  // iter891 invariant: workspace back link aria-hidden 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter891 invariant: workspace back link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter891 invariant: 破壊` })
  }

  // iter890 invariant: backlog row buttons aria-hidden 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter890 invariant: backlog row buttons aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter890 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter892) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
