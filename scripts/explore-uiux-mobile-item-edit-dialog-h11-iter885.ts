/**
 * Phase 6.15 loop iter 885 (mode-M Mobile a11y) —
 * item-edit-dialog 内 5 IMEInput (タイトル / 説明 / 開始日 / 期限 / DoD) に
 * className="h-11" 追加 (mobile tap target 44x44 適合)。
 *
 * 経緯: iter881-884 続編。Item edit dialog は workspace の最頻使用 form。
 *   全 5 IMEInput が h-8 (32px) で WCAG 2.5.5 AAA Touch Target 不足。
 *
 * 修正: 5 IMEInput (editTitle / editDescription / editStart / editDue / editDod) に
 *   className="h-11" 追加。
 *
 * 検証: source-side regex assert + iter735/843/849-884 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. 5 IMEInput に className="h-11" (id 別の存在確認)
  const ids = ['editTitle', 'editDescription', 'editStart', 'editDue', 'editDod']
  for (const id of ids) {
    const re = new RegExp(
      `<IMEInput[\\s\\S]+?id="${id}"[\\s\\S]+?className="h-11"|<IMEInput[\\s\\S]+?className="h-11"[\\s\\S]+?id="${id}"`,
    )
    if (re.test(ied)) {
      findings.push({
        level: 'info',
        message: `item-edit-dialog ${id} h-11 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `item-edit-dialog ${id} h-11 未統合`,
      })
    }
  }

  // 2. 5 input data-testid + 機能 維持
  if (
    /data-testid="edit-item-start-date"/.test(ied) &&
    /data-testid="edit-item-due-date"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog data-testid 破壊`,
    })
  }

  // iter884 invariant: templates/sprints/goals h-11
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<IMEInput[\s\S]+?id="tmpl-name"[\s\S]+?className="h-11"/.test(tp) &&
    /<IMEInput[\s\S]+?id="sprint-name"[\s\S]+?className="h-11"/.test(sp) &&
    /<IMEInput[\s\S]+?id="goal-title"[\s\S]+?className="h-11"/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter884 invariant: templates/sprints/goals 主要 input h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter884 invariant: 破壊` })
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

  console.log(`\n=== Findings (mobile-item-edit-dialog-h11-iter885) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
