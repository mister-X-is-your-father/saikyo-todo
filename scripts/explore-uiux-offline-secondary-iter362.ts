/**
 * Phase 6.15 loop iter 362 — `~/offline` page の `<main>` aria-describedby を
 * 1 段目 status だけでなく 2 段目 saikyo-todo 特有 detail
 * ("最強TODO はオフラインでもアプリ自体は表示されますが、Item の作成 /
 * 同期にはオンライン接続が必要です。") も含めるよう拡張。SR が landmark
 * 到達時に primary status + secondary explanation を 1 続きで announce する。
 *
 * 課題: iter361 で `<main aria-describedby="offline-description">` を導入した
 *   が 1 段目 paragraph のみ参照、2 段目 paragraph (saikyo-todo がオフラインで
 *   どこまで動くかの explanation) は隣接 <p> として独立、SR は landmark 到達
 *   直後にこの explanation を聞かない。ユーザは「Item 作成は不可」という
 *   重要な制約を別途 forward navigation しないと得られない。
 *
 * fix: 2 段目 <p> に `id="offline-secondary"` を付与し、<main> の
 *   aria-describedby を `"offline-description offline-secondary"` に拡張
 *   (1 file 2 行差替)。space 区切りで 2 ID を列挙する ARIA spec 標準 pattern
 *   を使用、SR は順序通り 2 段の description を announce する。
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

  // <main> aria-describedby に 2 ID 列挙されていること
  if (!/aria-describedby="offline-description offline-secondary"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <main> aria-describedby に 2 ID 列挙不在`,
    })
  } else {
    findings.push({ level: 'info', message: `<main> aria-describedby 2 ID 列挙 OK` })
  }

  // 2 段目 <p> に id="offline-secondary" が付与されていること
  if (!/id="offline-secondary"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <p id="offline-secondary"> 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `<p id="offline-secondary"> OK` })
  }

  // iter361 invariant 維持: id="offline-description" + h1 + iter256 main
  if (!/id="offline-description"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: id="offline-description" が消えた (iter361 regression)`,
    })
  }
  if (!/aria-labelledby="offline-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: aria-labelledby が消えた (iter256 regression)`,
    })
  }

  console.log(`\n=== Findings (offline-secondary-iter362) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
