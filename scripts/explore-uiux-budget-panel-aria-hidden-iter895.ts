/**
 * Phase 6.15 loop iter 895 (mode-D Desktop a11y) —
 * budget-panel 3 button (budget-edit-btn / budget-edit-cancel / budget-save-btn) の
 * WCAG 2.5.3 (Label in Name) 違反 を一括修正 + visible aria-hidden 統合。
 *
 * 課題: src/components/workspace/budget-panel.tsx の AI 月次コスト上限編集 form の 3 button:
 *   - budget-edit-btn (visible "上限を変更") 旧 aria-label "AI 月次コスト上限と警告閾値の編集モードを開く" は "上限を変更" 含まず → WCAG 2.5.3 違反
 *   - budget-edit-cancel (visible "キャンセル") aria-label substring 適合だが campaign 規約から外れていた
 *   - budget-save-btn (visible "保存中…/保存") aria-label substring 適合だが campaign 規約から外れていた
 *
 * fix (1 ファイル / +6-3 行差分、3 button 一括):
 *   - budget-edit-btn aria-label: `上限を変更 (AI 月次コスト上限と警告閾値の編集モードを開く)` + visible wrap
 *   - budget-edit-cancel aria-label: `キャンセル (AI 月次コスト上限の編集を破棄)` + visible wrap
 *   - budget-save-btn aria-label: `保存中… (...)` / `保存 (...)` 形 + visible wrap
 *
 * 検証: source-side regex assert + iter893/894 invariant cross-check。
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

  // 1. budget-edit-btn aria-label に "上限を変更" prefix
  if (/aria-label="上限を変更 \(AI 月次コスト上限と警告閾値の編集モードを開く\)"/.test(bp)) {
    findings.push({
      level: 'info',
      message: `budget-edit-btn aria-label に "上限を変更" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-edit-btn aria-label が "上限を変更" prefix 不含`,
    })
  }

  // 2. budget-edit-btn visible "上限を変更" aria-hidden
  if (/data-testid="budget-edit-btn"[\s\S]+?<span aria-hidden="true">上限を変更<\/span>/.test(bp)) {
    findings.push({
      level: 'info',
      message: `budget-edit-btn visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-edit-btn visible aria-hidden 未統合`,
    })
  }

  // 3. budget-edit-cancel aria-label に "キャンセル" prefix + visible aria-hidden
  if (/aria-label="キャンセル \(AI 月次コスト上限の編集を破棄\)"/.test(bp)) {
    findings.push({
      level: 'info',
      message: `budget-edit-cancel aria-label に "キャンセル" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-edit-cancel aria-label が "キャンセル" prefix 不含`,
    })
  }
  if (
    /data-testid="budget-edit-cancel"[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `budget-edit-cancel visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `budget-edit-cancel visible aria-hidden 未統合` })
  }

  // 4. budget-save-btn aria-label に "保存" prefix + visible aria-hidden
  if (
    /'保存中… \(AI 月次コスト上限を保存中\)'[\s\S]+?'保存 \(AI 月次コスト上限と警告閾値を保存\)'/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `budget-save-btn aria-label 両状態 visible prefix 適合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-save-btn aria-label visible prefix 不適合`,
    })
  }
  if (
    /data-testid="budget-save-btn"[\s\S]+?<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `budget-save-btn visible 切替 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `budget-save-btn visible aria-hidden 未統合` })
  }

  // iter894 invariant: sprint-defaults-edit
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`編集 \(Sprint デフォルト 現在: \$\{DOW_JA\[cur\.startDow\]\}曜開始 \/ \$\{cur\.lengthDays\} 日 を編集モードで開く\)`\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter894 invariant: sprint-defaults-edit aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter894 invariant: sprint-defaults-edit 破壊` })
  }

  console.log(`\n=== Findings (budget-panel-aria-hidden-iter895) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
