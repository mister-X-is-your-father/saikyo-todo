/**
 * Phase 6.15 loop iter 888 (mode-M Mobile a11y) —
 * items-board の filter-status + filter-sprint select 2 個に min-h-11 追加
 * (mobile tap target 44x44 適合)。
 *
 * 経緯: iter881-887 続編。filter selects の className が "rounded border px-2 py-1 text-sm" で
 *   高さ ~24px、WCAG 2.5.5 AAA Touch Target 不足 → min-h-11 追加で 44x44 適合。
 *
 * 修正: 2 select (filter-status / filter-sprint) に min-h-11 を追加 (replaceAll で
 *   "rounded border px-2 py-1 text-sm" → "min-h-11 rounded border px-2 py-1 text-sm")。
 *
 * 検証: source-side regex assert + iter735/843/849-887 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. 2 select に min-h-11 が追加されている
  const cnt = (ib.match(/min-h-11 rounded border px-2 py-1 text-sm/g) ?? []).length
  if (cnt >= 2) {
    findings.push({
      level: 'info',
      message: `items-board filter selects (status + sprint) min-h-11 追加 OK (${cnt} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter selects min-h-11 不足 (現在 ${cnt}、期待 2)`,
    })
  }

  // 2. data-testid 維持 (filter-status / filter-sprint)
  if (/data-testid="filter-status"/.test(ib) && /data-testid="filter-sprint"/.test(ib)) {
    findings.push({
      level: 'info',
      message: `items-board filter selects data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter selects data-testid 破壊`,
    })
  }

  // 3. iter871 invariant: MUST のみ label aria-hidden
  if (/<span aria-hidden="true">MUST のみ<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: items-board MUST のみ label aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // 4. iter841 invariant: items-board 9 view-switcher button aria-hidden
  const viewBtnCount = (
    ib.match(
      /<span aria-hidden="true">(?:Today|Inbox|Kanban|Backlog|Gantt|Dashboard|日次|週次|月次)<\/span>/g,
    ) ?? []
  ).length
  if (viewBtnCount >= 9) {
    findings.push({
      level: 'info',
      message: `iter841 invariant: items-board view-switcher 9 button aria-hidden 維持 OK (${viewBtnCount} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter841 invariant: 破壊 (現在 ${viewBtnCount} 箇所)`,
    })
  }

  // iter887 invariant: decompose-proposals h-11
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const dppH11 = (dpp.match(/className="h-11"/g) ?? []).length
  if (dppH11 >= 2) {
    findings.push({
      level: 'info',
      message: `iter887 invariant: decompose-proposals 2 input h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter887 invariant: 破壊` })
  }

  // shadcn UI 編集なし
  const inputUi = readFileSync(resolve(process.cwd(), 'src/components/ui/input.tsx'), 'utf8')
  if (/h-8/.test(inputUi)) {
    findings.push({
      level: 'info',
      message: `shadcn Input default h-8 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `shadcn Input 編集された` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mobile-items-board-filter-selects-h11-iter888) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
