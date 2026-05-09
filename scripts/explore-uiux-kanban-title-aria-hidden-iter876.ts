/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y) —
 * kanban-view title button visible {item.title} を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/kanban-view.tsx 行 325-339 の kanban-title
 *   button は aria-label "「title」を編集" が完全 content を含むのに visible
 *   {item.title} は aria-hidden 無し → SR 2 経路読み上げ重複。Kanban カラムが
 *   複数並ぶ画面で 1 column ごとに N 件 card が並ぶため、SR で title が 2 回ずつ
 *   読まれる累積 noise (1 card あたり 編集 ✎ icon button は別途 iter331 で済)。
 *   iter870 (backlog title) と sibling な list 行 title fix。iter844-875 と同 vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">{item.title}</span>
 *
 * 検証: source-side regex assert + iter870 (backlog title) / iter875 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )

  if (
    /data-testid=\{`kanban-title-\$\{item\.id\}`\}[\s\S]*?<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      kv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter876: kanban-title button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter876: kanban-title button aria-hidden 不完全`,
    })
  }

  // iter331 invariant: edit ✎ icon button aria-hidden span (existing)
  if (/<span aria-hidden="true">✎<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter331 invariant: kanban edit ✎ button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter331 invariant: 破壊` })
  }

  // iter870 invariant: backlog title aria-hidden
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: backlog title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // iter875 invariant: notification mark-all-read aria-hidden
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: notification mark-all-read 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
  }

  console.log(`\n=== Findings (kanban-title-aria-hidden-iter876) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
