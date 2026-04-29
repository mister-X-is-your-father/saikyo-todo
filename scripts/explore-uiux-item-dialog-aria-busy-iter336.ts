/**
 * Phase 6.15 loop iter 336 — ItemEditDialog の 5 mutation Button (Save / Archive /
 * Unarchive / Set baseline / Clear baseline) + ArchivedItemsPanel の Restore
 * button に aria-busy を batch 付与、iter334-335 続編。
 *
 * fix: 各 Button の disabled の隣に `aria-busy={X.isPending || undefined}` を
 *   追加 (6 箇所 / 2 file, 6 行追加)。これで disabled (禁止状態) と aria-busy
 *   (処理進行中) の両軸を SR が区別可能。Save / Archive / Baseline 系 mutation
 *   は楽観ロック競合 retry を含むため pending 時間が予測しづらく、busy 通知
 *   の価値が大きい。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。
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

  const dialogSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  for (const mut of ['unarchive', 'archive', 'setBaseline', 'clearBaseline', 'update']) {
    const re = new RegExp(`aria-busy=\\{${mut}\\.isPending \\|\\| undefined\\}`)
    if (!re.test(dialogSrc)) {
      findings.push({
        level: 'warning',
        message: `item-edit-dialog.tsx: aria-busy=${mut}.isPending 不在`,
      })
    }
  }

  const archiveSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (!/aria-busy=\{unarchive\.isPending \|\| undefined\}/.test(archiveSrc)) {
    findings.push({
      level: 'warning',
      message: 'archived-items-panel.tsx: aria-busy=unarchive.isPending 不在',
    })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: '6 mutation Button aria-busy 全付与 OK' })
  }

  console.log(`\n=== Findings (item-dialog-aria-busy-iter336) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
