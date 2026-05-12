/**
 * Phase 6.15 loop iter 887 (mode-D Desktop a11y) —
 * kanban-view.tsx kanban-title button 内 visible "{item.title}" を aria-hidden
 * span で wrap (iter800-886 sweep の続編)。
 *
 * 課題: kanban-view.tsx 行 332-339 の kanban-title-{id} button は aria-label
 *   "「{title}」を編集" を持つのに、内側 visible "{item.title}" は aria-hidden
 *   無し → SR で重複読み上げ可能性 (aria-label の title 部と visible title)。
 *   Kanban view の各 card title 行で頻出。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{item.title}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/884/885/886 invariant cross-check。
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
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter887: kanban-title button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter887: kanban-title aria-hidden 不在`,
    })
  }

  // iter886 invariant: notification-item <p> aria-hidden 維持
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<p className="text-xs leading-snug" aria-hidden="true">/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter886 invariant: notification-item <p> aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter886 invariant: 破壊` })
  }

  // iter885 invariant: assignee-picker label aria-hidden 維持
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if ((ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter885 invariant: assignee-picker label aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter885 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter887) ===`)
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
