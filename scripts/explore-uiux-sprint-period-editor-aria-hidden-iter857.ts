/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * sprints-panel sprint-period inline editor キャンセル + 保存 button: visible
 * text を span aria-hidden で wrap (campaign 統一)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の per-sprint inline 期間
 *   editor (line 660-696) のキャンセル / 保存 button は aria-label が visible
 *   完全含むため WCAG 2.5.3 適合だったが、iter836/837 で Sprint 作成 form と
 *   sprint-defaults form は wrap 済、per-sprint 期間 inline editor は未対応。
 *
 * fix (1 ファイル / +2-2 行差分):
 *   - <Button>キャンセル</Button> → <Button><span aria-hidden="true">キャンセル</span></Button>
 *   - <Button>{update.isPending ? '保存中…' : '保存'}</Button> →
 *     <Button><span aria-hidden="true">{...}</span></Button>
 *
 * 検証: source-side regex assert + iter849-856 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-period-cancel visible "キャンセル" を span aria-hidden で wrap
  if (
    /data-testid=\{`sprint-period-cancel-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-period-cancel visible "キャンセル" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-period-cancel visible "キャンセル" aria-hidden 未統合`,
    })
  }

  // 2. sprint-period-save visible 保存中…/保存 を span aria-hidden で wrap
  if (
    /data-testid=\{`sprint-period-save-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-period-save visible 保存中…/保存 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-period-save visible 保存中…/保存 aria-hidden 未統合`,
    })
  }

  // 3. aria-label 維持 (cancel)
  if (/aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-period-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-period-cancel aria-label 破壊` })
  }

  // 4. aria-label 維持 (save 両状態)
  if (
    /Sprint「\$\{sprint\.name\}」の期間を保存中…[\s\S]+?Sprint「\$\{sprint\.name\}」の期間を保存/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-period-save aria-label 両状態維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-period-save aria-label 破壊` })
  }

  // iter856 invariant: clear-baseline aria-label "ベースラインクリア" prefix
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /`「\$\{item\.title\}」ベースラインクリア \(現在 \$\{item\.baselineStartDate\} → \$\{item\.baselineEndDate\} を NULL に戻す\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: clear-baseline aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: clear-baseline 破壊` })
  }

  // iter855 invariant: set-baseline aria-label
  if (
    /`「\$\{item\.title\}」ベースライン記録 \(現在の startDate \/ dueDate を当初計画として保存\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: set-baseline aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: set-baseline 破壊` })
  }

  // iter836/837 invariant: sprint create button visible aria-hidden (sprint-create-btn + sprint-defaults form)
  if (
    /data-testid="sprint-create-btn"[\s\S]+?<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter836 invariant: sprint create button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter836 invariant: sprint create 破壊` })
  }

  console.log(`\n=== Findings (sprint-period-editor-aria-hidden-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
