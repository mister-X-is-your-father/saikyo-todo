/**
 * Phase 6.15 loop iter 845 (mode-D Desktop a11y) —
 * signup-form submit button visible text を aria-hidden span に統合。
 *
 * 課題: src/components/auth/signup-form.tsx の submit Button は visible text
 *   "作成中…" / "サインアップ" を直接 children で出していたが、aria-label
 *   ("アカウント作成中… (サインアップ処理を実行中)" / "アカウントを作成 (サインアップ)") が
 *   visible text を完全に含むのに aria-hidden 無し。iter844 の login-form 同 pattern を
 *   signup 側にも揃える。
 *
 * fix (1 ファイル 1 行差分、visible text を <span aria-hidden="true"> で wrap):
 *   - 旧: {isPending ? '作成中…' : 'サインアップ'}
 *   - 新: <span aria-hidden="true">{isPending ? '作成中…' : 'サインアップ'}</span>
 *
 * 検証: source-side regex assert + iter735-844 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{isPending \? '作成中…' : 'サインアップ'\}<\/span>/.test(sf)) {
    findings.push({
      level: 'info',
      message: `signup-form submit visible text aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-form submit visible text aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\n]+isPending[\s\n]+\? 'アカウント作成中… \(サインアップ処理を実行中\)'/.test(
      sf,
    )
  ) {
    findings.push({ level: 'info', message: `signup-form submit aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `signup-form submit aria-label 破壊` })
  }

  // iter844 invariant: login-form submit button aria-hidden
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login-form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  // iter843 invariant: item-edit-dialog reload button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter843 invariant: item-edit-dialog reload button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter843 invariant: 破壊` })
  }

  // iter841 invariant: items-board view-switcher 9 button aria-hidden
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">Today<\/span>/.test(ib) &&
    /<span aria-hidden="true">月次<\/span>/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter841 invariant: items-board view-switcher aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter841 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (signup-submit-button-aria-hidden-iter845) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
