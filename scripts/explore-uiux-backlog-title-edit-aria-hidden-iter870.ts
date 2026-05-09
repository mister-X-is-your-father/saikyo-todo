/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y) —
 * backlog-view title button + edit button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/backlog-view.tsx の 2 button:
 *   - 行 110-120: backlog-title button (visible {String(getValue())} = item title)
 *   - 行 174-186: backlog-edit button (visible "編集")
 *
 *   いずれも aria-label が完全 content (item title + 操作) を含むのに visible が
 *   aria-hidden 無し → SR 2 経路読み上げ重複。Backlog table 1 行ごとに 2 button が
 *   並ぶため、SR で title が 2 回 + edit "編集" が 2 回読まれて行ごとに高ノイズ。
 *   iter857 (archive title-link) と sibling な list 行 title-link fix。
 *   iter844-869 と同 vocabulary。
 *
 * fix (1 ファイル +2/-2 行):
 *   - title button: <span aria-hidden="true">{String(getValue())}</span>
 *   - edit button: <span aria-hidden="true">編集</span>
 *
 * 検証: source-side regex assert + iter857 / iter858 (bulk) / iter869 invariant cross-check。
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

  if (
    /data-testid=\{`backlog-title-\$\{row\.original\.id\}`\}[\s\S]*?<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter870-a: backlog-title button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter870-a: backlog-title button aria-hidden 不完全`,
    })
  }

  if (
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}[\s\S]*?<span aria-hidden="true">編集<\/span>/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter870-b: backlog-edit button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter870-b: backlog-edit button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid 維持
  if (
    /aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}/.test(bv) &&
    /aria-label=\{`「\$\{row\.original\.title\}」を編集`\}/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: 2 button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: aria-label 破壊` })
  }

  // iter857 invariant: archive title-link aria-hidden
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: archive title-link 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  console.log(`\n=== Findings (backlog-title-edit-aria-hidden-iter870) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
