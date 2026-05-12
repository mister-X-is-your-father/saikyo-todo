/**
 * Phase 6.15 loop iter 885 (mode-D Desktop a11y) —
 * assignee-picker.tsx 2 CommandItem (user / agent) 内 visible "{label}" を
 * aria-hidden span で wrap (iter884 tag-picker と対称化、picker 完結 sweep)。
 *
 * 課題: assignee-picker.tsx 行 149 + 179 の 2 CommandItem は aria-label が完全
 *   content を含むのに、内側 visible "{label}" は aria-hidden 無し → SR で
 *   二重読み可能性。Item edit dialog → アサイン picker の各候補 row。
 *   user / agent それぞれに発生。
 *
 * fix (1 ファイル ~2 行差分):
 *   - user CommandItem visible "{label}" を <span aria-hidden="true"> で wrap
 *   - agent CommandItem visible "{label}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/882/883/884 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const labelCount = (ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length
  if (labelCount >= 2) {
    findings.push({
      level: 'info',
      message: `iter885: assignee-picker ${labelCount} CommandItem label aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter885: assignee-picker label aria-hidden 不完全 (count=${labelCount})`,
    })
  }

  // iter884 invariant: tag-picker name aria-hidden 維持
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter884 invariant: tag-picker name aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter884 invariant: 破壊` })
  }

  // iter883 invariant: activity-log detail toggle aria-hidden 維持
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: activity-log detail toggle aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter885) ===`)
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
