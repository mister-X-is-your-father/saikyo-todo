/**
 * Phase 6.15 loop iter 889 (mode-D Desktop a11y) —
 * archived-items-panel.tsx archive-title-link 内 visible "{item.title}" を
 * aria-hidden span で wrap (iter800-888 sweep の続編、iter887/888 row title
 * 完結 sweep の Archive view 部分)。
 *
 * 課題: archived-items-panel.tsx 行 136-143 の archive-title-link Link は
 *   aria-label "「{title}」を開く (archivedAt にアーカイブ)" を持つのに、
 *   内側 visible "{item.title}" は aria-hidden 無し → SR で重複読み上げ可能性。
 *   Archive view の各 row title (Item edit dialog deep-link)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{item.title}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/886/887/888 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter889: archive-title-link aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter889: archive-title-link aria-hidden 不在`,
    })
  }

  // iter888 invariant: 3 view row title aria-hidden 維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`today-title-\$\{it\.id\}`\}[\s\S]*?<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      tv,
    ) &&
    /data-testid=\{`period-title-\$\{period\}-\$\{it\.id\}`\}[\s\S]*?<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter888 invariant: today + personal-period row title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter888 invariant: 破壊` })
  }

  // iter887 invariant: kanban-title aria-hidden 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter887 invariant: kanban-title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter887 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter889) ===`)
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
