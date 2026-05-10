/**
 * Phase 6.15 loop iter 889 (mode-D Desktop a11y) —
 * Offline page (~offline) の OfflineRetryButton + ホームに戻る Link visible aria-hidden
 * 統合 (一括)。
 *
 * 課題: src/app/~offline/retry-button.tsx の OfflineRetryButton (visible "再読み込みして再試行")
 *   と src/app/~offline/page.tsx の Link "ホームに戻る" は aria-label substring 適合だったが
 *   iter844-888 campaign 規約 (visible aria-hidden 単独経路) から外れていた。Offline 状態は
 *   PWA / Service Worker 復帰時のみ表示される稀少 surface だが、SR ユーザの音声 control 整合
 *   を全 surface で統一する campaign 完結に寄与。
 *
 * fix (2 ファイル / +2-2 行差分、2 element 一括):
 *   - retry-button: <Button>再読み込みして再試行</Button> → <Button><span aria-hidden="true">再読み込みして再試行</span></Button>
 *   - page Link: <Link>ホームに戻る</Link> → <Link><span aria-hidden="true">ホームに戻る</span></Link>
 *
 * 検証: source-side regex assert + iter887/888 invariant cross-check。
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
  const pg = readFileSync(resolve(process.cwd(), 'src/app/~offline/page.tsx'), 'utf8')

  // 1. retry-button visible aria-hidden
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `retry-button visible '再読み込みして再試行' span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `retry-button visible aria-hidden 未統合`,
    })
  }

  // 2. retry-button aria-label 維持
  if (/aria-label="再読み込みして再試行 \(ページ全体を読み直して接続を回復\)"/.test(rb)) {
    findings.push({
      level: 'info',
      message: `retry-button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `retry-button aria-label 破壊` })
  }

  // 3. offline page Link "ホームに戻る" visible aria-hidden
  if (/<span aria-hidden="true">ホームに戻る<\/span>/.test(pg)) {
    findings.push({
      level: 'info',
      message: `offline page Link "ホームに戻る" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `offline page Link "ホームに戻る" aria-hidden 未統合`,
    })
  }

  // 4. offline page Link aria-label 維持
  if (
    /aria-label="ホームに戻る \(アプリの起点画面に遷移、オンライン復帰後は最新状態を表示\)"/.test(
      pg,
    )
  ) {
    findings.push({
      level: 'info',
      message: `offline page Link aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `offline page Link aria-label 破壊` })
  }

  // iter888 invariant: create-workspace-form Unicode ellipsis
  const cw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '作成中…' : '作成'\}<\/span>/.test(cw)) {
    findings.push({
      level: 'info',
      message: `iter888 invariant: create-workspace-form Unicode 統一 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter888 invariant: create-workspace-form 破壊` })
  }

  console.log(`\n=== Findings (offline-page-aria-hidden-iter889) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
