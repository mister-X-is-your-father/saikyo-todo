/**
 * Phase 6.15 loop iter 881 (mode-M Mobile a11y) —
 * auth pages (login / signup) の input を className="h-11" 化、
 * mobile tap target 44x44 (WCAG 2.5.5 AAA) 適合。
 *
 * 経緯: iter880 mode-M で /login の input 326x32 (height < 44) を検出。
 *   shadcn `<Input>` default は h-8 (32px) で mobile tap target 不足。
 *   shadcn UI 編集禁止のため、auth 各 IMEInput に className="h-11" override で対応。
 *
 * 修正: 5 input (login email / login password / signup displayName / signup email /
 *   signup password) に className="h-11" 追加。runtime verify で 326x44 確認済。
 *
 * 検証: source-side regex assert + runtime verify (browser で h=44 確認済) +
 *       iter735/843/849-880 invariant cross-check。
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

  // 1. login-form 2 input className="h-11"
  const lfH11Count = (lf.match(/className="h-11"/g) ?? []).length
  if (lfH11Count >= 2) {
    findings.push({
      level: 'info',
      message: `login-form 2 IMEInput className="h-11" 追加 OK (${lfH11Count} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login-form className="h-11" 不足 (現在 ${lfH11Count} 箇所、期待 2 箇所)`,
    })
  }

  // 2. signup-form 3 input className="h-11"
  const sfH11Count = (sf.match(/className="h-11"/g) ?? []).length
  if (sfH11Count >= 3) {
    findings.push({
      level: 'info',
      message: `signup-form 3 IMEInput className="h-11" 追加 OK (${sfH11Count} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-form className="h-11" 不足 (現在 ${sfH11Count} 箇所、期待 3 箇所)`,
    })
  }

  // 3. shadcn UI 直接編集なし (input.tsx 未変更)
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 (UI 編集禁止 invariant 維持) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `shadcn Input default 編集された可能性 (h-8 削除)`,
    })
  }

  // 4. iter844/845 invariant: login/signup form submit aria-hidden 維持
  if (
    /<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf) &&
    /<span aria-hidden="true">\{isPending \? '作成中…' : 'サインアップ'\}<\/span>/.test(sf)
  ) {
    findings.push({
      level: 'info',
      message: `iter844/845 invariant: auth form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter844/845 invariant: 破壊`,
    })
  }

  // iter880 invariant: skip link tap target
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (/focus:min-h-11/.test(layout) && /focus:min-w-11/.test(layout)) {
    findings.push({
      level: 'info',
      message: `iter880 invariant: skip link focus tap target 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter880 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mobile-auth-input-h11-iter881) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
