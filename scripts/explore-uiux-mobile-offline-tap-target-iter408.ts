/**
 * Phase 6.15 loop iter 408 (mode-M Mobile audit) — /~offline 復帰アクション
 * 2 button (再読み込みして再試行 + ホームに戻る) の tap target を 32px →
 * 44px (WCAG 2.5.5 AAA + Apple HIG) に拡大、recovery 画面の mobile UX 改善。
 *
 * 課題: src/app/~offline/retry-button.tsx + ~offline/page.tsx の Link は
 *   shadcn Button default size (h-8 = 32px) を継承し、mobile (iPhone SE
 *   320px / iPhone 13 390px) で tap target 32px。WCAG 2.5.5 (Target Size,
 *   AAA) は 44x44px 以上を推奨、Apple HIG も 44pt 推奨。/~offline は
 *   network 切断時の recovery 画面で interactive element はこの 2 button
 *   のみ — タップ精度が低くなりがちな mobile で recovery action を
 *   ミスタップさせるのは UX 致命的。
 *
 *   Mobile audit (viewport 320x568 iPhone SE):
 *   - 再読み込みして再試行 button: 163x32 → 44 違反 (height < 44)
 *   - ホームに戻る link: 107x32 → 44 違反 (height < 44)
 *
 *   ユーザ要望「スマホ表示が全体的にいけてない」(2026-04-30) の消化として
 *   /~offline は recovery 性が高く優先度が高い。
 *
 * fix: 2 file × 各 1 line addition (className に "h-11 px-4" 追加)。
 *   - retry-button.tsx: <Button className="h-11 px-4">
 *   - ~offline/page.tsx: <Link className={cn(buttonVariants(...), 'h-11 px-4')}>
 *     (cn() で tailwind-merge を使い h-8 と h-11 の重複を解決、px-2.5 と
 *     px-4 も同様。template literal 連結だと両方 class が残り CSS 順位
 *     依存で h-8 か h-11 か不定 + outline border が border-transparent に
 *     上書きされて視覚が壊れる罠あり、cn() 必須)
 *   - ~offline/page.tsx: `import { cn } from '@/lib/utils'` 追加
 *
 *   結果: 両 button 44px tall (verified by MCP browser_evaluate:
 *   175x44 + 119x44, pass44x44=true)。視覚的には outline border 維持、
 *   primary button の dark bg 維持。flex-wrap で 320px viewport では
 *   2 button が縦 stack する自然な mobile layout。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。desktop (1280px) でも
 * recovery 画面なので 44px button は overpower でなく適切。
 *
 * 検証: source-side regex assert + screenshot 比較
 *   (.playwright-mcp/uiux-mobile-offline-iter408-{before,after}.png) で
 *   修正前後の視覚を確認 + MCP browser_evaluate で 44x44 pass を直接
 *   measure。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const retryPath = 'src/app/~offline/retry-button.tsx'
  const pagePath = 'src/app/~offline/page.tsx'
  const retrySrc = readFileSync(resolve(process.cwd(), retryPath), 'utf8')
  const pageSrc = readFileSync(resolve(process.cwd(), pagePath), 'utf8')

  // 1. retry-button.tsx に className="h-11 px-4"
  if (!/<Button[\s\S]*?className="h-11 px-4"/.test(retrySrc)) {
    findings.push({
      level: 'warning',
      message: `${retryPath}: <Button className="h-11 px-4"> が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${retryPath}: h-11 px-4 OK` })
  }

  // 2. ~offline/page.tsx Link に cn(buttonVariants(...), 'h-11 px-4')
  if (!/cn\(buttonVariants\(\{ variant: 'outline' \}\), 'h-11 px-4'\)/.test(pageSrc)) {
    findings.push({
      level: 'warning',
      message: `${pagePath}: Link className に cn(buttonVariants(outline), 'h-11 px-4') が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${pagePath}: cn() with h-11 px-4 OK` })
  }

  // 3. cn import added
  if (!/import \{ cn \} from '@\/lib\/utils'/.test(pageSrc)) {
    findings.push({
      level: 'warning',
      message: `${pagePath}: cn import が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${pagePath}: cn import OK` })
  }

  // iter256 invariant 維持: OfflineRetryButton 存在 + aria-label
  if (!/aria-label="再読み込みして再試行 \(ページ全体を読み直して接続を回復\)"/.test(retrySrc)) {
    findings.push({
      level: 'warning',
      message: `${retryPath}: iter256 aria-label が消えた (regression)`,
    })
  }

  // iter260 invariant 維持: role="group" aria-label="復帰アクション"
  if (!/role="group"\s+aria-label="復帰アクション"/.test(pageSrc)) {
    findings.push({
      level: 'warning',
      message: `${pagePath}: iter260 group aria-label が消えた (regression)`,
    })
  }

  // iter263 invariant 維持: <main aria-labelledby="offline-heading">
  if (!/aria-labelledby="offline-heading"/.test(pageSrc)) {
    findings.push({
      level: 'warning',
      message: `${pagePath}: iter263 main aria-labelledby が消えた (regression)`,
    })
  }

  // iter404 invariant 維持: <main tabIndex={-1}>
  if (!/tabIndex=\{-1\}/.test(pageSrc)) {
    findings.push({
      level: 'warning',
      message: `${pagePath}: iter404 tabIndex={-1} が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (mobile-offline-tap-target-iter408) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
