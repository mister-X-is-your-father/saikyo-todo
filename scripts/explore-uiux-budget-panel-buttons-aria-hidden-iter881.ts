/**
 * Phase 6.15 loop iter 881 (mode-D Desktop a11y) —
 * budget-panel 3 button (上限を変更 / キャンセル / 保存) visible を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/budget-panel.tsx の 3 button:
 *   - budget-edit-btn (visible "上限を変更")
 *   - budget-edit-cancel (visible "キャンセル")
 *   - budget-save-btn (visible "保存中…/保存")
 *
 *   aria-label が完全 content を含むのに visible が aria-hidden 無し →
 *   SR 2 経路読み上げ重複。AI コスト管理 panel の主要 button、iter844-880 と
 *   同 vocabulary。
 *
 * fix (1 ファイル +3/-3 行):
 *   - 3 button visible text を <span aria-hidden="true">...</span> で wrap
 *
 * 検証: source-side regex assert + iter880 / iter879 invariant cross-check。
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

  const checks: Array<[string, RegExp]> = [
    [
      'edit-btn',
      /data-testid="budget-edit-btn"[\s\S]*?<span aria-hidden="true">上限を変更<\/span>/,
    ],
    [
      'cancel',
      /data-testid="budget-edit-cancel"[\s\S]*?<span aria-hidden="true">キャンセル<\/span>/,
    ],
    [
      'save',
      /data-testid="budget-save-btn"[\s\S]*?<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/,
    ],
  ]
  for (const [name, re] of checks) {
    if (re.test(bp)) {
      findings.push({ level: 'info', message: `iter881: budget ${name} aria-hidden OK` })
    } else {
      findings.push({ level: 'warning', message: `iter881: budget ${name} aria-hidden 不完全` })
    }
  }

  // iter880 invariant
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(idp) &&
    /<span aria-hidden="true">解除<\/span>/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `iter880 invariant: item-dependencies add/remove 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter880 invariant: 破壊` })
  }

  console.log(`\n=== Findings (budget-panel-buttons-aria-hidden-iter881) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
