/**
 * Phase 6.15 loop iter 542 (mode-D Desktop a11y) —
 * ItemDependenciesPanel dep-add-btn に aria-busy を補完
 * (iter541 dep-remove と pair で同 panel 内 aria-busy 統一)。
 *
 * 課題: item-dependencies-panel.tsx 行 214-230 の dep-add-btn は disabled +
 *   aria-label 動的付与済 (no-pick / pending / normal) だが aria-busy 不在。
 *   iter541 で dep-remove 解除 button に aria-busy 追加済、pair (add / remove) で
 *   同 panel 内の inline action button が一貫性ある状態に。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-busy={add.isPending || undefined}
 *
 * +1 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、disabled / type=button /
 * aria-label / data-testid invariant 維持、iter541 dep-remove pair 維持。
 *
 * 検証: source-side regex assert + iter515-541 invariant cross-check。
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

  // 1. dep-add-btn aria-busy
  if (
    /data-testid="dep-add-btn"[\s\S]{0,500}aria-busy=\{add\.isPending \|\| undefined\}/.test(idp) ||
    /aria-busy=\{add\.isPending \|\| undefined\}[\s\S]{0,500}data-testid="dep-add-btn"/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel.tsx: dep-add-btn aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel.tsx: dep-add-btn aria-busy 不在`,
    })
  }

  // 2. iter541 invariant: dep-remove aria-busy 維持
  if (/aria-busy=\{removing \|\| undefined\}/.test(idp)) {
    findings.push({
      level: 'info',
      message: `iter541 invariant: dep-remove aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter541 invariant: 破壊`,
    })
  }

  // 3. 既存 disabled / aria-label 維持
  if (
    /disabled=\{!pickId \|\| add\.isPending\}/.test(idp) &&
    /'依存を追加するには対象 Item を選択してください'/.test(idp) &&
    /'依存を追加中…'/.test(idp) &&
    /'選択した Item を依存先として追加'/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel.tsx: dep-add-btn 既存 disabled / 3 状態 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel.tsx: 既存属性破壊`,
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

  console.log(`\n=== Findings (dep-add-aria-busy-iter542) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
