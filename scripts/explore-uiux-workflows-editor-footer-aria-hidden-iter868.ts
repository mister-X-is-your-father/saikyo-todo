/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * workflows-panel Workflow editor DialogFooter キャンセル + 保存 button: visible
 * text を span aria-hidden で wrap (一括 campaign 拡張)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の Workflow 編集 dialog footer
 *   2 button (wf-editor-cancel / wf-editor-save) は aria-label が visible 完全
 *   含むため WCAG 2.5.3 適合だったが、iter867 の trigger preset と同じく campaign
 *   規約 (visible aria-hidden 単独経路) から外れていた。
 *
 * fix (1 ファイル / +2-2 行差分、2 button 一括):
 *   - <Button>キャンセル</Button> → <Button><span aria-hidden="true">キャンセル</span></Button>
 *   - <Button>{saving ? '保存中…' : '保存'}</Button> → <Button><span aria-hidden="true">{...}</span></Button>
 *
 * 検証: source-side regex assert + iter865-867 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. wf-editor-cancel visible "キャンセル" span aria-hidden
  if (
    /data-testid=\{`wf-editor-cancel-\$\{wf\.id\}`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-cancel visible "キャンセル" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-editor-cancel visible "キャンセル" aria-hidden 未統合`,
    })
  }

  // 2. wf-editor-save visible 保存中…/保存 span aria-hidden
  if (
    /data-testid=\{`wf-editor-save-\$\{wf\.id\}`\}[\s\S]+?<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-save visible 保存中…/保存 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-editor-save visible 保存中…/保存 aria-hidden 未統合`,
    })
  }

  // 3. aria-label cancel 維持
  if (/aria-label=\{`Workflow「\$\{wf\.name\}」の編集をキャンセル`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-editor-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-editor-cancel aria-label 破壊` })
  }

  // 4. aria-label save 両状態維持
  if (
    /Workflow「\$\{wf\.name\}」の編集を保存中…[\s\S]+?Workflow「\$\{wf\.name\}」の graph \/ trigger を保存/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-save aria-label 両状態維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-editor-save aria-label 破壊` })
  }

  // iter867 invariant: trigger preset 4 button
  const allKindsOk = ['manual', 'cron', 'item-event', 'webhook'].every((k) =>
    new RegExp(`<span aria-hidden="true">${k}</span>`).test(wp),
  )
  if (allKindsOk) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: trigger preset 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: trigger preset 破壊` })
  }

  // iter866 invariant: goal-reactivate
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /`Goal「\$\{goal\.title\}」を active に戻す \(現状態 → active 遷移、再開して KR を更新可能に\)`/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: goal-reactivate aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: goal-reactivate 破壊` })
  }

  console.log(`\n=== Findings (workflows-editor-footer-aria-hidden-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
