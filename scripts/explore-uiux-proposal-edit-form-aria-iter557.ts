/**
 * Phase 6.15 loop iter 557 (mode-D Desktop a11y) —
 * DecomposeProposalsPanel proposal edit <form> に aria-label + data-testid を補完。
 *
 * 課題: decompose-proposals-panel.tsx 行 357-365 の proposal edit <form> は
 *   aria-busy のみで aria-label / data-testid 不在。proposal が複数並列で edit
 *   form を開けるため SR は form ナビ時に context が伝わらない。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label={`提案「${proposal.title}」の編集フォーム`}
 *   - data-testid={`proposal-${proposal.id}-edit-form`}
 *
 * iter552-556 form aria-label sweep を proposal edit form に展開、7 form 統一達成。
 * +2 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、className / noValidate /
 * onSubmit / aria-busy invariant 維持、iter546 (proposal-edit-cancel) と pair で footer 完結。
 *
 * 検証: source-side regex assert + iter515-556 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. proposal edit form aria-label + data-testid
  if (
    /aria-label=\{`提案「\$\{proposal\.title\}」の編集フォーム`\}[\s\S]{0,400}data-testid=\{`proposal-\$\{proposal\.id\}-edit-form`\}/.test(
      dpp,
    ) ||
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-form`\}[\s\S]{0,400}aria-label=\{`提案「\$\{proposal\.title\}」の編集フォーム`\}/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: proposal edit form aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: proposal edit form aria-label / data-testid 不在`,
    })
  }

  // 2. iter546 invariant: proposal-edit-cancel aria-label 維持
  if (/aria-label=\{`「\$\{proposal\.title\}」の編集をキャンセル`\}/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter546 invariant: proposal-edit-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter546 invariant: 破壊`,
    })
  }

  // 3. iter527 invariant: proposal accept / reject aria-busy 維持
  const matches = (dpp.match(/aria-busy=\{disabled \|\| undefined\}/g) ?? []).length
  if (matches === 2) {
    findings.push({
      level: 'info',
      message: `iter527 invariant: proposal accept / reject aria-busy 2 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter527 invariant: 破壊 (${matches} 件)`,
    })
  }

  // 4. iter520 invariant: panel header status + aria-live 維持
  if (
    /data-testid="decompose-proposals-status"/.test(dpp) &&
    /role="status"\s+aria-live="polite"/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter520 invariant: panel header status + aria-live 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter520 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (proposal-edit-form-aria-iter557) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
