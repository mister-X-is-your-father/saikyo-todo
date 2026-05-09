/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y) —
 * subtasks-panel bulk-add button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/subtasks-panel.tsx 行 561-579 の subtasks-bulk-add-btn
 *   は aria-label が完全 content (4 状態:無入力 / 空行のみ / 件数指定 / pending)
 *   を含むのに visible "{追加中… or N 件追加}" は aria-hidden 無し →
 *   SR 2 経路読み上げ重複。iter844-871 と同 vocabulary。
 *
 * fix (1 ファイル +3/-1 行):
 *   - <span aria-hidden="true">{create.isPending ? '追加中…' : `${...}件追加`}</span>
 *
 * 検証: source-side regex assert + iter871 / iter870 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  if (
    /data-testid="subtasks-bulk-add-btn"[\s\S]*?<span aria-hidden="true">[\s\S]*?\{create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`\}[\s\S]*?<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter872: subtasks-bulk-add-btn aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter872: subtasks-bulk-add-btn aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid / aria-keyshortcuts 維持
  if (
    /aria-label=\{[\s\S]*?'子タスクを追加するには改行区切りで入力してください'/.test(sp) &&
    /data-testid="subtasks-bulk-add-btn"/.test(sp) &&
    /aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: aria-label / data-testid / aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter871 invariant: items-board empty quick-add aria-hidden
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: items-board empty quick-add 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  console.log(`\n=== Findings (subtasks-bulk-add-aria-hidden-iter872) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
