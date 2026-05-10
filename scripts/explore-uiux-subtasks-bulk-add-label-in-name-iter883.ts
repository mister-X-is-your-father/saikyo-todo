/**
 * Phase 6.15 loop iter 883 (mode-D Desktop a11y) —
 * subtasks-panel subtasks-bulk-add-btn: WCAG 2.5.3 (Label in Name) 違反を修正
 * + visible '${N} 件追加' / '${N} 件追加中…' を span aria-hidden で wrap +
 * pending 中も visible に件数を維持。
 *
 * 課題: src/components/workspace/subtasks-panel.tsx の subtasks-bulk-add-btn:
 *   - normal: visible "${N} 件追加" は aria-label "子タスク ${N} 件をまとめて追加" の
 *     "${N} 件" と "追加" の間に "をまとめて" が挿入されて substring 不適合 → WCAG 2.5.3 違反
 *   - pending: visible "追加中…" は aria-label "子タスク ${N} 件を追加中…" の "追加中…" を
 *     含むが、件数 vocab が visible に欠落 (件数情報が SR / 視覚で乖離)
 *
 * fix (1 ファイル / +6-3 行差分):
 *   - aria-label normal: `${N} 件追加 (子タスクをまとめて追加、Cmd/Ctrl+Enter でも可)` → visible prefix 適合
 *   - aria-label pending: `${N} 件追加中… (子タスクをまとめて追加)` → visible prefix 適合
 *   - visible pending: '追加中…' → '${N} 件追加中…' (件数情報を visible にも維持)
 *   - visible 全体を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter880-882 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // 1. normal aria-label に visible '${N} 件追加' prefix
  if (
    /`\$\{pendingTitleCount\} 件追加 \(子タスクをまとめて追加、Cmd\/Ctrl\+Enter でも可\)`/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add normal aria-label に visible '${'${N}'} 件追加' prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-bulk-add normal aria-label が visible '${'${N}'} 件追加' prefix 不含`,
    })
  }

  // 2. pending aria-label に visible '${N} 件追加中…' prefix
  if (/`\$\{pendingTitleCount\} 件追加中… \(子タスクをまとめて追加\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add pending aria-label に visible '${'${N}'} 件追加中…' prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-bulk-add pending aria-label が visible '${'${N}'} 件追加中…' prefix 不含`,
    })
  }

  // 3. visible 切替 span aria-hidden + 件数維持
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? `\$\{pendingTitleCount\} 件追加中…` : `\$\{pendingTitleCount\} 件追加`\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add visible 切替 span aria-hidden + 件数維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-bulk-add visible 切替 aria-hidden 未統合 or 件数不維持`,
    })
  }

  // 4. 旧 aria-label "子タスク ${N} 件を追加中…" / "子タスク ${N} 件をまとめて追加" 削除
  if (!/`子タスク \$\{pendingTitleCount\} 件を追加中…`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add 旧 pending aria-label 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-bulk-add 旧 pending aria-label 残存`,
    })
  }
  if (!/`子タスク \$\{pendingTitleCount\} 件をまとめて追加`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add 旧 normal aria-label 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-bulk-add 旧 normal aria-label 残存`,
    })
  }

  // 5. data-testid 維持
  if (/data-testid="subtasks-bulk-add-btn"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk-add data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk-add data-testid 破壊` })
  }

  // iter882 invariant: quick-add Unicode ellipsis
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter882 invariant: quick-add Unicode ellipsis 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter882 invariant: quick-add 破壊` })
  }

  console.log(`\n=== Findings (subtasks-bulk-add-label-in-name-iter883) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
