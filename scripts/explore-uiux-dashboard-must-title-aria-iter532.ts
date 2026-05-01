/**
 * Phase 6.15 loop iter 532 (mode-D Desktop a11y) —
 * Dashboard MUST list の title button に aria-label を補完。
 *
 * 課題: dashboard-view.tsx 行 1393-1403 の MUST item title button (= edit dialog
 *   open trigger) は data-testid のみで aria-label が無い。Dashboard MUST list は
 *   多数 row、visible text (= title) のみで「button としての操作意図 (=編集) +
 *   MUST 文脈」が SR には伝わらない。Backlog (iter531) / Kanban (iter331) /
 *   Today / Inbox は同 pattern aria-label を持つ。
 *
 * fix (1 ファイル ~1 行差分):
 *   - title button に aria-label={`MUST「${item.title}」を編集`}
 *     ("MUST" prefix で MUST 一覧文脈を明示)
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、data-testid / className /
 * onClick / e.stopPropagation invariant 維持。
 *
 * 検証: source-side regex assert + iter515-531 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )

  // 1. dashboard-must-title aria-label
  if (
    /data-testid=\{`dashboard-must-title-\$\{item\.id\}`\}\s+aria-label=\{`MUST「\$\{item\.title\}」を編集`\}/.test(
      dv,
    ) ||
    /aria-label=\{`MUST「\$\{item\.title\}」を編集`\}\s+data-testid=\{`dashboard-must-title-\$\{item\.id\}`\}/.test(
      dv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dashboard-view.tsx: dashboard-must-title aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dashboard-view.tsx: dashboard-must-title aria-label 不在`,
    })
  }

  // 2. iter531 invariant: backlog-view title button aria-label 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter531 invariant: backlog-view title aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter531 invariant: backlog-view aria-label 破壊`,
    })
  }

  // 3. iter515-530 invariant cross-check (anchor 3 件)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const ic = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-checkbox.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok525 = (sp.match(/aria-busy=\{changing \|\| undefined\}/g) ?? []).length === 4
  const ok530 = /aria-busy=\{toggle\.isPending \|\| undefined\}/.test(ic)
  if (ok515 && ok525 && ok530) {
    findings.push({
      level: 'info',
      message: `iter515-530 invariant: 重要 anchor 3 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-530 invariant: 破壊 (515=${ok515} 525=${ok525} 530=${ok530})`,
    })
  }

  console.log(`\n=== Findings (dashboard-must-title-aria-iter532) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
