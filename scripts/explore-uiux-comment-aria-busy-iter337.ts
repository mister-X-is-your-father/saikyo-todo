/**
 * Phase 6.15 loop iter 337 — comment-thread の 4 mutation Button (Post / Save /
 * Edit / Delete) に aria-busy を batch 付与、iter334-336 続編 (Button aria-busy
 * sweep の 12-15 件目達成)。
 *
 * fix: 各 button の disabled の隣に `aria-busy={X.isPending || undefined}` を追加
 *   (4 箇所, 4 行追加)。これでコメント投稿 / 編集保存 / 編集 mode 切替 / 削除
 *   いずれの mutation pending 中も SR が "busy" を audible に報告。
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
  const target = 'src/components/workspace/comment-thread.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  for (const mut of ['create', 'update', 'softDelete']) {
    const re = new RegExp(`aria-busy=\\{${mut}\\.isPending \\|\\| undefined\\}`)
    if (!re.test(src)) {
      findings.push({
        level: 'warning',
        message: `${target}: aria-busy=${mut}.isPending 不在`,
      })
    }
  }

  // softDelete は edit + delete の 2 button で参照される
  const softDeleteCount = (src.match(/aria-busy=\{softDelete\.isPending \|\| undefined\}/g) ?? [])
    .length
  if (softDeleteCount < 2) {
    findings.push({
      level: 'warning',
      message: `${target}: softDelete aria-busy が edit / delete 両 button で必要 (現状 ${softDeleteCount} 件)`,
    })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: 4 button aria-busy 全付与 OK` })
  }

  console.log(`\n=== Findings (comment-aria-busy-iter337) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
