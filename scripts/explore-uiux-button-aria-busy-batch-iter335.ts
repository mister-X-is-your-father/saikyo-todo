/**
 * Phase 6.15 loop iter 335 — long-running mutation Button 4 件 (HeartbeatButton /
 * StandupButton / ItemDecomposeButton / ItemResearchButton) に aria-busy を batch
 * 付与、iter334 (engineer-trigger-button) の続編。
 *
 * fix: 各 Button の disabled={X.isPending} の隣に
 *   `aria-busy={X.isPending || undefined}` を追加 (4 file, 4 行追加)。
 *   これで disabled (禁止状態) と aria-busy (処理進行中) を別軸で SR に伝達。
 *   各 mutation は AI 起動 / agent worker 実行 / heartbeat scan で 数秒〜数十秒
 *   かかるため busy 通知の価値が大きい。
 *
 * 機能追加なし、shadcn 編集なし、影響面 4 ファイル、各 1 行追加。
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

  for (const [path, mut] of [
    ['src/components/workspace/heartbeat-button.tsx', 'scan'],
    ['src/components/workspace/standup-button.tsx', 'standup'],
    ['src/components/workspace/item-decompose-button.tsx', 'decompose'],
    ['src/components/workspace/item-research-button.tsx', 'research'],
  ] as const) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    const re = new RegExp(`aria-busy=\\{${mut}\\.isPending \\|\\| undefined\\}`)
    if (!re.test(src)) {
      findings.push({ level: 'warning', message: `${path}: aria-busy=\${mut}.isPending 不在` })
    } else {
      findings.push({ level: 'info', message: `${path}: aria-busy OK` })
    }
  }

  // iter334 invariant: engineer-trigger-button の aria-busy 維持
  const e = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (!/aria-busy=\{trigger\.isPending \|\| undefined\}/.test(e)) {
    findings.push({ level: 'warning', message: 'engineer-trigger-button.tsx: iter334 回帰' })
  }

  console.log(`\n=== Findings (button-aria-busy-batch-iter335) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
