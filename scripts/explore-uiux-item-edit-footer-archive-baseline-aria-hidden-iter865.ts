/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * item-edit-dialog DialogFooter の 4 button (アーカイブ復元 / アーカイブ /
 * ベースライン記録|更新 / baseline クリア) visible text を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter839/840 で同 dialog footer の Save/Cancel/Template-as-save 3 button
 *   を wrap 済 → 残 4 button (archive 系 + baseline 系) も同 pattern で sweep。
 *   いずれも aria-label に完全 content を含むのに visible aria-hidden 無し。
 *
 * 修正: 4 button visible text 一括で <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。dynamic 2-3 状態 (pending / baseline 有無) も span 包含。
 *
 * 検証: source-side regex assert + iter735/839/840/849-864 invariant cross-check。
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

  // 1. アーカイブ復元 button visible (dynamic 2 状態) aria-hidden
  if (
    /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog unarchive visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog unarchive visible aria-hidden 未統合`,
    })
  }

  // 2. アーカイブ button visible (dynamic 2 状態) aria-hidden
  if (
    /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog archive visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog archive visible aria-hidden 未統合`,
    })
  }

  // 3. ベースライン記録/更新 button visible (dynamic 3 状態) aria-hidden
  if (
    /<span aria-hidden="true">[\s\S]+?setBaseline\.isPending[\s\S]+?'記録中…'[\s\S]+?'ベースライン更新'[\s\S]+?'ベースライン記録'[\s\S]+?<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog set-baseline visible (dynamic 3 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog set-baseline visible aria-hidden 未統合`,
    })
  }

  // 4. baseline クリア button visible (dynamic 2 状態) aria-hidden
  if (
    /<span aria-hidden="true">[\s\S]+?clearBaseline\.isPending \? 'クリア中…' : 'baseline クリア'[\s\S]+?<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog clear-baseline visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog clear-baseline visible aria-hidden 未統合`,
    })
  }

  // 5. iter839/840 invariant: Save / Cancel / Template-as-save 維持
  if (
    /<span aria-hidden="true">\{update\.isPending \? '保存中\.\.\.' : '保存'\}<\/span>/.test(ied) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(ied) &&
    /<span aria-hidden="true">[\s\S]+?createTemplateFromItem\.isPending \? '保存中…' : 'Template として保存'[\s\S]+?<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter839/840 invariant: Save / Cancel / Template footer aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter839/840 invariant: 破壊` })
  }

  // 6. data-testid 維持
  if (
    /data-testid="item-edit-unarchive"/.test(ied) &&
    /data-testid="item-edit-archive"/.test(ied) &&
    /data-testid="item-edit-clear-baseline"/.test(ied) &&
    /data-testid="item-edit-save"/.test(ied)
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

  // iter864 invariant
  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (
    /<span[\s\S]+?className="flex-1 truncate text-sm"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{entry\.item\.title\}/.test(
      srbw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: sprint-risk-board titleEl aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-edit-footer-archive-baseline-aria-hidden-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
