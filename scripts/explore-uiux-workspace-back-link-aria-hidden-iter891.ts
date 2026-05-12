/**
 * Phase 6.15 loop iter 891 (mode-D Desktop a11y) —
 * (workspace)/[workspaceId]/page.tsx 「一覧」 戻る Link 内 visible
 * "← 一覧" を完全に aria-hidden 化 (iter800-890 sweep の続編)。
 *
 * 課題: 行 90-92 の Link は aria-label "Workspace 一覧へ戻る" を持ち、visible は
 *   "← " (aria-hidden 済) + "一覧" (aria-hidden 無し) で分かれていた → SR で
 *   aria-label とは別に "一覧" だけが追加 announce される可能性。
 *   一括 wrap で aria-hidden を単一 path 化。
 *
 * fix (1 ファイル ~2 行差分):
 *   - "← " + "一覧" の 2 fragment を統合した <span aria-hidden="true">← 一覧</span> に置換
 *
 * 検証: source-side regex assert + iter735/888/889/890 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const p = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(p)) {
    findings.push({
      level: 'info',
      message: `iter891: workspace back link aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter891: back link aria-hidden 統合不在`,
    })
  }

  // iter890 invariant: backlog row buttons aria-hidden 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter890 invariant: backlog row buttons aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter890 invariant: 破壊` })
  }

  // iter889 invariant: archive-title-link aria-hidden 維持
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter889 invariant: archive-title-link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter889 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter891) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
