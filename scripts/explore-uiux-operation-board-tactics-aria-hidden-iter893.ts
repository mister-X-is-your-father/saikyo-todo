/**
 * Phase 6.15 loop iter 893 (mode-D Desktop a11y) —
 * operation-board-widget.tsx Quick wins + 集中ブロック 2 button group 内
 * visible span を aria-hidden 化 (iter800-892 sweep の続編)。
 *
 * 課題: operation-board-widget.tsx 行 166-176 (Quick wins) + 行 195-205
 *   (集中ブロック) の各 button は aria-label が完全 content
 *   ("${title} を開く (見積/集中 N分)") を含むのに、内側 visible 2 span
 *   ({estimateMin}m + {title}) は aria-hidden 無し → SR で重複読み上げ可能性。
 *   workspace home の 「今日の作戦盤」 widget の頻出 row。
 *
 * fix (1 ファイル ~4 行差分):
 *   - Quick wins button 2 span 各々に aria-hidden="true" 追加
 *   - 集中ブロック button 2 span 各々に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735/890/891/892 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  const titleHiddenCount = (obw.match(/<span className="truncate" aria-hidden="true">/g) ?? [])
    .length
  const estHiddenCount = (
    obw.match(
      /className="text-muted-foreground text-\[10px\] tabular-nums"\s+aria-hidden="true"/g,
    ) ?? []
  ).length
  if (titleHiddenCount >= 2 && estHiddenCount >= 2) {
    findings.push({
      level: 'info',
      message: `iter893: operation-board tactics 2 button group aria-hidden span OK (title=${titleHiddenCount} est=${estHiddenCount})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter893: 不完全 (title=${titleHiddenCount} est=${estHiddenCount})`,
    })
  }

  // iter892 invariant: auth footer links aria-hidden 維持
  const lp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">サインアップ<\/span>/.test(lp)) {
    findings.push({
      level: 'info',
      message: `iter892 invariant: login signup-link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter892 invariant: 破壊` })
  }

  // iter891 invariant: workspace back link aria-hidden 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter891 invariant: workspace back link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter891 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter893) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
