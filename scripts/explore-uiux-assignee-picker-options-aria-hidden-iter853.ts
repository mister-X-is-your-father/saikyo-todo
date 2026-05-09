/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * assignee-picker CommandItem (member + agent) visible {label} を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/assignee-picker.tsx の member CommandItem (行 132-150)
 *   と agent CommandItem (行 161-181) は iter649 で動的 aria-label を持つようになった
 *   が、visible {label} は aria-hidden 無しで残っており SR は「label」 と
 *   「『label』をアサイン中 (クリックで解除)」 を 2 経路で読み上げ重複。iter844 / iter845 /
 *   iter848 / iter849 / iter850 / iter851 / iter852 と同 vocabulary。
 *
 * fix (1 ファイル +2/-2 行):
 *   - member CommandItem: <span aria-hidden="true">{label}</span>
 *   - agent CommandItem: <span aria-hidden="true">{label}</span>
 *
 * 検証: source-side regex assert + iter649 / iter768 / iter801 / iter851 / iter852
 *   invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )

  // iter853 fix: 2 CommandItem (member + agent) visible {label} を aria-hidden span で wrap
  const ahLabelCount = (ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length
  if (ahLabelCount >= 2) {
    findings.push({
      level: 'info',
      message: `iter853: assignee-picker {label} aria-hidden span count=${ahLabelCount} (>=2: member + agent) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter853: assignee-picker {label} aria-hidden span count=${ahLabelCount} (<2)`,
    })
  }

  // iter649 invariant: dynamic aria-label (member + agent)
  if (
    /`「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(ap) &&
    /`「\$\{label\}」をアサインする`/.test(ap) &&
    /`AI Agent「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(ap) &&
    /`AI Agent「\$\{label\}」をアサインする`/.test(ap)
  ) {
    findings.push({
      level: 'info',
      message: `iter649 invariant: assignee-picker member + agent dynamic aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter649 invariant: 破壊` })
  }

  // iter768 invariant: CommandInput aria-label
  if (/aria-label="アサイン候補を検索 \(workspace メンバー \/ AI Agent\)"/.test(ap)) {
    findings.push({
      level: 'info',
      message: `iter768 invariant: assignee-picker CommandInput aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter768 invariant: 破壊` })
  }

  // iter801 invariant: trigger button + selected labels aria-hidden
  if (
    /data-testid="assignee-picker-trigger"/.test(ap) &&
    /aria-haspopup="listbox"/.test(ap) &&
    /<UserIcon className="size-4" aria-hidden="true" \/>/.test(ap)
  ) {
    findings.push({
      level: 'info',
      message: `iter801 invariant: assignee-picker trigger button + UserIcon aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter801 invariant: 破壊` })
  }

  // iter851 invariant: login page signup-link aria-hidden
  const loginPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  if (
    /data-testid="signup-link"[\s\S]*?<span aria-hidden="true">サインアップ<\/span>/.test(loginPage)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: login page signup-link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter852 invariant: signup page login-link aria-hidden
  const signupPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')
  if (
    /aria-label="既にアカウントをお持ちの方はこちらでログイン"[\s\S]*?<span aria-hidden="true">ログイン<\/span>/.test(
      signupPage,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: signup page login-link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  console.log(`\n=== Findings (assignee-picker-options-aria-hidden-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
