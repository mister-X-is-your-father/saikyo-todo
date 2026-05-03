/**
 * Phase 6.15 loop iter 712 (mode-D Desktop a11y) —
 * comment-thread コメント編集 form footer に role=group + aria-label 追加
 * (iter711 sweep の続き、同 file 内 2 つ目 actions row)。
 *
 * 課題: comment-thread.tsx 行 242 の編集 form footer (キャンセル / 保存 button) は
 *   role / aria-label 無し。iter711 で「自分のコメント操作」 group を追加したが、
 *   editing=true 時の form footer は別の actions row。
 *
 * fix (1 ファイル ~5 行差分):
 *   - footer に `role="group"` + `aria-label="コメント編集の操作 (キャンセル / 保存)"`
 *
 * 検証: source-side regex assert + iter515-711 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  // 1. comment edit form footer role=group + aria-label
  if (/role="group"\s*\n\s*aria-label="コメント編集の操作 \(キャンセル \/ 保存\)"/.test(ct)) {
    findings.push({ level: 'info', message: `comment edit form footer role=group + aria OK` })
  } else {
    findings.push({ level: 'warning', message: `comment edit form footer role=group + aria なし` })
  }

  // 2. iter711 invariant: comment isOwn actions 維持
  if (/role="group"\s*\n\s*aria-label="自分のコメント操作 \(編集 \/ 削除\)"/.test(ct)) {
    findings.push({ level: 'info', message: `iter711 invariant: comment isOwn actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter711 invariant: 破壊` })
  }

  // 3. iter710 invariant: integrations source-card actions 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Source「\$\{src\.name\}」の操作 \(pull \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter710 invariant: integrations actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter710 invariant: 破壊` })
  }

  // 4. iter704 invariant: budget-panel actions 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/aria-label="AI 月次コスト上限編集の操作 \(キャンセル \/ 保存\)"/.test(bp)) {
    findings.push({ level: 'info', message: `iter704 invariant: budget-panel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter704 invariant: 破壊` })
  }

  // 5. iter703 invariant: goal-card actions 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter703 invariant: goal-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter703 invariant: 破壊` })
  }

  console.log(`\n=== Findings (comment-edit-actions-iter712) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
