/**
 * Phase 6.15 loop iter 521 (mode-D Desktop a11y) —
 * CreateWorkspaceForm submit Button に aria-busy + aria-label + data-testid を付与。
 *
 * 課題: create-workspace-form.tsx 行 96-98 の submit Button は
 *   - aria-busy 不在 (= SR が pending 状態を識別できない)
 *   - aria-label 不在 (= visible text "作成"/"作成中..." のみで状態遷移時は "中" を読まない)
 *   - data-testid 不在 (= Playwright 経由 hook 不可)
 *   3 点が他の form (workflows / source / template / sprint 等) との UX 規約と乖離。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-busy={isPending || undefined}
 *   - aria-label={isPending ? 'Workspace を作成中…' : 'Workspace を新規作成'}
 *   - data-testid="create-workspace-submit"
 *
 * 機能不変、視覚 layout 不変 (h-11 w-full 維持)、shadcn 編集なし、disabled / type=submit 維持、
 * iter319 (form aria-busy) / iter402 (enterKeyHint) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-520 invariant cross-check。
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

  // 1. aria-busy
  if (/aria-busy=\{isPending \|\| undefined\}/.test(cw)) {
    findings.push({
      level: 'info',
      message: `create-workspace-form.tsx: submit aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: submit aria-busy 不在`,
    })
  }

  // 2. aria-label dynamic
  if (/aria-label=\{isPending \? 'Workspace を作成中…' : 'Workspace を新規作成'\}/.test(cw)) {
    findings.push({
      level: 'info',
      message: `create-workspace-form.tsx: submit aria-label 動的付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: submit aria-label 不在`,
    })
  }

  // 3. data-testid
  if (/data-testid="create-workspace-submit"/.test(cw)) {
    findings.push({
      level: 'info',
      message: `create-workspace-form.tsx: submit data-testid 付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: submit data-testid 不在`,
    })
  }

  // 4. 既存 form aria-busy (form 全体) 維持 (iter319)
  if (
    /<form\s+onSubmit=\{form\.handleSubmit\(onSubmit, onInvalid\)\}\s+noValidate\s+aria-busy=\{isPending \|\| undefined\}/.test(
      cw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `create-workspace-form.tsx: form 全体 aria-busy (iter319) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: form 全体 aria-busy 破壊`,
    })
  }

  // 5. iter515-520 invariant cross-check
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok516 = /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴/.test(wp)
  const ok517 = /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分/.test(al)
  const ok518 = /aria-controls="operation-board-done-yesterday-list"/.test(obw)
  const ok519 = /aria-controls=\{`goal-body-\$\{goal\.id\}`\}/.test(gp)
  const ok520 = /data-testid="decompose-proposals-status"/.test(dpp)
  if (ok515 && ok516 && ok517 && ok518 && ok519 && ok520) {
    findings.push({
      level: 'info',
      message: `iter515-520 invariant: 6 件 a11y pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-520 invariant: 破壊 (515=${ok515} 516=${ok516} 517=${ok517} 518=${ok518} 519=${ok519} 520=${ok520})`,
    })
  }

  console.log(`\n=== Findings (create-workspace-submit-aria-iter521) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
