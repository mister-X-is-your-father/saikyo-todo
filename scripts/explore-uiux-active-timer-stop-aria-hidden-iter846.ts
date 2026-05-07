/**
 * Phase 6.15 loop iter 846 (mode-D Desktop a11y) —
 * active-timer-panel Stop button visible "停止" を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/active-timer-panel.tsx の Stop Button は visible
 *   text "停止" を直接 children で出していたが、aria-label
 *   ("タイマーを停止して稼働記録に保存" / "タイマーを停止して稼働記録を作成中…") が
 *   visible "停止" を完全に含むのに aria-hidden 無し。
 *   Pause/Resume/PiP は icon-only なので OK、Stop だけ未統合だった。
 *
 * fix (1 ファイル 1 行差分、visible text を <span aria-hidden="true"> で wrap):
 *   - 旧: 停止
 *   - 新: <span aria-hidden="true">停止</span>
 *
 * 検証: source-side regex assert + iter735-845 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">停止<\/span>/.test(atp)) {
    findings.push({
      level: 'info',
      message: `active-timer-panel Stop visible text aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `active-timer-panel Stop visible aria-hidden 未統合`,
    })
  }
  // aria-label 維持
  if (/aria-label=\{[\s\S]+?'タイマーを停止して稼働記録に保存'/.test(atp)) {
    findings.push({
      level: 'info',
      message: `active-timer-panel Stop aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `active-timer-panel Stop aria-label 破壊` })
  }

  // iter845 invariant: signup-form submit aria-hidden
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{isPending \? '作成中…' : 'サインアップ'\}<\/span>/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter845 invariant: signup-form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter845 invariant: 破壊` })
  }

  // iter844 invariant: login-form submit aria-hidden
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login-form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
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

  console.log(`\n=== Findings (active-timer-stop-aria-hidden-iter846) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
