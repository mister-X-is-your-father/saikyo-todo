/**
 * Phase 6.15 loop iter 893 (mode-D Desktop a11y) —
 * goals-panel kr-add-btn (Key Result 追加 button) の WCAG 2.5.3 (Label in Name)
 * 違反 (KR 略語 vs Key Result 正式名 token mismatch) を修正 + visible aria-hidden 統合。
 *
 * 課題: src/components/workspace/goals-panel.tsx の kr-add-btn:
 *   - visible "KR 追加" は abbreviation "KR" を使うが、旧 aria-label "Key Result を ... 追加" は
 *     full form "Key Result" + "を" + "Goal に" + "追加" で乖離 → "KR 追加" substring 不適合
 *   - 同様 pending "Key Result を追加中…" には "KR 追加" 完全に含まず → WCAG 2.5.3 違反
 *
 * fix (1 ファイル / +3-3 行差分):
 *   - aria-label normal: `KR 追加 (Key Result をこの Goal に追加)` → visible prefix 適合 (略語 + 補足 full form)
 *   - aria-label pending: `KR 追加中… (Key Result を追加中)` → visible "KR 追加" prefix 適合
 *   - aria-label invalid: `KR 追加: Key Result を追加するにはタイトルを入力してください` → "KR 追加" prefix
 *   - visible "KR 追加" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter891/892 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. normal aria-label に "KR 追加" prefix
  if (/'KR 追加 \(Key Result をこの Goal に追加\)'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `kr-add-btn normal aria-label に "KR 追加" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kr-add-btn normal aria-label が "KR 追加" prefix 不含`,
    })
  }

  // 2. pending aria-label に "KR 追加中…" prefix
  if (/'KR 追加中… \(Key Result を追加中\)'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `kr-add-btn pending aria-label に "KR 追加中…" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kr-add-btn pending aria-label が "KR 追加中…" prefix 不含`,
    })
  }

  // 3. invalid aria-label にも "KR 追加" prefix
  if (/'KR 追加: Key Result を追加するにはタイトルを入力してください'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `kr-add-btn invalid aria-label に "KR 追加" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kr-add-btn invalid aria-label が "KR 追加" prefix 不含`,
    })
  }

  // 4. visible "KR 追加" span aria-hidden
  if (
    /data-testid=\{`kr-add-btn-\$\{goalId\}`\}[\s\S]+?<span aria-hidden="true">KR 追加<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `kr-add-btn visible "KR 追加" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kr-add-btn visible aria-hidden 未統合`,
    })
  }

  // iter892 invariant: notification mark-all-read aria-label
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/`全て既読 \(未読 \$\{unreadCount\} 件をすべて既読化\)`/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter892 invariant: notification mark-all-read aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter892 invariant: notification mark-all-read 破壊`,
    })
  }

  console.log(`\n=== Findings (kr-add-label-in-name-iter893) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
