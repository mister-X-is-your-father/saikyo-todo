/**
 * Phase 6.15 loop iter 531 (mode-D Desktop a11y) —
 * BacklogView title cell button に aria-label を補完。
 *
 * 課題: backlog-view.tsx 行 105-119 の title cell button (= edit dialog open trigger)
 *   は data-testid のみで aria-label が無い。Backlog table は多数の row を含み、
 *   visible text (= title) のみで「button としての操作意図 (=編集)」が SR には
 *   伝わらない。Kanban / Today / Inbox は同 pattern で `aria-label="「${item.title}」を編集"`
 *   を持つ (iter331 etc) が、Backlog のみ漏れ。
 *
 * fix (1 ファイル ~1 行差分):
 *   - title button に aria-label={`「${String(getValue())}」を編集`}
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、data-testid / className / onClick /
 * onPointerDown invariant 維持、iter331 (Kanban edit aria-label pattern) と整合。
 *
 * 検証: source-side regex assert + iter515-530 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. title button aria-label
  if (
    /data-testid=\{`backlog-title-\$\{row\.original\.id\}`\}\s+aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}/.test(
      bv,
    ) ||
    /aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}\s+data-testid=\{`backlog-title-\$\{row\.original\.id\}`\}/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `backlog-view.tsx: title button aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view.tsx: title button aria-label 不在`,
    })
  }

  // 2. iter331 invariant: kanban-view 「編集」 aria-label pattern 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`「\$\{item\.title\}」を編集`\}/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter331 invariant: kanban-view 編集 aria-label pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter331 invariant: kanban-view aria-label 破壊`,
    })
  }

  // 3. iter515-530 invariant cross-check (anchor 4 件)
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

  console.log(`\n=== Findings (backlog-title-aria-label-iter531) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
