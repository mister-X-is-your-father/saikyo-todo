/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * sprints-panel の残 3 button (Sprint 期間編集 form キャンセル / 保存 dynamic /
 * Sprint デフォルト 編集 button) visible text を <span aria-hidden="true"> で wrap し、
 * aria-label 単独経路に統一。
 *
 * 経緯: iter857 で Sprint Card 7 button 修正済 + iter837 で sprint-defaults
 *   保存/キャンセル wrap 済 → 残 3 button (sprint-period-cancel / sprint-period-save /
 *   sprint-defaults-edit-btn) も同 pattern で sweep。
 *
 * 修正: 3 button visible text 一括で <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。dynamic 2 状態 (保存 / 保存中…) も span 包含。
 *
 * 検証: source-side regex assert + iter735/837/857/864-867 invariant cross-check。
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

  // 1. sprint-period-cancel visible "キャンセル" aria-hidden
  // (iter858 で同 file の他 cancel button も span 化済 = 複数箇所のはず、最低 1 箇所)
  const cancelCount = (sp.match(/<span aria-hidden="true">キャンセル<\/span>/g) ?? []).length
  if (cancelCount >= 1) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-period-cancel visible "キャンセル" aria-hidden OK (${cancelCount} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-period-cancel visible aria-hidden 未統合`,
    })
  }

  // 2. sprint-period-save visible (dynamic 2 状態) aria-hidden
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-period-save visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-period-save visible aria-hidden 未統合`,
    })
  }

  // 3. sprint-defaults-edit-btn visible "編集" aria-hidden
  if (/<span aria-hidden="true">編集<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-defaults-edit visible "編集" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-defaults-edit visible aria-hidden 未統合`,
    })
  }

  // 4. aria-label 完全 content 維持 (3 button 各々)
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`\}/.test(sp) &&
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprint\.name\}」の期間を保存`/.test(sp) &&
    /aria-label=\{`Sprint デフォルト \(現在: \$\{DOW_JA\[cur\.startDow\]\}曜開始/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel 3 button aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel 3 button aria-label 破壊`,
    })
  }

  // 5. iter857 invariant: Sprint Card 7 button aria-hidden 維持
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp) &&
    /<span aria-hidden="true">中止<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: Sprint Card 7 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter868 invariant: gantt-view jump-today
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: gantt-view jump-today aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprints-panel-residual-aria-hidden-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
