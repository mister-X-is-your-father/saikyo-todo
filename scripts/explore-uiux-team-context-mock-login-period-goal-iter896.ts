/**
 * Phase 6.15 loop iter 896 (mode-D Desktop a11y) —
 * 3 surface (team-context-save-btn / mock-login-form Unicode + visible aria-hidden /
 * personal-period-view period-goal-save WCAG 2.5.3 fix) を一括修正。
 *
 * 課題:
 *   - team-context-editor team-context-save-btn (visible "保存中…/保存") aria-label substring 適合だが campaign 統一漏れ
 *   - mock-login-form submit (visible "認証中..." 3 dots ASCII) は aria-label "認証中… (Unicode)" と Unicode mismatch (iter879/881/882/888 と同 root)
 *   - personal-period-view period-goal-save (visible "ゴール保存") aria-label "...ゴールを保存" の `を` 挿入で substring 不適合 → WCAG 2.5.3 違反
 *
 * fix (3 ファイル / +5-3 行差分、3 fix 一括):
 *   - team-context save: visible 切替 wrap
 *   - mock-login: visible '認証中...' → '認証中…' (Unicode 統一) + wrap
 *   - period-goal-save aria-label: `保存中… (${period}ゴールを保存中)` / `ゴール保存 (${period}のゴール文を保存)` 形 + visible wrap
 *
 * 検証: source-side regex assert + iter894/895 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  const pp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // 1. team-context-save-btn visible aria-hidden
  if (
    /data-testid="team-context-save-btn"[\s\S]+?<span aria-hidden="true">\{upd\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      tc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `team-context-save-btn visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `team-context-save-btn visible aria-hidden 未統合` })
  }

  // 2. mock-login submit Unicode 統一 + visible aria-hidden
  if (/<span aria-hidden="true">\{isPending \? '認証中…' : 'ログイン'\}<\/span>/.test(ml)) {
    findings.push({
      level: 'info',
      message: `mock-login submit visible Unicode 統一 + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-login submit visible 破壊` })
  }
  if (!/'認証中\.\.\.' : 'ログイン'/.test(ml)) {
    findings.push({
      level: 'info',
      message: `mock-login 旧 visible '認証中...' (3 dots) 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-login 旧 visible '認証中...' 残存` })
  }

  // 3. period-goal-save aria-label visible prefix + visible aria-hidden
  if (
    /`保存中… \(\$\{periodLabelJa\(period\)\}ゴールを保存中\)`[\s\S]+?`ゴール保存 \(\$\{periodLabelJa\(period\)\}のゴール文を保存\)`/.test(
      pp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `period-goal-save aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `period-goal-save aria-label visible prefix 不含`,
    })
  }
  if (
    /<span aria-hidden="true">\s*\{upsertGoal\.isPending \? '保存中…' : 'ゴール保存'\}\s*<\/span>/.test(
      pp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `period-goal-save visible 切替 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `period-goal-save visible aria-hidden 未統合` })
  }

  // iter895 invariant: budget-edit-btn aria-label
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/aria-label="上限を変更 \(AI 月次コスト上限と警告閾値の編集モードを開く\)"/.test(bp)) {
    findings.push({
      level: 'info',
      message: `iter895 invariant: budget-edit-btn aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter895 invariant: budget-edit-btn 破壊` })
  }

  console.log(`\n=== Findings (team-context-mock-login-period-goal-iter896) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
