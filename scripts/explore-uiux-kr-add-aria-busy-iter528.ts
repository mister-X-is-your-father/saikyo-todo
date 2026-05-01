/**
 * Phase 6.15 loop iter 528 (mode-D Desktop a11y) —
 * GoalsPanel KR 追加 form の submit Button に aria-busy を補完。
 *
 * 課題: goals-panel.tsx 行 755-771 の KR 追加 Button (kr-add-btn-${goalId}) は
 *   disabled (= !krTitle.trim() || create.isPending) + 3 状態 aria-label 動的付与済
 *   (title 無し / pending / normal) だが aria-busy 不在。SR は disabled (= 禁止) と
 *   pending (= 処理中) を区別できない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - KR 追加 Button に aria-busy={create.isPending || undefined}
 *
 * 機能不変、視覚 layout 不変 (min-h-11 維持)、shadcn 編集なし、disabled / type=submit /
 * aria-label / data-testid / iter95 (KR progressbar / form / disclosure) /
 * iter519 (goal-toggle aria-controls) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-527 invariant cross-check。
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

  // 1. KR add button aria-busy
  if (
    /data-testid=\{`kr-add-btn-\$\{goalId\}`\}[\s\S]{0,300}aria-busy=\{create\.isPending \|\| undefined\}/.test(
      gp,
    ) ||
    /aria-busy=\{create\.isPending \|\| undefined\}[\s\S]{0,300}data-testid=\{`kr-add-btn-\$\{goalId\}`\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: kr-add-btn aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: kr-add-btn aria-busy 不在`,
    })
  }

  // 2. 既存 disabled / aria-label / data-testid 維持
  if (
    /disabled=\{!krTitle\.trim\(\) \|\| create\.isPending\}/.test(gp) &&
    /'Key Result を追加するにはタイトルを入力してください'/.test(gp) &&
    /'Key Result を追加中…'/.test(gp) &&
    /'Key Result をこの Goal に追加'/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: kr-add-btn 既存 disabled / 3 状態 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: kr-add-btn 既存属性破壊`,
    })
  }

  // 3. iter519 (goal-toggle aria-controls) 維持
  if (/aria-controls=\{`goal-body-\$\{goal\.id\}`\}/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter519 invariant: goal-toggle aria-controls 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter519 invariant: goal-toggle aria-controls 破壊`,
    })
  }

  // 4. iter515-527 invariant cross-check (anchor 3 件)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok527 = (dpp.match(/aria-busy=\{disabled \|\| undefined\}/g) ?? []).length === 2
  const ok526 =
    /data-testid="quick-add-submit"[\s\S]{0,200}aria-busy=\{create\.isPending \|\| undefined\}|aria-busy=\{create\.isPending \|\| undefined\}[\s\S]{0,200}data-testid="quick-add-submit"/.test(
      qa,
    )
  if (ok515 && ok527 && ok526) {
    findings.push({
      level: 'info',
      message: `iter515-527 invariant: 重要 anchor 3 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-527 invariant: 破壊 (515=${ok515} 526=${ok526} 527=${ok527})`,
    })
  }

  console.log(`\n=== Findings (kr-add-aria-busy-iter528) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
