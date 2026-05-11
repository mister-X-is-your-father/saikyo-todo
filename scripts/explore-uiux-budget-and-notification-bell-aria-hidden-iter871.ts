/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * budget-panel.tsx 3 button + notification-bell.tsx 全て既読 button visible text を
 * aria-hidden span に統合 (一括 4 件)。
 *
 * 課題:
 *   - budget-panel.tsx 198: 「上限を変更」 (edit-mode open)
 *   - budget-panel.tsx 286: 「キャンセル」 (edit cancel)
 *   - budget-panel.tsx 301: 「保存 / 保存中…」 (edit save 条件付き)
 *   - notification-bell.tsx 203: 「全て既読」 (mark-all-read button、CheckCheck icon + text)
 *   全 aria-label が完全 content (操作 + 件数 / 状態) を含むのに visible に aria-hidden 無し → SR 再 announce。
 *
 * fix (2 ファイル 4 行差分):
 *   - 4 visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter870/869/868/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  const checks: Array<[RegExp, string]> = [
    [/<span aria-hidden="true">上限を変更<\/span>/, '上限を変更 (budget edit-mode)'],
    [/<span aria-hidden="true">キャンセル<\/span>/, 'キャンセル (budget edit)'],
    [
      /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/,
      '保存 (budget edit、条件付き)',
    ],
  ]
  for (const [re, label] of checks) {
    if (re.test(bp)) {
      findings.push({ level: 'info', message: `budget-panel "${label}" aria-hidden 統合 OK` })
    } else {
      findings.push({ level: 'warning', message: `budget-panel "${label}" 未統合` })
    }
  }

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-bell 「全て既読」 mark-all-read aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell 「全て既読」 未統合`,
    })
  }

  // iter870 invariant
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: bulk-action-bar 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // iter869 invariant
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: item-edit-dialog アーカイブ 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (budget-and-notification-bell-aria-hidden-iter871) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
