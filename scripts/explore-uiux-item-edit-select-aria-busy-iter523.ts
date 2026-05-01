/**
 * Phase 6.15 loop iter 523 (mode-D Desktop a11y) —
 * ItemEditDialog Sprint / KR select に aria-busy を補完
 * (iter521-522 form aria-busy pattern を select 要素にも展開)。
 *
 * 課題: item-edit-dialog.tsx の 2 つの select (editSprint / editKr) は
 *   disabled={assignSprint.isPending} / disabled={assignKr.isPending} で
 *   pending 時の入力を block するが、aria-busy 不在で SR は単に「無効」と
 *   読むだけで「処理中」状態が伝わらない。disabled は禁止状態、aria-busy は
 *   処理進行中の意味で異なる (両方付ければ意味が明確)。
 *
 * fix (1 ファイル ~2 行差分):
 *   - editSprint select に aria-busy={assignSprint.isPending || undefined}
 *   - editKr select に aria-busy={assignKr.isPending || undefined}
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、disabled / data-testid /
 * 既存 onChange / Label htmlFor 関連付け 全維持。
 *
 * 検証: source-side regex assert + iter515-522 invariant cross-check。
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

  // 1. editSprint aria-busy
  if (
    /id="editSprint"[\s\S]*?disabled=\{assignSprint\.isPending\}\s+aria-busy=\{assignSprint\.isPending \|\| undefined\}/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: editSprint select aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: editSprint select aria-busy 不在`,
    })
  }

  // 2. editKr aria-busy
  if (
    /id="editKr"[\s\S]*?disabled=\{assignKr\.isPending\}\s+aria-busy=\{assignKr\.isPending \|\| undefined\}/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: editKr select aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: editKr select aria-busy 不在`,
    })
  }

  // 3. 既存 data-testid 維持 (edit-item-sprint / edit-item-kr)
  if (/data-testid="edit-item-sprint"/.test(ied) && /data-testid="edit-item-kr"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: 既存 data-testid (sprint / kr) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: 既存 data-testid 破壊`,
    })
  }

  // 4. iter515-522 invariant cross-check
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
  const cw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok516 = /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴/.test(wp)
  const ok517 = /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分/.test(al)
  const ok518 = /aria-controls="operation-board-done-yesterday-list"/.test(obw)
  const ok519 = /aria-controls=\{`goal-body-\$\{goal\.id\}`\}/.test(gp)
  const ok520 = /data-testid="decompose-proposals-status"/.test(dpp)
  const ok521 = /data-testid="create-workspace-submit"/.test(cw)
  const ok522 = /data-testid="login-submit"/.test(lf)
  if (ok515 && ok516 && ok517 && ok518 && ok519 && ok520 && ok521 && ok522) {
    findings.push({
      level: 'info',
      message: `iter515-522 invariant: 8 件 a11y pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-522 invariant: 破壊 (515=${ok515} 516=${ok516} 517=${ok517} 518=${ok518} 519=${ok519} 520=${ok520} 521=${ok521} 522=${ok522})`,
    })
  }

  console.log(`\n=== Findings (item-edit-select-aria-busy-iter523) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
