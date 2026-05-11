/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * オフライン fallback ページの 2 アクション (再読み込み Button / ホーム Link) visible text を
 * aria-hidden span に統合。
 *
 * 課題:
 *   - src/app/~offline/retry-button.tsx の Button visible "再読み込みして再試行"
 *   - src/app/~offline/page.tsx の Link visible "ホームに戻る"
 *   どちらも aria-label が visible を完全包含するのに aria-hidden 無し → 一部 SR で
 *   re-announce される anti-pattern (iter826/iter844-852 の visible aria-hidden 統一規約に未追従)。
 *   オフライン状態は user 心理的に余裕が無いので「同じ言葉を 2 回聞かされる」 摩擦をここで除く。
 *
 * fix (2 ファイル各 1 行差分):
 *   - retry-button.tsx: 再読み込みして再試行 → <span aria-hidden="true">…</span>
 *   - page.tsx Link: ホームに戻る → <span aria-hidden="true">…</span>
 *
 * 検証: source-side regex assert + iter852/851/844/843/735 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const rb = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `offline retry button visible aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `offline retry button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="再読み込みして再試行 \(ページ全体を読み直して接続を回復\)"/.test(rb)) {
    findings.push({
      level: 'info',
      message: `offline retry button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `offline retry button aria-label 破壊` })
  }

  const op = readFileSync(resolve(process.cwd(), 'src/app/~offline/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">ホームに戻る<\/span>/.test(op)) {
    findings.push({
      level: 'info',
      message: `offline home Link visible aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `offline home Link visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label="ホームに戻る \(アプリの起点画面に遷移、オンライン復帰後は最新状態を表示\)"/.test(
      op,
    )
  ) {
    findings.push({
      level: 'info',
      message: `offline home Link aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `offline home Link aria-label 破壊` })
  }

  // iter852 invariant: mock-timesheet login submit aria-hidden
  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '認証中…' : 'ログイン'\}<\/span>/.test(ml)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: mock-timesheet login submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter851 invariant: skip-link focus min-h-11
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

  // iter844 invariant: login-form submit aria-hidden span
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login-form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
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

  console.log(`\n=== Findings (offline-action-aria-hidden-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
