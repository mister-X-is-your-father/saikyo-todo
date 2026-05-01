/**
 * Phase 6.15 loop iter 527 (mode-D Desktop a11y) —
 * DecomposeProposalsPanel proposal row 採用 / 却下 Button に aria-busy を補完。
 *
 * 課題: decompose-proposals-panel.tsx 行 483-512 の採用 / 却下 Button は
 *   disabled (= accept.isPending || reject.isPending || rejectAll.isPending ||
 *   decompose.isPending の合成) + aria-label 動的付与済だが aria-busy 不在。
 *   SR は disabled を聞くだけで「処理中」状態を察知できない。
 *
 * fix (1 ファイル ~2 行差分):
 *   - 採用 / 却下 Button それぞれに aria-busy={disabled || undefined}
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、disabled / aria-label / data-testid /
 * iter520 (panel header role=status + aria-live) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-526 invariant cross-check。
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

  // 1. accept aria-busy
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-accept`\}[\s\S]{0,300}aria-busy=\{disabled \|\| undefined\}/.test(
      dpp,
    ) ||
    /aria-busy=\{disabled \|\| undefined\}[\s\S]{0,300}data-testid=\{`proposal-\$\{proposal\.id\}-accept`\}/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: proposal-accept aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: proposal-accept aria-busy 不在`,
    })
  }

  // 2. reject aria-busy
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-reject`\}[\s\S]{0,300}aria-busy=\{disabled \|\| undefined\}/.test(
      dpp,
    ) ||
    /aria-busy=\{disabled \|\| undefined\}[\s\S]{0,300}data-testid=\{`proposal-\$\{proposal\.id\}-reject`\}/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: proposal-reject aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: proposal-reject aria-busy 不在`,
    })
  }

  // 3. iter520 (panel header status + aria-live) invariant
  if (
    /data-testid="decompose-proposals-status"/.test(dpp) &&
    /role="status"\s+aria-live="polite"/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: iter520 panel header status + aria-live 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: iter520 invariant 破壊`,
    })
  }

  // 4. count aria-busy={disabled || undefined} (should be 2: accept + reject)
  const matches = dpp.match(/aria-busy=\{disabled \|\| undefined\}/g) ?? []
  if (matches.length === 2) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: aria-busy={disabled} 出現 2 回 (accept + reject) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: aria-busy={disabled} 出現 ${matches.length} 回 (期待 2)`,
    })
  }

  // 5. iter515-526 invariant cross-check (anchor 3 件)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok525 = (sp.match(/aria-busy=\{changing \|\| undefined\}/g) ?? []).length === 4
  const ok526 =
    /data-testid="quick-add-submit"[\s\S]{0,200}aria-busy=\{create\.isPending \|\| undefined\}|aria-busy=\{create\.isPending \|\| undefined\}[\s\S]{0,200}data-testid="quick-add-submit"/.test(
      qa,
    )
  if (ok515 && ok525 && ok526) {
    findings.push({
      level: 'info',
      message: `iter515-526 invariant: 重要 anchor 3 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-526 invariant: 破壊 (515=${ok515} 525=${ok525} 526=${ok526})`,
    })
  }

  console.log(`\n=== Findings (decompose-proposal-row-aria-busy-iter527) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
