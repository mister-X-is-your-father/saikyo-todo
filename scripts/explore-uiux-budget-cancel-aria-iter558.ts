/**
 * Phase 6.15 loop iter 558 (mode-D Desktop a11y) —
 * BudgetPanel inline edit cancel Button に aria-label + data-testid を補完。
 *
 * 課題: budget-panel.tsx 行 249-258 の cancel Button は visible text "キャンセル" のみ
 *   + disabled (pending block) ありで aria-label / data-testid 不在。8 dialog/form footer
 *   cancel 統一の一環。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="AI 月次コスト上限の編集をキャンセル"
 *   - data-testid="budget-edit-cancel"
 *
 * iter543 (wf) / iter544 (item-edit) / iter545 (schedule) / iter546 (proposal) /
 * iter547 (comment) / iter548 (sprint period+defaults) cancel pattern に揃え、
 * 9 form/dialog footer 統一達成。
 *
 * 検証: source-side regex assert + iter515-557 invariant cross-check。
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

  // 1. budget-edit-cancel aria-label + data-testid
  if (
    /data-testid="budget-edit-cancel"\s+aria-label="AI 月次コスト上限の編集をキャンセル"/.test(
      bp,
    ) ||
    /aria-label="AI 月次コスト上限の編集をキャンセル"\s+data-testid="budget-edit-cancel"/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `budget-panel.tsx: budget-edit-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: budget-edit-cancel aria-label / data-testid 不在`,
    })
  }

  // 2. iter553 invariant: budget-form aria-label 維持
  if (
    /aria-label="AI 月次コスト上限編集フォーム"/.test(bp) &&
    /data-testid="budget-edit-form"/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `iter553 invariant: budget form aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter553 invariant: 破壊`,
    })
  }

  // 3. iter524 invariant: budget-save-btn aria-busy 維持
  if (
    /data-testid="budget-save-btn"[\s\S]{0,200}aria-busy=\{update\.isPending \|\| undefined\}|aria-busy=\{update\.isPending \|\| undefined\}[\s\S]{0,200}data-testid="budget-save-btn"/.test(
      bp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter524 invariant: budget-save-btn aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter524 invariant: 破壊`,
    })
  }

  // 4. iter557 invariant: proposal edit form aria-label 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`提案「\$\{proposal\.title\}」の編集フォーム`\}/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter557 invariant: proposal edit form aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter557 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (budget-cancel-aria-iter558) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
