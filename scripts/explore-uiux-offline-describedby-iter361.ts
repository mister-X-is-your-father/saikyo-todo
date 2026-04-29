/**
 * Phase 6.15 loop iter 361 — `~/offline` page の `<main>` に
 * `aria-describedby="offline-description"` を追加。iter256 で main 化 + h1
 * heading を獲得、iter359 で auth form を aria-describedby で description に
 * 紐付けた pattern を offline landmark にも展開。SR は landmark navigation で
 * main に到達した時、heading "オフラインです" だけでなく主要 status 文
 * "ネットワーク接続が切れています。再接続後にもう一度お試しください。" も
 * 即座に announce される。
 *
 * 課題: 旧実装は `<main aria-labelledby="offline-heading">` のみで、
 *   「ネットワーク接続が切れています」の status 文は隣接 <p> として独立、
 *   SR が main landmark に到達した瞬間には announce されない。
 *
 * fix: `<main>` に `aria-describedby="offline-description"` を追加し、
 *   1 段目の <p> に `id="offline-description"` を付与 (1 file 2 行追加)。
 *   SR の landmark heading + description 二段構成に統一。WCAG SC 1.3.1
 *   (Info and Relationships) の programmatic 関連付けに準拠。
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

  if (!/aria-describedby="offline-description"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <main> aria-describedby="offline-description" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `<main> aria-describedby OK` })
  }

  if (!/id="offline-description"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <p> id="offline-description" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `<p> id="offline-description" OK` })
  }

  // iter256 invariant 維持: <main aria-labelledby="offline-heading"> + h1
  if (!/aria-labelledby="offline-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: aria-labelledby が消えた (iter256 regression)`,
    })
  }
  if (!/<h1 id="offline-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: h1 id="offline-heading" が消えた (iter256 regression)`,
    })
  }

  console.log(`\n=== Findings (offline-describedby-iter361) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
