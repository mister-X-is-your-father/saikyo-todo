/**
 * Phase 6.15 loop iter 338 — decompose-proposals-panel の 6 mutation Button
 * (Cancel agent / Accept all / Reject all / Redecompose / Redecompose-fresh /
 * Save edit) に aria-busy を batch 付与、iter334-337 続編 (Button aria-busy
 * sweep の 16-21 件目達成)。
 *
 * fix: 各 button の disabled の隣に `aria-busy={X.isPending || undefined}` を追加
 *   (6 箇所, 6 行追加)。
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
  const target = 'src/components/workspace/decompose-proposals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 期待: cancel / accept / rejectAll / decompose (×2) / update の aria-busy
  const expected = ['cancel', 'accept', 'rejectAll', 'decompose', 'update']
  for (const mut of expected) {
    const re = new RegExp(`aria-busy=\\{${mut}\\.isPending \\|\\| undefined\\}`)
    if (!re.test(src)) {
      findings.push({
        level: 'warning',
        message: `${target}: aria-busy=${mut}.isPending 不在`,
      })
    }
  }

  // decompose は 2 button (redecompose / redecompose-fresh) で参照
  const decomposeCount = (src.match(/aria-busy=\{decompose\.isPending \|\| undefined\}/g) ?? [])
    .length
  if (decomposeCount < 2) {
    findings.push({
      level: 'warning',
      message: `${target}: decompose aria-busy が 2 button 必要 (現状 ${decomposeCount} 件)`,
    })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: 6 button aria-busy 全付与 OK` })
  }

  console.log(`\n=== Findings (decompose-aria-busy-iter338) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
