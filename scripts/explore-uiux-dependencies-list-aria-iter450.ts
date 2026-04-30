/**
 * Phase 6.15 loop iter 450 (mode-D Desktop a11y) — ItemDependenciesPanel の
 * Section component の `<ul>` に aria-labelledby を追加 + h3 に id (iter427 /
 * iter428 / iter438 / iter447-449 と同 pattern 13 件目)、codify。
 *
 * 課題: src/components/workspace/item-dependencies-panel.tsx の Section:
 *   ```tsx
 *   <h3>{title}</h3>
 *   <ul className="space-y-1">
 *     {items.map(...)}
 *   </ul>
 *   ```
 *   `<h3>` に id 不在 + `<ul>` に aria-labelledby 不在 → SR list nav で
 *   「list N items」と件数のみ伝わり、context (前提条件 / 後続タスク / 関連)
 *   の direction が伝わらない。
 *
 * fix: 1 ファイル ~5 行差分。
 *   - direction 別 unique id `dep-section-${direction}-heading` を計算
 *   - `<h3 id={headingId}>` 配線
 *   - `<ul aria-labelledby={headingId}>` 配線
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/item-dependencies-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. headingId 計算
  if (/const headingId = `dep-section-\$\{direction\}-heading`/.test(src)) {
    findings.push({ level: 'info', message: `${path}: headingId 計算 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: headingId 計算 不在` })
  }

  // 2. h3 id={headingId}
  if (/<h3 id=\{headingId\}/.test(src)) {
    findings.push({ level: 'info', message: `${path}: <h3 id={headingId}> OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <h3 id={headingId}> 不在` })
  }

  // 3. ul aria-labelledby={headingId}
  if (/<ul className="space-y-1" aria-labelledby=\{headingId\}>/.test(src)) {
    findings.push({ level: 'info', message: `${path}: ul aria-labelledby 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: ul aria-labelledby 配線 不在` })
  }

  console.log(`\n=== Findings (dependencies-list-aria-iter450) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
