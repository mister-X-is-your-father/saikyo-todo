/**
 * Phase 6.15 loop iter 978 (mode-D Desktop a11y) — app/(workspace)/[workspaceId]/goals/
 * page.tsx の `<main>` に aria-label="OKR / Goals (Objective + Key Results)" を付与、
 * iter947/954/977 pattern を workspace 2 page 目 (Goals) に展開。
 *
 * fix: page.tsx の <main> に aria-label を付与。+1/-0 行 (1 file)。視覚 / 動作不変。
 *
 * 検証: source-side regex で codify + architecture test 通過確認 (iter952 invariant)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(workspace)/[workspaceId]/goals/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/aria-label="OKR \/ Goals \(Objective \+ Key Results\)"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: main に aria-label "OKR / Goals (Objective + Key Results)" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `goals page main aria-label OK` })
  }

  // iter952 invariant
  if (!/id="main-content"/.test(src) || !/tabIndex=\{-1\}/.test(src)) {
    findings.push({ level: 'warning', message: `iter952 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter952 invariant OK` })
  }

  // iter977 invariant: sprints page aria-label
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (!/aria-label="Sprint 計画 → 稼働 → 完了"/.test(sprintsSrc)) {
    findings.push({ level: 'warning', message: `iter977 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter977 invariant OK` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (goals-page-main-aria-label-iter978) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
