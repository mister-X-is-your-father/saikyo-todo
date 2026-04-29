/**
 * Phase 6.15 loop iter 365 — `~/offline` page の Home `<Link>` に
 * `prefetch={false}` を付与。offline page は文字通り network 喪失時の
 * fallback で、Next.js Link の default prefetch (viewport 進入時に
 * `/` を fetch) は network 不在で確実に fail する wasted 試行になる。
 * SW cache が runtime で `/` を持っていれば cache hit で返るが、初回
 * offline ヒット時は populate 前で失敗、user 操作なしの auto prefetch
 * は意図的に止める方が safe。
 *
 * 課題: Link の prefetch は default true (Next.js の auto prefetch =
 *   viewport 進入時に `<link rel="prefetch">` を生成)。offline page
 *   では network 喪失で失敗、console に「fetch failed」warning が
 *   出る。SW が `/` を runtime cache していれば cache hit するが、
 *   初回 offline 状態の cold start では populate されておらず必ず
 *   fail。user click 時は通常通り fetch (SW intercept) するので、
 *   prefetch を止めても navigation 速度に影響なし。
 *
 * fix: Link に `prefetch={false}` を追加 (1 file 1 line)。明示的に
 *   prefetch off の intent を表明、wasted fetch 試行を回避。click
 *   時の navigation は SW + browser cache 経由で従来通り動作。
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

  const linkBlock = src.match(/<Link[\s\S]+?href="\/"[\s\S]+?<\/Link>/)
  if (!linkBlock) {
    findings.push({ level: 'error', message: `${target}: Home Link block 不在` })
  } else {
    if (!/prefetch=\{false\}/.test(linkBlock[0])) {
      findings.push({
        level: 'warning',
        message: `Home Link: prefetch={false} 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `Home Link prefetch={false} OK` })
    }
    // iter364 invariant 維持
    if (!/aria-label="ホームに戻る \(/.test(linkBlock[0])) {
      findings.push({
        level: 'warning',
        message: `Home Link aria-label が消えた (iter364 regression)`,
      })
    }
  }

  console.log(`\n=== Findings (offline-link-prefetch-iter365) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
