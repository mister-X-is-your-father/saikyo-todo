/**
 * Phase 6.15 loop iter 1701 — time-entries-table の sync badge 3 件 aria-label を
 * iter1629 sweep em-dash convention に揃える (colon を撤去)。
 *
 * 課題: src/components/time-entry/time-entries-table.tsx の 3 sync badge
 *   (synced / failed / pending) は aria-label `${visible} — 外部同期: ${state}`
 *   形式で em-dash で visible/descriptor を分けた後の descriptor 部内に colon
 *   `:` が残存。iter1629 sweep (StatusBadge `ステータス: ${X}` → `ステータス ${X}`)
 *   と divergent。
 *
 * fix: 3 aria-label の `外部同期: <state>` → `外部同期 <state>` (1 file 3 行差替 +
 *   各 1 行 comment)。機能追加なし、shadcn 編集なし、影響面 1 ファイル。
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

  const target = 'src/components/time-entry/time-entries-table.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 旧 colon aria-label 3 件不在
  for (const oldStr of [
    'aria-label="synced — 外部同期: 完了"',
    'aria-label="failed — 外部同期: 失敗"',
    'aria-label="pending — 外部同期: 未実行"',
  ]) {
    if (src.includes(oldStr)) {
      findings.push({
        level: 'warning',
        message: `${target}: 旧 colon aria-label が残存: ${oldStr}`,
      })
    }
  }

  // 2. 新 em-dash convention aria-label 3 件存在
  for (const newStr of [
    'aria-label="synced — 外部同期 完了"',
    'aria-label="failed — 外部同期 失敗"',
    'aria-label="pending — 外部同期 未実行"',
  ]) {
    if (!src.includes(newStr)) {
      findings.push({
        level: 'warning',
        message: `${target}: 新 em-dash aria-label が無い: ${newStr}`,
      })
    } else {
      findings.push({ level: 'info', message: `OK: ${newStr}` })
    }
  }

  // 3. iter1629 StatusBadge invariant (regression guard、同 sweep の起点)
  const statusBadge = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  if (!/aria-label=\{`\$\{cfg\.shortLabel\} — ステータス \$\{cfg\.label\}`\}/.test(statusBadge)) {
    findings.push({
      level: 'warning',
      message: 'status-badge.tsx: iter1629 em-dash convention invariant が壊れた',
    })
  }

  console.log(`\n=== Findings (sync-badge-em-dash-iter1701) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
