/**
 * Phase 6.15 loop iter 515 (mode-D Desktop a11y) —
 * IntegrationsPanel SourceCard 「履歴」 toggle button に aria-label を付与。
 *
 * 課題: integrations-panel.tsx 行 184-199 の「履歴」 toggle button (Pull 履歴の
 *   disclosure) が visible text "履歴" のみ + aria-expanded / aria-controls はあるが
 *   aria-label が無い。Source が複数並ぶと SR ユーザが Tab で渡る時にどの Source の
 *   履歴を開閉する button か区別できない (button 名が全て「履歴」で同一)。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label を `Source「${src.name}」の Pull 履歴 (直近 5 件) を表示/閉じる`
 *     形式で動的に付与 (open/close で文言切替)。
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-expanded / aria-controls /
 * data-testid 維持。
 *
 * 検証: source-side regex assert + 既存 aria 属性 (aria-expanded / aria-controls) 維持 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. 履歴 toggle button に aria-label が動的に付与されているか
  if (
    /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴 \(直近 5 件\) を閉じる`\s*:\s*`Source「\$\{src\.name\}」の Pull 履歴 \(直近 5 件\) を表示`\s*\}/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel.tsx: 履歴 toggle button aria-label (open/close で動的) 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: 履歴 toggle button aria-label 配線 不在`,
    })
  }

  // 2. 既存 aria 属性 (aria-expanded / aria-controls / data-testid) が壊れていないか
  if (
    /aria-expanded=\{importsOpen\}/.test(ip) &&
    /aria-controls=\{`src-imports-\$\{src\.id\}`\}/.test(ip) &&
    /data-testid=\{`src-imports-toggle-\$\{src\.id\}`\}/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel.tsx: 履歴 toggle 既存 aria-expanded / aria-controls / data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: 履歴 toggle 既存 aria 属性 / data-testid 破壊`,
    })
  }

  // 3. 同 Card 内 sibling button の aria-label 維持 (Pull / 無効化 / 削除)
  if (
    /Source「\$\{src\.name\}」を手動 Pull/.test(ip) &&
    /Source「\$\{src\.name\}」を\$\{src\.enabled \? '無効化' : '有効化'\}/.test(ip) &&
    /Source「\$\{src\.name\}」を削除/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel.tsx: SourceCard sibling button aria-label (Pull / 有効化 / 削除) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: sibling button aria-label が破壊された可能性`,
    })
  }

  console.log(`\n=== Findings (integrations-imports-toggle-aria-iter515) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
