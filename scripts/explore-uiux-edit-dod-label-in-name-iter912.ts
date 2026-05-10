/**
 * Phase 6.15 loop iter 912 (mode-D Desktop a11y) —
 * item-edit-dialog edit-item-dod input aria-label を WCAG 2.5.3 (Label in Name)
 * 適合形に変更 (3 case 一括)。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の edit-item-dod IMEInput は
 *   visible <Label> "DoD (完了条件)" を持つが、旧 aria-label 3 case はいずれも "(完了条件)" を
 *   contiguous substring に持たない:
 *   - empty: "DoD 完了条件 (MUST item は必須、空欄では…)" — "(完了条件)" 不在 (visible 形の括弧構造と異なる)
 *   - blank-only: "DoD (現在 N 文字、空白のみは MUST 保存に不正)" — "(完了条件)" 不在
 *   - normal: "DoD (現在 N 文字、Definition of Done)" — "(完了条件)" 不在
 *   → WCAG 2.5.3 違反 (3 case)。
 *
 * fix (1 ファイル / +3-3 行差分、3 case 一括):
 *   - aria-label を `DoD (完了条件): {制約 / 文字数 / Definition of Done}` 形に統一し
 *     visible "DoD (完了条件)" prefix 適合化
 *
 * 検証: source-side regex assert + iter910/911 invariant cross-check。
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

  // 1. empty aria-label に "DoD (完了条件)" prefix
  if (
    /'DoD \(完了条件\): MUST item は必須、Definition of Done、空欄では保存・done 遷移不可'/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `edit-item-dod empty aria-label に "DoD (完了条件)" prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `edit-item-dod empty aria-label 不含` })
  }

  // 2. blank-only aria-label に prefix
  if (/`DoD \(完了条件\): 現在 \$\{dod\.length\} 文字、空白のみは MUST 保存に不正`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `edit-item-dod blank-only aria-label に prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `edit-item-dod blank-only aria-label 不含` })
  }

  // 3. normal aria-label に prefix
  if (/`DoD \(完了条件\): 現在 \$\{dod\.length\} 文字、Definition of Done`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `edit-item-dod normal aria-label に prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `edit-item-dod normal aria-label 不含` })
  }

  // 4. 旧 aria-label "DoD 完了条件 (MUST" 削除
  if (!/'DoD 完了条件 \(MUST item は必須、空欄では保存・done 遷移不可\)'/.test(ied)) {
    findings.push({
      level: 'info',
      message: `edit-item-dod 旧 aria-label "DoD 完了条件 (MUST..." 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `edit-item-dod 旧 aria-label 残存` })
  }

  // iter911 invariant: var-input aria-label
  const tf = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (/`変数: \$\{v\} \(Mustache 変数「\$\{v\}」、現在 \$\{val\.length\} \/ 500 文字\)`/.test(tf)) {
    findings.push({
      level: 'info',
      message: `iter911 invariant: var-input normal aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter911 invariant: var-input 破壊` })
  }

  console.log(`\n=== Findings (edit-dod-label-in-name-iter912) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
