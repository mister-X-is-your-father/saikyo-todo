/**
 * Phase 6.15 loop iter 890 (mode-D Desktop a11y) —
 * backlog-view.tsx 2 button (title cell + actions cell 編集) 内 visible を
 * aria-hidden span で wrap (iter800-889 sweep の続編、view row 完結 sweep)。
 *
 * 課題: backlog-view.tsx 行 117 + 183 の 2 Button (backlog-title-{id} +
 *   backlog-edit-{id}) は各 aria-label が完全 content を含むのに、内側 visible
 *   は aria-hidden 無し → SR で重複読み上げ可能性。Backlog テーブルの各 row。
 *   iter887/888/889 view row title 完結 sweep の続編、Backlog 部分。
 *
 * fix (1 ファイル ~2 行差分):
 *   - backlog-title button visible "{getValue()}" を <span aria-hidden="true"> で wrap
 *   - backlog-edit button visible "編集" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/887/888/889 invariant cross-check。
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
  const titleHidden = /<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)
  const editHidden =
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}[\s\S]*?<span aria-hidden="true">編集<\/span>/.test(
      bv,
    )
  if (titleHidden && editHidden) {
    findings.push({
      level: 'info',
      message: `iter890: backlog-view 2 button (title + edit) aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter890: 不完全 (title=${titleHidden} edit=${editHidden})`,
    })
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

  // iter888 invariant: 3 view row title aria-hidden 維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /data-testid=\{`today-title-\$\{it\.id\}`\}[\s\S]*?<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter888 invariant: today row title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter888 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter890) ===`)
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
