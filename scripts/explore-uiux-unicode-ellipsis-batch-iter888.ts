/**
 * Phase 6.15 loop iter 888 (mode-D Desktop a11y) —
 * 残 visible '...' (3 dots ASCII) → '…' (Unicode '…') 統一 batch + mock-top-nav
 * logout button visible aria-hidden 統合。
 *
 * 課題: iter879/881/882 で発見した Unicode ellipsis pattern が以下 2 surface に残存:
 *   - src/components/workspace/create-workspace-form.tsx の visible '作成中...' は
 *     aria-label 'Workspace を作成中…' (Unicode) と substring 不適合 → WCAG 2.5.3 違反
 *   - src/components/workspace/item-edit-dialog.tsx item-edit-save visible '保存中...' は
 *     aria-label '...保存中…' (Unicode) と substring 不適合 → WCAG 2.5.3 違反
 *
 *   さらに src/components/mock-timesheet/mock-top-nav.tsx logout button (visible 'ログアウト')
 *   は aria-label substring 適合だったが iter844-887 campaign 規約から外れていた。
 *
 * fix (3 ファイル / +2-2 行差分、3 fix 一括):
 *   - create-workspace-form: visible '作成中...' → '作成中…' (Unicode 統一)
 *   - item-edit-dialog item-edit-save: visible '保存中...' → '保存中…' (Unicode 統一)
 *   - mock-top-nav logout: <Button>ログアウト</Button> → <Button><span aria-hidden="true">ログアウト</span></Button>
 *
 * 検証: source-side regex assert + iter886/887 invariant cross-check (Unicode ellipsis fix の
 * 5 例目で完結: iter879 / iter881 / iter882 + iter888 の 2 件)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const mn = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )

  // 1. create-workspace-form visible '作成中…' (Unicode)
  if (/<span aria-hidden="true">\{isPending \? '作成中…' : '作成'\}<\/span>/.test(cw)) {
    findings.push({
      level: 'info',
      message: `create-workspace-form visible '作成中…' (Unicode 統一) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form visible '作成中…' Unicode 未統一`,
    })
  }
  if (!/'作成中\.\.\.' : '作成'/.test(cw)) {
    findings.push({
      level: 'info',
      message: `create-workspace-form 旧 visible '作成中...' (3 dots) 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form 旧 visible '作成中...' 残存`,
    })
  }

  // 2. item-edit-save visible '保存中…' (Unicode)
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `item-edit-save visible '保存中…' (Unicode 統一) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-save visible '保存中…' Unicode 未統一`,
    })
  }

  // 3. mock-top-nav logout visible aria-hidden
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(mn)) {
    findings.push({
      level: 'info',
      message: `mock-top-nav logout visible 'ログアウト' span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-top-nav logout visible aria-hidden 未統合`,
    })
  }

  // 4. mock-top-nav aria-label 維持
  if (/aria-label="mock-timesheet session をログアウト"/.test(mn)) {
    findings.push({
      level: 'info',
      message: `mock-top-nav logout aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-top-nav logout aria-label 破壊` })
  }

  // iter887 invariant: gantt-jump-today
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter887 invariant: gantt-jump-today aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter887 invariant: gantt-jump-today 破壊` })
  }

  // iter886 invariant: dep-add
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter886 invariant: dep-add-btn aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter886 invariant: dep-add-btn 破壊` })
  }

  console.log(`\n=== Findings (unicode-ellipsis-batch-iter888) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
