/**
 * Phase 6.15 loop iter 533 (mode-D Desktop a11y) —
 * TodayView title cell button に aria-label を補完
 * (iter331 Kanban / iter531 Backlog / iter532 Dashboard MUST title pattern を Today に展開)。
 *
 * 課題: today-view.tsx 行 207-217 の title cell button (= edit dialog open trigger)
 *   は data-testid のみで aria-label が無い。Today view は多数 row、visible text
 *   (= title) のみで「button としての操作意図 (=編集)」が SR には伝わらない。
 *   Kanban (iter331) / Backlog (iter531) / Dashboard MUST (iter532) は同 pattern
 *   aria-label を持つが Today のみ漏れ。
 *
 * fix (1 ファイル ~1 行差分):
 *   - title button に aria-label={`「${it.title}」を編集`}
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、data-testid / className /
 * onClick / e.stopPropagation invariant 維持。
 *
 * 検証: source-side regex assert + iter515-532 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')

  // 1. today-title aria-label
  if (
    /data-testid=\{`today-title-\$\{it\.id\}`\}\s+aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(
      tv,
    ) ||
    /aria-label=\{`「\$\{it\.title\}」を編集`\}\s+data-testid=\{`today-title-\$\{it\.id\}`\}/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `today-view.tsx: today-title aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view.tsx: today-title aria-label 不在`,
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

  // 3. iter532 invariant: dashboard MUST list aria-label 維持
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`MUST「\$\{item\.title\}」を編集`\}/.test(dv)) {
    findings.push({
      level: 'info',
      message: `iter532 invariant: dashboard MUST title aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter532 invariant: dashboard aria-label 破壊`,
    })
  }

  // 4. iter515-530 invariant cross-check (anchor 3 件)
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

  console.log(`\n=== Findings (today-title-aria-label-iter533) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
