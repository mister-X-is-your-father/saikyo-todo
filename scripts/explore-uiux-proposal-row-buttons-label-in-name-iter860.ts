/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * decompose-proposals-panel ProposalRow 内 個別 button (採用 / 却下 2 件):
 * WCAG 2.5.3 (Label in Name) prefix 適合。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx の ProposalRow 内:
 *   - proposal-${id}-accept: visible "✓ 採用" (aria-hidden 維持済み) vs 旧 aria-label
 *     "「N」を採用して子タスクとして追加" → "採用" は内部 substring、prefix では無く
 *     voice user 発話「採用」と name 先頭不一致 → WCAG 2.5.3 推奨形に未到達
 *   - proposal-${id}-reject: icon-only (X) で visible text 無し、旧 aria-label
 *     「「N」を却下」 → "却下" は末尾 substring、voice user 発話「却下」と name
 *     先頭不一致
 *   iter859 で bulk 4 button を適合化済、本 ProposalRow 個別 button が並走未対応で残る。
 *
 * fix (1 ファイル、2 button 一括 ~3 行差分):
 *   - 各 aria-label を visible / title text prefix 形に変更:
 *     - 採用 → 「採用 (「N」を採用して子タスクとして追加)」 / pending「採用 中… (「N」)」
 *     - 却下 → 「却下 (「N」)」 / pending「却下 中… (「N」)」
 *   - visible "✓ 採用" は元々 aria-hidden 維持。reject は icon-only で visible text 無し
 *     (X icon は元々 aria-hidden)。aria-label の prefix 化のみで適合化。
 *
 * 検証: source-side regex assert + iter850/856/857/858/859 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. accept aria-label visible "採用" prefix
  if (
    /aria-label=\{[\s\S]+?`採用 \(「\$\{proposal\.title\}」を採用して子タスクとして追加\)`/.test(
      dp,
    ) &&
    /aria-label=\{[\s\S]+?`採用 中… \(「\$\{proposal\.title\}」を採用\)`/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposal accept aria-label visible "採用" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposal accept aria-label NG` })
  }

  // 2. accept visible "✓ 採用" aria-hidden 維持
  if (/<span aria-hidden="true">✓ 採用<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `proposal accept visible "✓ 採用" span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposal accept aria-hidden NG` })
  }

  // 3. reject aria-label visible "却下" prefix
  if (
    /aria-label=\{disabled \? `却下 中… \(「\$\{proposal\.title\}」\)` : `却下 \(「\$\{proposal\.title\}」\)`\}/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `proposal reject aria-label visible "却下" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposal reject aria-label NG` })
  }

  // 4. data-testid + title 維持
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-accept`\}/.test(dp) &&
    /data-testid=\{`proposal-\$\{proposal\.id\}-reject`\}/.test(dp) &&
    /title="採用 → 子タスクとして追加"/.test(dp) &&
    /title="却下"/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposal accept/reject data-testid + title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposal accept/reject attrs 破壊` })
  }

  // iter859 invariant: proposals bulk 4 button
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: proposals-redecompose visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter858 invariant: integrations-panel
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: integrations-panel button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter857 invariant: workflows-panel
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">編集<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: workflows-panel button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: sprint status
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">期間<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: sprint status button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  console.log(`\n=== Findings (proposal-row-buttons-label-in-name-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
