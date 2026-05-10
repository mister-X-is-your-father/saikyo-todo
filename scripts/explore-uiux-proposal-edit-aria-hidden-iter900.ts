/**
 * Phase 6.15 loop iter 900 (mode-D Desktop a11y) —
 * decompose-proposals-panel proposal-edit-cancel + proposal-save 2 button visible
 * aria-hidden 統合 (一括 campaign 拡張、iter842 で wrap した accept/reject 系の続き)。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx の編集 form 内
 *   2 button は iter842 (accept-all/reject-all + accept/reject 4 button) で対応漏れ:
 *   - proposal-edit-cancel (visible "キャンセル") aria-label 適合だが campaign 漏れ
 *   - proposal-save (visible "保存中…/保存") aria-label 適合だが campaign 漏れ
 *
 * fix (1 ファイル / +2-2 行差分、2 button 一括):
 *   - proposal-edit-cancel: <Button>キャンセル</Button> → <Button><span aria-hidden="true">キャンセル</span></Button>
 *   - proposal-save: <Button>{保存中…/保存}</Button> → <Button><span aria-hidden="true">{...}</span></Button>
 *
 * 検証: source-side regex assert + iter898/899 invariant cross-check。
 *
 * milestone: iter900 達成 — Phase 6.15 loop の visible aria-hidden + WCAG 2.5.3
 * campaign は ~50 iter / ~130 button 横断で実質完結。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. proposal-edit-cancel visible aria-hidden
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `proposal-edit-cancel visible "キャンセル" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposal-edit-cancel visible aria-hidden 未統合`,
    })
  }

  // 2. proposal-save visible 保存中…/保存 aria-hidden
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-save`\}[\s\S]+?<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `proposal-save visible 保存中…/保存 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposal-save visible aria-hidden 未統合`,
    })
  }

  // iter842 invariant: 既存 4 button (accept-all/reject-all + accept/reject) aria-hidden 維持
  if (/<span aria-hidden="true">全て採用<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter842 invariant: proposals-accept-all aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter842 invariant: proposals-accept-all 破壊` })
  }
  if (/<span aria-hidden="true">✓ 採用<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter842 invariant: proposal-accept aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter842 invariant: proposal-accept 破壊` })
  }

  // iter899 invariant: operation-board aria-hidden
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(ob)) {
    findings.push({
      level: 'info',
      message: `iter899 invariant: operation-board done-yesterday aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter899 invariant: operation-board done-yesterday 破壊`,
    })
  }

  console.log(`\n=== Findings (proposal-edit-aria-hidden-iter900) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
