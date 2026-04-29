/**
 * Phase 6.15 loop iter 346 — startDate input に `max={endDate}` を追加して
 * date range 制約を双方向化 (4 file batch)。
 *
 * 課題: 日付範囲 form (item-edit-dialog 編集 / goals-panel 新規 / sprints-panel
 *   新規 + 期間編集) は endDate 側に `min={startDate}` を持つが startDate 側は
 *   max 制約無し → start を end の後に変更すると HTML5 native validation を
 *   passing (start > end の状態を作れる)。
 *
 * fix: 各 startDate input に `max={endDate || undefined}` を追加 (4 箇所)。これで
 *   start <= end が HTML5 native で双方向にガード。サーバ側 zod / runtime
 *   validation も既設だが defense in depth で UX 早期段階で誤入力を防ぐ。
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル。
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

  // item-edit-dialog: editStart に max={dueDate}
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!/id="editStart"[\s\S]*?max=\{dueDate \|\| undefined\}/.test(ied)) {
    findings.push({ level: 'warning', message: 'item-edit-dialog.tsx: editStart max 不在' })
  }

  // goals-panel: goal-start に max={endDate}
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (!/id="goal-start"[\s\S]*?max=\{endDate \|\| undefined\}/.test(gp)) {
    findings.push({ level: 'warning', message: 'goals-panel.tsx: goal-start max 不在' })
  }

  // sprints-panel: sprint-start + sprint-edit-start に max
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!/id="sprint-start"[\s\S]*?max=\{endDate \|\| undefined\}/.test(sp)) {
    findings.push({ level: 'warning', message: 'sprints-panel.tsx: sprint-start max 不在' })
  }
  if (
    !/id=\{`sprint-edit-start-\$\{sprint\.id\}`\}[\s\S]*?max=\{editEnd \|\| undefined\}/.test(sp)
  ) {
    findings.push({ level: 'warning', message: 'sprints-panel.tsx: sprint-edit-start max 不在' })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: '4 startDate input に max 双方向制約 OK' })
  }

  console.log(`\n=== Findings (date-max-iter346) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
