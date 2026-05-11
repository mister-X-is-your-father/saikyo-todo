/**
 * Phase 6.15 loop iter 885 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * login/signup page CardFooter Link visible を aria-hidden span に統合 (一括 2 件)。
 *
 * 課題: src/app/(auth)/login/page.tsx + signup/page.tsx の CardFooter Link は
 *   visible "サインアップ" / "ログイン" を直接 children として出していたが、
 *   aria-label がそれぞれ完全 content 包含 → SR 再 announce、auth navigation 切替頻繁。
 *
 * fix (2 ファイル各 1 行差分):
 *   - 各 visible を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter884/883/882/851 invariant cross-check。
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
  if (/<span aria-hidden="true">サインアップ<\/span>/.test(lp)) {
    findings.push({
      level: 'info',
      message: `login page CardFooter サインアップ Link aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `login page サインアップ 未統合` })
  }

  const sp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">ログイン<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `signup page CardFooter ログイン Link aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `signup page ログイン 未統合` })
  }

  // iter884 invariant: root page ログアウト
  const rp = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(rp)) {
    findings.push({
      level: 'info',
      message: `iter884 invariant: root page ログアウト 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter884 invariant: 破壊` })
  }

  // iter883 invariant: subpages href
  const sub = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (/<Link href=\{`\/\$\{workspaceId\}`\} aria-label="Workspace ホームへ戻る"/.test(sub)) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: subpages href 維持 OK (sprints sample)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (auth-page-footer-link-aria-hidden-iter885) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
