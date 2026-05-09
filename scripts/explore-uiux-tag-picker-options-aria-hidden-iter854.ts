/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * tag-picker CommandItem visible {t.name} を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/tag-picker.tsx 行 132-156 の tag CommandItem は
 *   動的 aria-label「タグ『t.name』を付与中 (クリックで解除)」 / 「タグ『t.name』を付与する」
 *   が完全 content を含むのに visible {t.name} は aria-hidden 無し → SR 2 経路読み上げ
 *   重複 (iter853 assignee-picker と完全 parallel な fix)。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">{t.name}</span> で wrap、aria-label 単独経路。
 *
 * 検証: source-side regex assert + iter853 / iter767 / iter851 / iter852
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

  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')

  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter854: tag-picker {t.name} aria-hidden span wrap OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter854: tag-picker {t.name} aria-hidden 不完全`,
    })
  }

  // iter767 invariant: dynamic aria-label
  if (
    /`タグ「\$\{t\.name\}」を付与中 \(クリックで解除\)`/.test(tp) &&
    /`タグ「\$\{t\.name\}」を付与する`/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter767 invariant: tag-picker dynamic aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter767 invariant: 破壊` })
  }

  // iter767 / earlier invariant: CommandInput aria-label
  if (
    /aria-label="タグを検索 or 新規作成 \(Item に紐付けるラベル、新規 tag は色がランダム生成\)"/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter767 invariant: tag-picker CommandInput aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter767 invariant: CommandInput aria-label 破壊` })
  }

  // iter853 invariant: assignee-picker {label} aria-hidden
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if ((ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: assignee-picker {label} aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter851 / iter852 invariant
  const loginPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  const signupPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">サインアップ<\/span>/.test(loginPage) &&
    /<span aria-hidden="true">ログイン<\/span>/.test(signupPage)
  ) {
    findings.push({
      level: 'info',
      message: `iter851/852 invariant: login/signup footer link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851/852 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tag-picker-options-aria-hidden-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
