/**
 * Phase 6.15 loop iter 878 (mode-D Desktop a11y) —
 * taskchute-view title button visible {item.title} を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/taskchute-view.tsx 行 169-176 の title button
 *   は aria-label "{title} を編集" が完全 content を含むのに visible {item.title}
 *   は aria-hidden 無し → SR 2 経路読み上げ重複。TaskChute mode は 1 列 timeline
 *   で N 件 task が並ぶため、SR で title が 2 回ずつ読まれる累積 noise。
 *   iter870 (backlog) / iter876 (kanban) / iter877 (today) と同 vocabulary、
 *   list 行 title aria-hidden 規約一致達成 (Backlog / Kanban / Today / TaskChute 統一)。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">{item.title}</span>
 *
 * 検証: source-side regex assert + iter877 / iter876 / iter870 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )

  if (
    /aria-label=\{`\$\{item\.title\} を編集`\}[\s\S]*?<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      tcv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter878: taskchute title button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter878: taskchute title button aria-hidden 不完全`,
    })
  }

  // iter877 invariant: today-view title aria-hidden
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: today-title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: 破壊` })
  }

  // iter876 invariant: kanban-title aria-hidden
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: kanban-title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
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

  console.log(`\n=== Findings (taskchute-title-aria-hidden-iter878) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
