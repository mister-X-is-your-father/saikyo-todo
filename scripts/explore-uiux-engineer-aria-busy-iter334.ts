/**
 * Phase 6.15 loop iter 334 — engineer-trigger-button の Engineer button に
 * aria-busy 付与、iter319-322 の form aria-busy sweep の Button 拡張。
 *
 * 課題: Engineer Agent 起動 button は `disabled={trigger.isPending}` のみで
 *   pending 状態を SR に通知 (= "disabled") するが、aria-busy 不在で
 *   「処理進行中」の意味が伝わらない。disabled は禁止状態、aria-busy は
 *   処理進行中の意味で SR の通知が異なる、両方付ければ適切に状態区別可能。
 *   Engineer Agent 起動は git worktree + Claude による実装で長時間 (数十秒〜
 *   数分) なので busy 通知の価値が大きい。
 *
 * fix: `<Button ... aria-busy={trigger.isPending || undefined} ...>` を追加
 *   (1 行)。pending 中のみ aria-busy="true"、idle 時は属性自体が DOM から消える
 *   (undefined fallback)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、約 4 行差替え (コメント含)。
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
  const target = 'src/components/workspace/engineer-trigger-button.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/aria-busy=\{trigger\.isPending \|\| undefined\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-busy 不在` })
  } else {
    findings.push({ level: 'info', message: `${target}: aria-busy OK` })
  }

  console.log(`\n=== Findings (engineer-aria-busy-iter334) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
