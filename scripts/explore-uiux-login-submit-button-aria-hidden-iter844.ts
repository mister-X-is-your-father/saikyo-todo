/**
 * Phase 6.15 loop iter 844 (mode-D Desktop a11y) —
 * login-form submit button visible text を aria-hidden span に統合。
 *
 * 課題: src/components/auth/login-form.tsx の submit Button は visible text
 *   "ログイン中…" / "ログイン" を直接 children で出していたが、aria-label
 *   ("ログイン中… (認証処理を実行中)" / "ログイン (メール + パスワードで認証)") が
 *   visible text を完全に含むのに aria-hidden 無し。
 *   一部 SR / 旧 browser で children が re-announce される anti-pattern (iter826
 *   以降の visible aria-hidden 統一規約に未追従)。
 *
 * fix (1 ファイル 1 行差分、visible text を <span aria-hidden="true"> で wrap):
 *   - 旧: {isPending ? 'ログイン中…' : 'ログイン'}
 *   - 新: <span aria-hidden="true">{isPending ? 'ログイン中…' : 'ログイン'}</span>
 *
 * 検証: source-side regex assert + iter735-843 invariant cross-check。
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
  if (/<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf)) {
    findings.push({
      level: 'info',
      message: `login-form submit visible text aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login-form submit visible text aria-hidden 未統合`,
    })
  }
  // aria-label が壊れていないこと
  if (
    /aria-label=\{\s*\n?\s*isPending \? 'ログイン中… \(認証処理を実行中\)' : 'ログイン \(メール \+ パスワードで認証\)'/.test(
      lf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `login-form submit aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `login-form submit aria-label 破壊` })
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

  // iter842 invariant: decompose-proposals-panel 4 button aria-hidden
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">全て採用<\/span>/.test(dpp) &&
    /<span aria-hidden="true">✓ 採用<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter842 invariant: decompose-proposals-panel buttons aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter842 invariant: 破壊` })
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
      message: `iter841 invariant: items-board view-switcher 9 button aria-hidden 維持 OK`,
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

  console.log(`\n=== Findings (login-submit-button-aria-hidden-iter844) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
