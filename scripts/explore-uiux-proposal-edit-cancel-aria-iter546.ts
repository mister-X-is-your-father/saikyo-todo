/**
 * Phase 6.15 loop iter 546 (mode-D Desktop a11y) —
 * DecomposeProposalsPanel proposal edit form cancel Button に aria-label + data-testid を補完。
 *
 * 課題: decompose-proposals-panel.tsx 行 430-439 の cancel Button は visible text
 *   "キャンセル" のみで aria-label / data-testid 不在。proposal が複数並列で edit form
 *   を開けるため、SR は「キャンセル ボタン」だけで どの proposal の編集 cancel か区別不能。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label={`「${proposal.title}」の編集をキャンセル`}
 *   - data-testid={`proposal-${proposal.id}-edit-cancel`}
 *
 * iter543 (wf) / iter544 (item-edit) / iter545 (schedule-picker) と同 pattern を
 * proposal edit footer に展開、4 dialog footer 統一達成。
 *
 * 検証: source-side regex assert + iter515-545 invariant cross-check。
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

  // 1. proposal-edit-cancel aria-label + data-testid
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}\s+aria-label=\{`「\$\{proposal\.title\}」の編集をキャンセル`\}/.test(
      dpp,
    ) ||
    /aria-label=\{`「\$\{proposal\.title\}」の編集をキャンセル`\}\s+data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: proposal-edit-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: cancel Button aria-label / data-testid 不在`,
    })
  }

  // 2. iter527 invariant: proposal accept / reject aria-busy 維持
  const matchesDisabled = (dpp.match(/aria-busy=\{disabled \|\| undefined\}/g) ?? []).length
  if (matchesDisabled === 2) {
    findings.push({
      level: 'info',
      message: `iter527 invariant: proposal accept / reject aria-busy 2 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter527 invariant: 破壊 (${matchesDisabled} 件)`,
    })
  }

  // 3. iter545 invariant: schedule-picker-cancel aria-label 維持
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    /aria-label="task pick をキャンセル"/.test(sip) &&
    /data-testid="schedule-picker-cancel"/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter545 invariant: schedule-picker-cancel aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter545 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (proposal-edit-cancel-aria-iter546) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
