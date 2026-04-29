/**
 * Phase 6.15 loop iter 364 — `~/offline` page の Home `<Link>` に
 * descriptive `aria-label` を付与し、iter256 で OfflineRetryButton に
 * 適用した「visible text (head) + 括弧内 context」の SR a11y pattern
 * に揃える。
 *
 * 課題: iter256 で OfflineRetryButton には `aria-label="再読み込みして再試行
 *   (ページ全体を読み直して接続を回復)"` が付いていたが、隣接 Home Link
 *   は visible text "ホームに戻る" のみで context 情報なし。SR ユーザは
 *   2 つの actionable 要素のうち retry button だけ context を獲得し、
 *   Home Link は意図 (オンライン復帰後の挙動 / 起点画面の意味) が伝わら
 *   ない非対称構造だった。
 *
 * fix: Link に `aria-label="ホームに戻る (アプリの起点画面に遷移、
 *   オンライン復帰後は最新状態を表示)"` を追加 (1 file 数行)。WCAG SC
 *   2.5.3 (Label in Name) 準拠 — visible "ホームに戻る" は accessible
 *   name の先頭に内包、voice-control "click ホームに戻る" も継続動作。
 *   両 actionable 要素で context-rich aria-label の対称性を確立。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/~offline/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // Home Link block を抽出して aria-label を確認
  const linkBlock = src.match(/<Link[\s\S]+?href="\/"[\s\S]+?<\/Link>/)
  if (!linkBlock) {
    findings.push({ level: 'error', message: `${target}: Home Link block 不在` })
  } else {
    if (!/aria-label="ホームに戻る \(/.test(linkBlock[0])) {
      findings.push({
        level: 'warning',
        message: `Home Link: aria-label に visible text 先頭 + 括弧 context pattern 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `Home Link aria-label OK` })
    }
    // visible text "ホームに戻る" 維持
    if (!/>[\s]*ホームに戻る[\s]*</.test(linkBlock[0])) {
      findings.push({
        level: 'warning',
        message: `Home Link: visible text "ホームに戻る" が消えた (regression)`,
      })
    }
  }

  // iter256 invariant 維持: OfflineRetryButton aria-label
  const retryButton = readFileSync(
    resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'),
    'utf8',
  )
  if (!/aria-label="再読み込みして再試行 \(ページ全体を読み直して接続を回復\)"/.test(retryButton)) {
    findings.push({
      level: 'warning',
      message: 'OfflineRetryButton aria-label が消えた (iter256 regression)',
    })
  }

  console.log(`\n=== Findings (offline-home-aria-label-iter364) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
