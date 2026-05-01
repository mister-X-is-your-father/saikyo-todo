/**
 * Phase 6.15 loop iter 541 (mode-D Desktop a11y) —
 * ItemDependenciesPanel 解除 Button に aria-busy を補完。
 *
 * 課題: item-dependencies-panel.tsx 行 319-333 の dep-remove Button は
 *   disabled={removing} + aria-label 動的付与済 + title あり、aria-busy 不在。
 *   SR は disabled (= 禁止) と pending (= 処理中) を区別不能。Section component
 *   内で複数 row 並列描画されるため、SR ユーザがどの依存削除中か追えない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-busy={removing || undefined}
 *
 * iter521-540 form/Button aria-busy sweep の継続。
 * +1 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、disabled / type=button /
 * aria-label / data-testid / title invariant 維持。
 *
 * 検証: source-side regex assert + iter515-540 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  // 1. dep-remove aria-busy
  if (
    /data-testid=\{`dep-remove-\$\{ref\.id\}`\}[\s\S]{0,500}aria-busy=\{removing \|\| undefined\}/.test(
      idp,
    ) ||
    /aria-busy=\{removing \|\| undefined\}[\s\S]{0,500}data-testid=\{`dep-remove-\$\{ref\.id\}`\}/.test(
      idp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel.tsx: dep-remove aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel.tsx: dep-remove aria-busy 不在`,
    })
  }

  // 2. 既存 disabled / aria-label / title 維持
  if (
    /disabled=\{removing\}/.test(idp) &&
    /removing \? `依存「\$\{ref\.title\}」を解除中…` : `依存「\$\{ref\.title\}」を解除`/.test(
      idp,
    ) &&
    /title=\{`依存「\$\{ref\.title\}」を解除`\}/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel.tsx: dep-remove 既存 disabled / aria-label / title 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel.tsx: 既存属性破壊`,
    })
  }

  // 3. iter540 invariant: 4 form date pair startDate aria-invalid 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-start"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(
      sp,
    ) &&
    /id=\{`sprint-edit-start-\$\{sprint\.id\}`\}[\s\S]*?aria-invalid=\{isInvalidDateRange\(editStart, editEnd\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter540 invariant: 4 form date pair startDate aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter540 invariant: 破壊`,
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

  console.log(`\n=== Findings (dep-remove-aria-busy-iter541) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
